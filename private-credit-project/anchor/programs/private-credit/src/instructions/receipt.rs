use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivateCreditError;

#[derive(Accounts)]
pub struct MintReceiptTokens<'info> {
    #[account(
        mut,
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = ReceiptTokenAccount::LEN,
        seeds = [b"receipt_token", pool_account.key().as_ref(), recipient.key().as_ref()],
        bump
    )]
    pub receipt_token_account: Account<'info, ReceiptTokenAccount>,
    
    /// CHECK: This is the receipt token mint
    #[account(mut)]
    pub receipt_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub recipient: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnReceiptTokens<'info> {
    #[account(
        mut,
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(
        mut,
        has_one = owner @ PrivateCreditError::UnauthorizedAccess
    )]
    pub receipt_token_account: Account<'info, ReceiptTokenAccount>,
    
    /// CHECK: This is the receipt token mint
    #[account(mut)]
    pub receipt_mint: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

pub fn mint_receipt_tokens(
    ctx: Context<MintReceiptTokens>,
    amount: u64,
    attestation: AttestationData,
) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    let receipt_token_account = &mut ctx.accounts.receipt_token_account;
    let clock = Clock::get()?;
    
    // Verify attestation is for NAV update
    require!(
        matches!(attestation.attestation_type, AttestationType::NavUpdate),
        PrivateCreditError::InvalidAttestation
    );
    
    // TODO: Verify attestation signature
    // This would verify the threshold signature from Arcium MXE
    
    // Calculate NAV per token
    let nav_per_token = calculate_nav_per_token(pool_account)?;
    
    // Check if emergency pause is active
    require!(
        !pool_account.config.emergency_pause,
        PrivateCreditError::EmergencyPauseActive
    );
    
    // Update pool totals
    pool_account.total_deposits = pool_account.total_deposits
        .checked_add(amount)
        .ok_or(PrivateCreditError::InsufficientFunds)?;
    
    // Initialize or update receipt token account
    if receipt_token_account.amount == 0 {
        receipt_token_account.owner = ctx.accounts.recipient.key();
        receipt_token_account.mint = ctx.accounts.receipt_mint.key();
        receipt_token_account.nav_at_mint = nav_per_token;
        receipt_token_account.minted_at = clock.unix_timestamp;
        receipt_token_account.last_claim_at = clock.unix_timestamp;
        receipt_token_account.total_claimed = 0;
        receipt_token_account.bump = *ctx.bumps.get("receipt_token_account").unwrap();
    }
    
    receipt_token_account.amount = receipt_token_account.amount
        .checked_add(amount)
        .ok_or(PrivateCreditError::InsufficientFunds)?;
    
    // TODO: Mint actual SPL tokens
    // This would call the SPL token program to mint tokens
    
    msg!("Minted {} receipt tokens to {}", amount, ctx.accounts.recipient.key());
    
    Ok(())
}

pub fn burn_receipt_tokens(
    ctx: Context<BurnReceiptTokens>,
    amount: u64,
    attestation: AttestationData,
) -> Result<()> {
    let pool_account = &mut ctx.accounts.pool_account;
    let receipt_token_account = &mut ctx.accounts.receipt_token_account;
    let clock = Clock::get()?;
    
    // Verify attestation is for NAV update
    require!(
        matches!(attestation.attestation_type, AttestationType::NavUpdate),
        PrivateCreditError::InvalidAttestation
    );
    
    // TODO: Verify attestation signature
    // This would verify the threshold signature from Arcium MXE
    
    // Check sufficient balance
    require!(
        receipt_token_account.amount >= amount,
        PrivateCreditError::InsufficientFunds
    );
    
    // Calculate current NAV per token
    let current_nav_per_token = calculate_nav_per_token(pool_account)?;
    
    // Calculate redemption value based on NAV
    let redemption_value = calculate_redemption_value(
        amount,
        receipt_token_account.nav_at_mint,
        current_nav_per_token,
    )?;
    
    // Update pool totals
    pool_account.total_deposits = pool_account.total_deposits
        .checked_sub(amount)
        .ok_or(PrivateCreditError::InsufficientFunds)?;
    
    // Update receipt token account
    receipt_token_account.amount = receipt_token_account.amount
        .checked_sub(amount)
        .ok_or(PrivateCreditError::InsufficientFunds)?;
    
    receipt_token_account.total_claimed = receipt_token_account.total_claimed
        .checked_add(redemption_value)
        .ok_or(PrivateCreditError::InsufficientFunds)?;
    
    // TODO: Burn actual SPL tokens and transfer USDC
    // This would call the SPL token program to burn tokens
    // and transfer USDC from the Squads multisig
    
    msg!("Burned {} receipt tokens, redemption value: {}", amount, redemption_value);
    
    Ok(())
}

fn calculate_nav_per_token(pool_account: &PoolAccount) -> Result<u64> {
    // TODO: Implement proper NAV calculation
    // This would typically come from the Arcium MXE attestation
    // For now, return a placeholder value
    
    if pool_account.total_deposits == 0 {
        return Ok(1_000_000); // 1.0 with 6 decimals
    }
    
    // Simplified NAV calculation
    // In practice, this would be calculated in the MXE and attested
    let total_value = pool_account.total_deposits + pool_account.reserved_funds;
    let nav_per_token = total_value * 1_000_000 / pool_account.total_deposits;
    
    Ok(nav_per_token)
}

fn calculate_redemption_value(
    token_amount: u64,
    nav_at_mint: u64,
    current_nav: u64,
) -> Result<u64> {
    // Calculate the redemption value based on NAV appreciation
    let nav_appreciation = current_nav
        .checked_sub(nav_at_mint)
        .unwrap_or(0);
    
    let base_value = token_amount * nav_at_mint / 1_000_000;
    let appreciation_value = token_amount * nav_appreciation / 1_000_000;
    
    Ok(base_value + appreciation_value)
}
