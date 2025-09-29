use anchor_lang::prelude::*;

#[account]
pub struct ReceiptMint {
    pub mint: Pubkey,
    pub pool_account: Pubkey,
    pub total_supply: u64,
    pub nav_per_token: u64,
    pub last_nav_update: i64,
    pub transfer_gated: bool,
    pub kyc_required: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ReceiptTokenAccount {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub nav_at_mint: u64,
    pub minted_at: i64,
    pub last_claim_at: i64,
    pub total_claimed: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReceiptMintData {
    pub pool_id: [u8; 32],
    pub amount: u64,
    pub nav_per_token: u64,
    pub recipient: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ReceiptBurnData {
    pub pool_id: [u8; 32],
    pub amount: u64,
    pub nav_per_token: u64,
    pub owner: Pubkey,
}

impl ReceiptMint {
    pub const LEN: usize = 8 + // discriminator
        32 + // mint
        32 + // pool_account
        8 + // total_supply
        8 + // nav_per_token
        8 + // last_nav_update
        1 + // transfer_gated
        1 + // kyc_required
        8 + // created_at
        1; // bump
}

impl ReceiptTokenAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + // owner
        32 + // mint
        8 + // amount
        8 + // nav_at_mint
        8 + // minted_at
        8 + // last_claim_at
        8 + // total_claimed
        1; // bump
}
