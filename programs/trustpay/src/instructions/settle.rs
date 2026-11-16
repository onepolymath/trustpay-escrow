//! Every path that moves funds out of escrow. Each one:
//! 1. checks the order status (so a second settlement always fails),
//! 2. pays only to the canonical token accounts of the order's own buyer and vendor,
//! 3. closes the vault and returns its rent to the buyer who paid for it,
//! 4. updates the vendor's on-chain reputation.
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, TransferChecked};

use crate::constants::{BPS_DENOMINATOR, CONFIG_SEED, ORDER_SEED, VENDOR_SEED};
use crate::errors::TrustPayError;
use crate::events::OrderSettled;
use crate::state::{split_payout, Config, Order, OrderStatus, VendorProfile};

struct Payout<'a, 'info> {
    order: &'a mut Account<'info, Order>,
    vault: &'a Account<'info, TokenAccount>,
    mint: &'a Account<'info, Mint>,
    buyer_token: Option<&'a Account<'info, TokenAccount>>,
    vendor_token: Option<&'a Account<'info, TokenAccount>>,
    rent_receiver: AccountInfo<'info>,
    token_program: &'a Program<'info, Token>,
}

impl<'a, 'info> Payout<'a, 'info> {
    /// Pays out the whole vault balance (so stray tokens sent to the vault can never block
    /// closing it), split by `buyer_bps`, then closes the vault.
    fn execute(self, buyer_bps: u16, outcome: OrderStatus, settled_by: Pubkey) -> Result<(u64, u64)> {
        let total = self.vault.amount;
        let (to_buyer, to_vendor) = split_payout(total, buyer_bps)?;

        let vendor = self.order.vendor;
        let id = self.order.order_id.to_le_bytes();
        let bump = [self.order.bump];
        let seeds: &[&[u8]] = &[ORDER_SEED, vendor.as_ref(), &id, &bump];
        let signer = &[seeds];
        let authority = self.order.to_account_info();

        for (amount, dest) in [(to_buyer, self.buyer_token), (to_vendor, self.vendor_token)] {
            if amount == 0 {
                continue;
            }
            let dest = dest.ok_or(TrustPayError::InvalidStatus)?;
            token::transfer_checked(
                CpiContext::new_with_signer(
                    self.token_program.to_account_info(),
                    TransferChecked {
                        from: self.vault.to_account_info(),
                        mint: self.mint.to_account_info(),
                        to: dest.to_account_info(),
                        authority: authority.clone(),
                    },
                    signer,
                ),
                amount,
                self.mint.decimals,
            )?;
        }

        token::close_account(CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.vault.to_account_info(),
                destination: self.rent_receiver,
                authority,
            },
            signer,
        ))?;

        let order = self.order;
        order.status = outcome;
        order.settled_at = Clock::get()?.unix_timestamp;
        order.buyer_payout = to_buyer;
        order.vendor_payout = to_vendor;

        emit!(OrderSettled {
            order: order.key(),
            outcome,
            buyer_payout: to_buyer,
            vendor_payout: to_vendor,
            settled_by,
        });
        Ok((to_buyer, to_vendor))
    }
}

fn bump(counter: &mut u32) -> Result<()> {
    *counter = counter.checked_add(1).ok_or(TrustPayError::MathOverflow)?;
    Ok(())
}

fn add_volume(profile: &mut VendorProfile, amount: u64) -> Result<()> {
    profile.volume_settled = profile
        .volume_settled
        .checked_add(amount)
        .ok_or(TrustPayError::MathOverflow)?;
    profile.last_activity_at = Clock::get()?.unix_timestamp;
    Ok(())
}

