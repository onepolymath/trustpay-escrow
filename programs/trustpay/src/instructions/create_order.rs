use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::constants::{CONFIG_SEED, MAX_TITLE_LEN, ORDER_SEED, VENDOR_SEED};
use crate::errors::TrustPayError;
use crate::events::{OrderCancelled, OrderCreated};
use crate::state::{check_text, Config, Order, OrderStatus, VendorProfile};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CreateOrderArgs {
    pub order_id: u64,
    pub amount: u64,
    pub title: String,
    pub ship_window_secs: i64,
    pub confirm_window_secs: i64,
    /// Lock the order to a single buyer wallet (e.g. a known customer from a DM).
    pub buyer: Option<Pubkey>,
}

#[derive(Accounts)]
#[instruction(args: CreateOrderArgs)]
pub struct CreateOrder<'info> {
    #[account(mut)]
    pub vendor: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [VENDOR_SEED, vendor.key().as_ref()],
        bump = vendor_profile.bump,
        has_one = vendor
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = vendor,
        space = 8 + Order::INIT_SPACE,
        seeds = [ORDER_SEED, vendor.key().as_ref(), &args.order_id.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, Order>,
    pub system_program: Program<'info, System>,
}

pub fn create_order(ctx: Context<CreateOrder>, args: CreateOrderArgs) -> Result<()> {
    let profile = &mut ctx.accounts.vendor_profile;
    require!(
        args.order_id == profile.orders_created,
        TrustPayError::UnexpectedOrderId
    );
    require!(args.amount > 0, TrustPayError::InvalidAmount);
    check_text(&args.title, MAX_TITLE_LEN, false)?;
    let config = &mut ctx.accounts.config;
    config.check_window(args.ship_window_secs)?;
    config.check_window(args.confirm_window_secs)?;

    let vendor = ctx.accounts.vendor.key();
    if let Some(buyer) = args.buyer {
        require_keys_neq!(buyer, vendor, TrustPayError::SelfDealing);
    }

    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.order.set_inner(Order {
        vendor,
        buyer: args.buyer.unwrap_or_default(),
        reserved_buyer: args.buyer.is_some(),
        mint: ctx.accounts.mint.key(),
        order_id: args.order_id,
        amount: args.amount,
        status: OrderStatus::Created,
        ship_window_secs: args.ship_window_secs,
        confirm_window_secs: args.confirm_window_secs,
        created_at: now,
        funded_at: 0,
        ship_by: 0,
        shipped_at: 0,
        release_after: 0,
        settled_at: 0,
        buyer_payout: 0,
        vendor_payout: 0,
        title: args.title,
        tracking: String::new(),
        dispute_reason: String::new(),
        bump: ctx.bumps.order,
    });

    profile.orders_created = profile
        .orders_created
        .checked_add(1)
        .ok_or(TrustPayError::MathOverflow)?;
    profile.last_activity_at = now;
    config.order_count = config
        .order_count
        .checked_add(1)
        .ok_or(TrustPayError::MathOverflow)?;

    emit!(OrderCreated {
        order: ctx.accounts.order.key(),
        vendor,
        order_id: args.order_id,
        mint: ctx.accounts.mint.key(),
        amount: args.amount,
        reserved_buyer: args.buyer,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    pub vendor: Signer<'info>,
    #[account(
        mut,
        seeds = [ORDER_SEED, vendor.key().as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        has_one = vendor
    )]
    pub order: Account<'info, Order>,
}

pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(
        order.status == OrderStatus::Created,
        TrustPayError::InvalidStatus
    );
    order.status = OrderStatus::Cancelled;
    order.settled_at = Clock::get()?.unix_timestamp;
    emit!(OrderCancelled { order: order.key() });
    Ok(())
}
