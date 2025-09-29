use anchor_lang::prelude::*;

#[account]
pub struct PoolAccount {
    pub owner: Pubkey,
    pub authority: Pubkey,
    pub receipt_mint: Pubkey,
    pub escrow_squad_address: Pubkey,
    pub nav_commit_root: [u8; 32],
    pub reserved_funds: u64,
    pub total_deposits: u64,
    pub total_loans: u64,
    pub config: PoolConfig,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PoolConfig {
    pub max_loan_amount: u64,
    pub min_loan_amount: u64,
    pub max_loan_duration: u64,
    pub interest_rate_bps: u16,
    pub management_fee_bps: u16,
    pub performance_fee_bps: u16,
    pub reserve_ratio_bps: u16,
    pub insurance_ratio_bps: u16,
    pub max_borrower_concentration: u16,
    pub min_credit_score: u16,
    pub covenant_thresholds: CovenantThresholds,
    pub emergency_pause: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CovenantThresholds {
    pub max_ltv: u16, // Loan-to-value ratio in basis points
    pub min_dscr: u16, // Debt service coverage ratio in basis points
    pub max_utilization: u16, // Maximum pool utilization in basis points
    pub min_collateral_ratio: u16, // Minimum collateral ratio in basis points
}

impl PoolAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // authority
        32 + // receipt_mint
        32 + // escrow_squad_address
        32 + // nav_commit_root
        8 + // reserved_funds
        8 + // total_deposits
        8 + // total_loans
        200 + // config (estimated)
        8 + // created_at
        8 + // updated_at
        1; // bump
}
