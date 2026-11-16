use anchor_lang::prelude::*;

use crate::constants::{MAX_HANDLE_LEN, VENDOR_SEED};
use crate::events::VendorRegistered;
use crate::state::{check_text, VendorProfile};

#[derive(Accounts)]
pub struct RegisterVendor<'info> {
    #[account(mut)]
    pub vendor: Signer<'info>,
    #[account(
        init,
        payer = vendor,
        space = 8 + VendorProfile::INIT_SPACE,
        seeds = [VENDOR_SEED, vendor.key().as_ref()],
        bump
    )]
    pub vendor_profile: Account<'info, VendorProfile>,
    pub system_program: Program<'info, System>,
}

pub fn register_vendor(ctx: Context<RegisterVendor>, handle: String) -> Result<()> {
    check_text(&handle, MAX_HANDLE_LEN, false)?;
    let now = Clock::get()?.unix_timestamp;
    let vendor = ctx.accounts.vendor.key();
    ctx.accounts.vendor_profile.set_inner(VendorProfile {
        vendor,
        handle: handle.clone(),
        orders_created: 0,
        completed: 0,
        refunded: 0,
        missed_shipments: 0,
        disputes_opened: 0,
        disputes_won: 0,
        disputes_lost: 0,
        volume_settled: 0,
        created_at: now,
        last_activity_at: now,
        bump: ctx.bumps.vendor_profile,
    });
    emit!(VendorRegistered { vendor, handle });
    Ok(())
}
