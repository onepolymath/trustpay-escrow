//! Non-settling transitions: funding, shipping and disputing.
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::{MAX_REASON_LEN, MAX_TRACKING_LEN, ORDER_SEED, VENDOR_SEED};
use crate::errors::TrustPayError;
use crate::events::{DisputeOpened, OrderFunded, OrderShipped};
use crate::state::{check_text, Order, OrderStatus, VendorProfile};

#[derive(Accounts)]
pub struct FundOrder<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = mint
    )]
    pub order: Account<'info, Order>,
    pub mint: Account<'info, Mint>,
    #[account(mut, token::mint = mint, token::authority = buyer)]
    pub buyer_token: Account<'info, TokenAccount>,
    /// Canonical ATA owned by the order PDA. `init_if_needed` because anyone can create an ATA,
    /// so plain `init` would let a griefer block funding by pre-creating it.
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = order
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn fund_order(ctx: Context<FundOrder>) -> Result<()> {
    let buyer = ctx.accounts.buyer.key();
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Created, TrustPayError::InvalidStatus);
    require_keys_neq!(buyer, order.vendor, TrustPayError::SelfDealing);
    if order.reserved_buyer {
        require_keys_eq!(buyer, order.buyer, TrustPayError::NotReservedBuyer);
    }

    token::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.buyer_token.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        order.amount,
        ctx.accounts.mint.decimals,
    )?;

    let now = Clock::get()?.unix_timestamp;
    order.buyer = buyer;
    order.status = OrderStatus::Funded;
    order.funded_at = now;
    order.ship_by = now.checked_add(order.ship_window_secs).ok_or(TrustPayError::MathOverflow)?;

    emit!(OrderFunded {
        order: order.key(),
        buyer,
        amount: order.amount,
        ship_by: order.ship_by,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct MarkShipped<'info> {
    pub vendor: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, vendor.key().as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = vendor
    )]
    pub order: Account<'info, Order>,
}

pub fn mark_shipped(ctx: Context<MarkShipped>, tracking: String) -> Result<()> {
    check_text(&tracking, MAX_TRACKING_LEN, true)?;
    let order = &mut ctx.accounts.order;
    require!(order.status == OrderStatus::Funded, TrustPayError::InvalidStatus);
    let now = Clock::get()?.unix_timestamp;
    require!(now <= order.ship_by, TrustPayError::ShipDeadlinePassed);

    order.status = OrderStatus::Shipped;
    order.shipped_at = now;
    order.release_after = now
        .checked_add(order.confirm_window_secs)
        .ok_or(TrustPayError::MathOverflow)?;
    order.tracking = tracking.clone();

    emit!(OrderShipped {
        order: order.key(),
        tracking,
        release_after: order.release_after,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = buyer
    )]
    pub order: Account<'info, Order>,
    #[account(
        mut,
        seeds = [VENDOR_SEED, order.vendor.as_ref()],
        bump = vendor_profile.bump
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
}

pub fn open_dispute(ctx: Context<OpenDispute>, reason: String) -> Result<()> {
    check_text(&reason, MAX_REASON_LEN, false)?;
    let order = &mut ctx.accounts.order;
    let now = Clock::get()?.unix_timestamp;
    if !order.can_dispute(now) {
        return if order.status == OrderStatus::Shipped {
            err!(TrustPayError::DisputeWindowClosed)
        } else {
            err!(TrustPayError::InvalidStatus)
        };
    }
    order.status = OrderStatus::Disputed;
    order.dispute_reason = reason.clone();

    let profile = &mut ctx.accounts.vendor_profile;
    profile.disputes_opened = profile.disputes_opened.checked_add(1).ok_or(TrustPayError::MathOverflow)?;
    profile.last_activity_at = now;

    emit!(DisputeOpened {
        order: order.key(),
        buyer: order.buyer,
        reason,
    });
    Ok(())
}