// ---------------------------------------------------------------------------------------------
// confirm_delivery: buyer releases funds to the vendor.
// ---------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ConfirmDelivery<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = buyer, has_one = vendor, has_one = mint
    )]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [VENDOR_SEED, order.vendor.as_ref()], bump = vendor_profile.bump)]
    pub vendor_profile: Account<'info, VendorProfile>,
    /// CHECK: pinned to `order.vendor` by `has_one`; only used as the ATA authority.
    pub vendor: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = order)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = buyer,
        associated_token::mint = mint, associated_token::authority = vendor
    )]
    pub vendor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn confirm_delivery(ctx: Context<ConfirmDelivery>) -> Result<()> {
    let a = ctx.accounts;
    require!(
        matches!(a.order.status, OrderStatus::Funded | OrderStatus::Shipped),
        TrustPayError::InvalidStatus
    );
    let settled_by = a.buyer.key();
    let (_, to_vendor) = Payout {
        order: &mut a.order,
        vault: &a.vault,
        mint: &a.mint,
        buyer_token: None,
        vendor_token: Some(&a.vendor_token),
        rent_receiver: a.buyer.to_account_info(),
        token_program: &a.token_program,
    }
    .execute(0, OrderStatus::Completed, settled_by)?;
    bump(&mut a.vendor_profile.completed)?;
    add_volume(&mut a.vendor_profile, to_vendor)
}

// ---------------------------------------------------------------------------------------------
// auto_release: anyone may release to the vendor once the confirm window has elapsed.
// ---------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct AutoRelease<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = buyer, has_one = vendor, has_one = mint
    )]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [VENDOR_SEED, order.vendor.as_ref()], bump = vendor_profile.bump)]
    pub vendor_profile: Account<'info, VendorProfile>,
    /// CHECK: pinned to `order.buyer`; receives the vault's rent refund.
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,
    /// CHECK: pinned to `order.vendor` by `has_one`; only used as the ATA authority.
    pub vendor: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = order)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = cranker,
        associated_token::mint = mint, associated_token::authority = vendor
    )]
    pub vendor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn auto_release(ctx: Context<AutoRelease>) -> Result<()> {
    let a = ctx.accounts;
    let now = Clock::get()?.unix_timestamp;
    if !a.order.can_auto_release(now) {
        return if a.order.status == OrderStatus::Shipped {
            err!(TrustPayError::ReleaseNotYetDue)
        } else {
            err!(TrustPayError::InvalidStatus)
        };
    }
    let settled_by = a.cranker.key();
    let (_, to_vendor) = Payout {
        order: &mut a.order,
        vault: &a.vault,
        mint: &a.mint,
        buyer_token: None,
        vendor_token: Some(&a.vendor_token),
        rent_receiver: a.buyer.to_account_info(),
        token_program: &a.token_program,
    }
    .execute(0, OrderStatus::Completed, settled_by)?;
    bump(&mut a.vendor_profile.completed)?;
    add_volume(&mut a.vendor_profile, to_vendor)
}

// ---------------------------------------------------------------------------------------------
// reclaim_unshipped: buyer takes the money back if the vendor never shipped in time.
// ---------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ReclaimUnshipped<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = buyer, has_one = mint
    )]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [VENDOR_SEED, order.vendor.as_ref()], bump = vendor_profile.bump)]
    pub vendor_profile: Account<'info, VendorProfile>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = order)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = buyer,
        associated_token::mint = mint, associated_token::authority = buyer
    )]
    pub buyer_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn reclaim_unshipped(ctx: Context<ReclaimUnshipped>) -> Result<()> {
    let a = ctx.accounts;
    let now = Clock::get()?.unix_timestamp;
    if !a.order.can_reclaim_unshipped(now) {
        return if a.order.status == OrderStatus::Funded {
            err!(TrustPayError::ShipDeadlineNotReached)
        } else {
            err!(TrustPayError::InvalidStatus)
        };
    }
    let settled_by = a.buyer.key();
    Payout {
        order: &mut a.order,
        vault: &a.vault,
        mint: &a.mint,
        buyer_token: Some(&a.buyer_token),
        vendor_token: None,
        rent_receiver: a.buyer.to_account_info(),
        token_program: &a.token_program,
    }
    .execute(BPS_DENOMINATOR, OrderStatus::Refunded, settled_by)?;
    bump(&mut a.vendor_profile.missed_shipments)?;
    a.vendor_profile.last_activity_at = now;
    Ok(())
}

