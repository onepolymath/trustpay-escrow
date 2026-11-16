//! # TrustPay Escrow
//!
//! Buyer-protected payments for social-commerce vendors (Instagram, WhatsApp, X).
//!
//! ```text
//!  create_order ─► Created ─fund_order─► Funded ─mark_shipped─► Shipped ─┬─confirm_delivery─► Completed
//!       │                                  │  │                          ├─auto_release──────► Completed
//!  cancel_order                            │  └─reclaim_unshipped──────► Refunded (after ship_by)
//!       ▼                                  └──────open_dispute──────► Disputed ─resolve_dispute─► Resolved
//!   Cancelled                  refund_by_vendor (Funded | Shipped | Disputed) ─► Refunded
//! ```
//!
//! Funds sit in an associated token account owned by the order PDA. Only this program can move
//! them, and only to the order's own buyer and vendor.
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("CvbRGAvMeDB3Up6fYa4xBX2GVdYdRKCpq4L5FLaThRBg");

#[program]
pub mod trustpay {
    use super::*;

    /// One-time setup. Only the program's upgrade authority may call it.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        arbiter: Pubkey,
        min_window_secs: i64,
        max_window_secs: i64,
    ) -> Result<()> {
        instructions::admin::initialize_config(ctx, arbiter, min_window_secs, max_window_secs)
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_admin: Option<Pubkey>,
        new_arbiter: Option<Pubkey>,
        window_bounds: Option<WindowBounds>,
    ) -> Result<()> {
        instructions::admin::update_config(ctx, new_admin, new_arbiter, window_bounds)
    }

    /// Creates the vendor's public reputation record.
    pub fn register_vendor(ctx: Context<RegisterVendor>, handle: String) -> Result<()> {
        instructions::vendor::register_vendor(ctx, handle)
    }

    /// Vendor creates a payable order (the thing behind a shareable link / Blink).
    pub fn create_order(ctx: Context<CreateOrder>, args: CreateOrderArgs) -> Result<()> {
        instructions::create_order::create_order(ctx, args)
    }

    /// Vendor withdraws an order nobody has paid for yet.
    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        instructions::create_order::cancel_order(ctx)
    }

    /// Buyer locks the order amount in escrow. Starts the ship-by clock.
    pub fn fund_order(ctx: Context<FundOrder>) -> Result<()> {
        instructions::lifecycle::fund_order(ctx)
    }

    /// Vendor marks the order shipped. Starts the confirm/dispute clock.
    pub fn mark_shipped(ctx: Context<MarkShipped>, tracking: String) -> Result<()> {
        instructions::lifecycle::mark_shipped(ctx, tracking)
    }

    /// Buyer freezes the funds for the arbiter.
    pub fn open_dispute(ctx: Context<OpenDispute>, reason: String) -> Result<()> {
        instructions::lifecycle::open_dispute(ctx, reason)
    }

    /// Buyer releases funds to the vendor.
    pub fn confirm_delivery(ctx: Context<ConfirmDelivery>) -> Result<()> {
        instructions::settle::confirm_delivery(ctx)
    }

    /// Permissionless crank: release to the vendor once the confirm window has elapsed.
    pub fn auto_release(ctx: Context<AutoRelease>) -> Result<()> {
        instructions::settle::auto_release(ctx)
    }

    /// Buyer reclaims funds if the vendor missed the ship-by deadline.
    pub fn reclaim_unshipped(ctx: Context<ReclaimUnshipped>) -> Result<()> {
        instructions::settle::reclaim_unshipped(ctx)
    }

    /// Vendor refunds the buyer in full.
    pub fn refund_by_vendor(ctx: Context<RefundByVendor>) -> Result<()> {
        instructions::settle::refund_by_vendor(ctx)
    }

    /// Arbiter rules on a dispute: `buyer_bps` of the escrow goes to the buyer, the rest to the
    /// vendor.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, buyer_bps: u16) -> Result<()> {
        instructions::settle::resolve_dispute(ctx, buyer_bps)
    }
}
