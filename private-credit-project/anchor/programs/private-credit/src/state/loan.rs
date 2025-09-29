use anchor_lang::prelude::*;

#[account]
pub struct LoanCommit {
    pub loan_id: [u8; 32],
    pub borrower_pubkey: Pubkey,
    pub lender_pubkey: Pubkey,
    pub commit_hash: [u8; 32],
    pub status: LoanStatus,
    pub amount: u64,
    pub interest_rate_bps: u16,
    pub duration: u64,
    pub collateral_hash: [u8; 32],
    pub tranche: u8,
    pub maturity: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum LoanStatus {
    Pending,
    Approved,
    Active,
    Repaid,
    Defaulted,
    Liquidated,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LoanCommitData {
    pub borrower_pubkey: Pubkey,
    pub lender_pubkey: Pubkey,
    pub commit_hash: [u8; 32],
    pub amount: u64,
    pub interest_rate_bps: u16,
    pub duration: u64,
    pub collateral_hash: [u8; 32],
    pub tranche: u8,
    pub maturity: i64,
}

#[account]
pub struct LoanAccount {
    pub loan_id: [u8; 32],
    pub borrower_pubkey: Pubkey,
    pub lender_pubkey: Pubkey,
    pub amount: u64,
    pub outstanding_balance: u64,
    pub interest_accrued: u64,
    pub last_payment_at: i64,
    pub next_payment_due: i64,
    pub status: LoanStatus,
    pub covenant_breach: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl LoanCommit {
    pub const LEN: usize = 8 + // discriminator
        32 + // loan_id
        32 + // borrower_pubkey
        32 + // lender_pubkey
        32 + // commit_hash
        1 + // status
        8 + // amount
        2 + // interest_rate_bps
        8 + // duration
        32 + // collateral_hash
        1 + // tranche
        8 + // maturity
        8 + // created_at
        8 + // updated_at
        1; // bump
}

impl LoanAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // loan_id
        32 + // borrower_pubkey
        32 + // lender_pubkey
        8 + // amount
        8 + // outstanding_balance
        8 + // interest_accrued
        8 + // last_payment_at
        8 + // next_payment_due
        1 + // status
        1 + // covenant_breach
        8 + // created_at
        8 + // updated_at
        1; // bump
}