// ---------------------------------------------------------------------------------------------
// refund_by_vendor: vendor returns the money (out of stock, or conceding a dispute).
// ---------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct RefundByVendor<'info> {
    #[account(mut)]
    pub vendor: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, vendor.key().as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = vendor, has_one = buyer, has_one = mint
    )]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [VENDOR_SEED, vendor.key().as_ref()], bump = vendor_profile.bump)]
    pub vendor_profile: Account<'info, VendorProfile>,
    /// CHECK: pinned to `order.buyer`; receives the refund ATA authority role and vault rent.
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = order)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = vendor,
        associated_token::mint = mint, associated_token::authority = buyer
    )]
    pub buyer_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn refund_by_vendor(ctx: Context<RefundByVendor>) -> Result<()> {
    let a = ctx.accounts;
    require!(
        matches!(
            a.order.status,
            OrderStatus::Funded | OrderStatus::Shipped | OrderStatus::Disputed
        ),
        TrustPayError::InvalidStatus
    );
    let settled_by = a.vendor.key();
    Payout {
        order: &mut a.order,
        vault: &a.vault,
        mint: &a.mint,
        buyer_token: Some(&a.buyer_token),
        vendor_token: None,
        rent_receiver: a.buyer.to_account_info(),
        token_program: &a.token_program,
    }
    .execute(BPS_DENOMINATOR, OrderStatus::Refunded, settled_by)?;
    bump(&mut a.vendor_profile.refunded)?;
    a.vendor_profile.last_activity_at = Clock::get()?.unix_timestamp;
    Ok(())
}

// ---------------------------------------------------------------------------------------------
// resolve_dispute: the arbiter splits a disputed order between buyer and vendor.
// ---------------------------------------------------------------------------------------------

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(mut)]
    pub arbiter: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = arbiter)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [ORDER_SEED, order.vendor.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = buyer, has_one = vendor, has_one = mint
    )]
    pub order: Account<'info, Order>,
    #[account(mut, seeds = [VENDOR_SEED, order.vendor.as_ref()], bump = vendor_profile.bump)]
    pub vendor_profile: Account<'info, VendorProfile>,
    /// CHECK: pinned to `order.buyer` by `has_one`.
    #[account(mut)]
    pub buyer: UncheckedAccount<'info>,
    /// CHECK: pinned to `order.vendor` by `has_one`.
    pub vendor: UncheckedAccount<'info>,
    pub mint: Account<'info, Mint>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = order)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = arbiter,
        associated_token::mint = mint, associated_token::authority = buyer
    )]
    pub buyer_token: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = arbiter,
        associated_token::mint = mint, associated_token::authority = vendor
    )]
    pub vendor_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn resolve_dispute(ctx: Context<ResolveDispute>, buyer_bps: u16) -> Result<()> {
    let a = ctx.accounts;
    require!(a.order.status == OrderStatus::Disputed, TrustPayError::InvalidStatus);
    require!(buyer_bps <= BPS_DENOMINATOR, TrustPayError::InvalidBps);
    let arbiter = a.arbiter.key();
    require!(
        arbiter != a.order.buyer && arbiter != a.order.vendor,
        TrustPayError::ArbiterConflict
    );
    let (_, to_vendor) = Payout {
        order: &mut a.order,
        vault: &a.vault,
        mint: &a.mint,
        buyer_token: Some(&a.buyer_token),
        vendor_token: Some(&a.vendor_token),
        rent_receiver: a.buyer.to_account_info(),
        token_program: &a.token_program,
    }
    .execute(buyer_bps, OrderStatus::Resolved, arbiter)?;
    // More than half back to the buyer counts as a lost dispute for the vendor.
    if buyer_bps > BPS_DENOMINATOR / 2 {
        bump(&mut a.vendor_profile.disputes_lost)?;
    } else {
        bump(&mut a.vendor_profile.disputes_won)?;
    }
    add_volume(&mut a.vendor_profile, to_vendor)
}
