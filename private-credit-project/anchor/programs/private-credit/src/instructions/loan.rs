use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivateCreditError;

#[derive(Accounts)]
pub struct CreateLoanCommit<'info> {
    #[account(
        init,
        payer = payer,
        space = LoanCommit::LEN,
        seeds = [b"loan_commit", loan_commit_data.loan_id.as_ref()],
        bump
    )]
    pub loan_commit: Account<'info, LoanCommit>,
    
    #[account(
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateLoanStatus<'info> {
    #[account(
        mut,
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub loan_commit: Account<'info, LoanCommit>,
    
    #[account(
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    pub authority: Signer<'info>,
}

pub fn create_loan_commit(
    ctx: Context<CreateLoanCommit>,
    loan_commit_data: LoanCommitData,
) -> Result<()> {
    let loan_commit = &mut ctx.accounts.loan_commit;
    let pool_account = &ctx.accounts.pool_account;
    let clock = Clock::get()?;
    
    // Validate loan parameters against pool configuration
    require!(
        loan_commit_data.amount >= pool_account.config.min_loan_amount,
        PrivateCreditError::InvalidLoanCommit
    );
    require!(
        loan_commit_data.amount <= pool_account.config.max_loan_amount,
        PrivateCreditError::InvalidLoanCommit
    );
    require!(
        loan_commit_data.duration <= pool_account.config.max_loan_duration,
        PrivateCreditError::InvalidLoanCommit
    );
    require!(
        loan_commit_data.tranche <= 3, // Max 3 tranches
        PrivateCreditError::InvalidLoanCommit
    );
    
    loan_commit.loan_id = loan_commit_data.loan_id;
    loan_commit.borrower_pubkey = loan_commit_data.borrower_pubkey;
    loan_commit.lender_pubkey = loan_commit_data.lender_pubkey;
    loan_commit.commit_hash = loan_commit_data.commit_hash;
    loan_commit.status = LoanStatus::Pending;
    loan_commit.amount = loan_commit_data.amount;
    loan_commit.interest_rate_bps = loan_commit_data.interest_rate_bps;
    loan_commit.duration = loan_commit_data.duration;
    loan_commit.collateral_hash = loan_commit_data.collateral_hash;
    loan_commit.tranche = loan_commit_data.tranche;
    loan_commit.maturity = loan_commit_data.maturity;
    loan_commit.created_at = clock.unix_timestamp;
    loan_commit.updated_at = clock.unix_timestamp;
    loan_commit.bump = *ctx.bumps.get("loan_commit").unwrap();
    
    msg!("Loan commit created with ID: {:?}", loan_commit.loan_id);
    
    Ok(())
}

pub fn update_loan_status(
    ctx: Context<UpdateLoanStatus>,
    loan_id: [u8; 32],
    status: LoanStatus,
    attestation: AttestationData,
) -> Result<()> {
    let loan_commit = &mut ctx.accounts.loan_commit;
    let clock = Clock::get()?;
    
    // Verify loan ID matches
    require!(
        loan_commit.loan_id == loan_id,
        PrivateCreditError::LoanNotFound
    );
    
    // Validate status transition
    let current_status = &loan_commit.status;
    let new_status = &status;
    
    match (current_status, new_status) {
        (LoanStatus::Pending, LoanStatus::Approved) => {},
        (LoanStatus::Approved, LoanStatus::Active) => {},
        (LoanStatus::Active, LoanStatus::Repaid) => {},
        (LoanStatus::Active, LoanStatus::Defaulted) => {},
        (LoanStatus::Defaulted, LoanStatus::Liquidated) => {},
        (LoanStatus::Pending, LoanStatus::Cancelled) => {},
        _ => return Err(PrivateCreditError::InvalidLoanStatusTransition.into()),
    }
    
    // TODO: Verify attestation signature
    // This would typically involve verifying the threshold signature
    // from the Arcium MXE cluster
    
    loan_commit.status = status;
    loan_commit.updated_at = clock.unix_timestamp;
    
    msg!("Loan status updated to: {:?}", loan_commit.status);
    
    Ok(())
}
