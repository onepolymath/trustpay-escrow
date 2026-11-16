use anchor_lang::prelude::*;

use crate::constants::CONFIG_SEED;
use crate::errors::TrustPayError;
use crate::events::ConfigUpdated;
use crate::program::Trustpay;
use crate::state::{validate_window_bounds, Config};

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, Config>,
    /// Only the upgrade authority may create the config, which stops anyone front-running
    /// deployment to install themselves as arbiter.
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, Trustpay>,
    #[account(
        constraint = program_data.upgrade_authority_address == Some(admin.key())
            @ TrustPayError::NotUpgradeAuthority
    )]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_config(
    ctx: Context<InitializeConfig>,
    arbiter: Pubkey,
    min_window_secs: i64,
    max_window_secs: i64,
) -> Result<()> {
    validate_window_bounds(min_window_secs, max_window_secs)?;
    let config = &mut ctx.accounts.config;
    config.set_inner(Config {
        admin: ctx.accounts.admin.key(),
        arbiter,
        min_window_secs,
        max_window_secs,
        order_count: 0,
        bump: ctx.bumps.config,
    });
    emit!(ConfigUpdated {
        admin: config.admin,
        arbiter,
        min_window_secs,
        max_window_secs,
    });
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct WindowBounds {
    pub min_secs: i64,
    pub max_secs: i64,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
}

pub fn update_config(
    ctx: Context<UpdateConfig>,
    new_admin: Option<Pubkey>,
    new_arbiter: Option<Pubkey>,
    window_bounds: Option<WindowBounds>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    if let Some(admin) = new_admin {
        config.admin = admin;
    }
    if let Some(arbiter) = new_arbiter {
        config.arbiter = arbiter;
    }
    if let Some(bounds) = window_bounds {
        validate_window_bounds(bounds.min_secs, bounds.max_secs)?;
        config.min_window_secs = bounds.min_secs;
        config.max_window_secs = bounds.max_secs;
    }
    emit!(ConfigUpdated {
        admin: config.admin,
        arbiter: config.arbiter,
        min_window_secs: config.min_window_secs,
        max_window_secs: config.max_window_secs,
    });
    Ok(())
}
