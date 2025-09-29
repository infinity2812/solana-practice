use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivateCreditError;

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = payer,
        space = PoolAccount::LEN,
        seeds = [b"pool", owner.key().as_ref()],
        bump
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: This is the pool owner
    pub owner: UncheckedAccount<'info>,
    
    /// CHECK: This is the authority for pool operations
    pub authority: UncheckedAccount<'info>,
    
    /// CHECK: This is the receipt token mint
    pub receipt_mint: UncheckedAccount<'info>,
    
    /// CHECK: This is the Squads multisig address
    pub escrow_squad_address: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    #[account(
        mut,
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    pub authority: Signer<'info>,
}

pub fn initialize_pool(
    ctx: Context<InitializePool>,
    pool_config: PoolConfig,
) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    let clock = Clock::get()?;
    
    // Validate pool configuration
    require!(
        pool_config.max_loan_amount > 0,
        PrivateCreditError::InvalidPoolConfig
    );
    require!(
        pool_config.min_loan_amount <= pool_config.max_loan_amount,
        PrivateCreditError::InvalidPoolConfig
    );
    require!(
        pool_config.interest_rate_bps <= 10000,
        PrivateCreditError::InvalidPoolConfig
    );
    
    pool_account.owner = ctx.accounts.owner.key();
    pool_account.authority = ctx.accounts.authority.key();
    pool_account.receipt_mint = ctx.accounts.receipt_mint.key();
    pool_account.escrow_squad_address = ctx.accounts.escrow_squad_address.key();
    pool_account.nav_commit_root = [0u8; 32];
    pool_account.reserved_funds = 0;
    pool_account.total_deposits = 0;
    pool_account.total_loans = 0;
    pool_account.config = pool_config;
    pool_account.created_at = clock.unix_timestamp;
    pool_account.updated_at = clock.unix_timestamp;
    pool_account.bump = *ctx.bumps.get("pool_account").unwrap();
    
    msg!("Pool initialized with owner: {}", pool_account.owner);
    
    Ok(())
}

pub fn update_pool_config(
    ctx: Context<UpdatePoolConfig>,
    new_config: PoolConfig,
) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    let clock = Clock::get()?;
    
    // Validate new configuration
    require!(
        new_config.max_loan_amount > 0,
        PrivateCreditError::InvalidPoolConfig
    );
    require!(
        new_config.min_loan_amount <= new_config.max_loan_amount,
        PrivateCreditError::InvalidPoolConfig
    );
    require!(
        new_config.interest_rate_bps <= 10000,
        PrivateCreditError::InvalidPoolConfig
    );
    
    // Check if emergency pause is active
    require!(
        !pool_account.config.emergency_pause,
        PrivateCreditError::EmergencyPauseActive
    );
    
    pool_account.config = new_config;
    pool_account.updated_at = clock.unix_timestamp;
    
    msg!("Pool configuration updated");
    
    Ok(())
}
