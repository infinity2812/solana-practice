use anchor_lang::prelude::*;

#[account]
pub struct AttestationRecord {
    pub attestation_hash: [u8; 32],
    pub signer_meta: Vec<SignerMeta>,
    pub payload_hash: [u8; 32],
    pub timestamp: i64,
    pub verified: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SignerMeta {
    pub pubkey: Pubkey,
    pub signature: [u8; 64],
    pub weight: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AttestationData {
    pub attestation_type: AttestationType,
    pub payload: AttestationPayload,
    pub signatures: Vec<[u8; 64]>,
    pub signer_pubkeys: Vec<Pubkey>,
    pub threshold: u8,
    pub nonce: u64,
    pub timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum AttestationType {
    NavUpdate,
    LoanApproval,
    LoanDisbursement,
    LoanRepayment,
    CovenantBreach,
    Liquidation,
    AuditGrant,
    EmergencyPause,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum AttestationPayload {
    NavUpdate {
        pool_id: [u8; 32],
        new_nav: u64,
        epoch: u64,
    },
    LoanApproval {
        loan_id: [u8; 32],
        borrower_pubkey: Pubkey,
        amount: u64,
    },
    LoanDisbursement {
        loan_id: [u8; 32],
        amount: u64,
        beneficiary: Pubkey,
    },
    LoanRepayment {
        loan_id: [u8; 32],
        amount: u64,
        remaining_balance: u64,
    },
    CovenantBreach {
        loan_id: [u8; 32],
        breach_type: String,
        severity: u8,
    },
    Liquidation {
        loan_id: [u8; 32],
        collateral_amount: u64,
        recovery_amount: u64,
    },
    AuditGrant {
        loan_id: [u8; 32],
        auditor_pubkey: Pubkey,
        access_level: u8,
    },
    EmergencyPause {
        reason: String,
        duration: u64,
    },
}

#[account]
pub struct AuditRequest {
    pub requester: Pubkey,
    pub loan_id: [u8; 32],
    pub auditor_pubkey: Pubkey,
    pub permission_hash: [u8; 32],
    pub legal_order_hash: [u8; 32],
    pub status: AuditRequestStatus,
    pub created_at: i64,
    pub granted_at: Option<i64>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum AuditRequestStatus {
    Pending,
    Approved,
    Denied,
    Expired,
}

impl AttestationRecord {
    pub const LEN: usize = 8 + // discriminator
        32 + // attestation_hash
        4 + // signer_meta (Vec length)
        200 + // signer_meta data (estimated)
        32 + // payload_hash
        8 + // timestamp
        1 + // verified
        1; // bump
}

impl AuditRequest {
    pub const LEN: usize = 8 + // discriminator
        32 + // requester
        32 + // loan_id
        32 + // auditor_pubkey
        32 + // permission_hash
        32 + // legal_order_hash
        1 + // status
        8 + // created_at
        8 + // granted_at (Option)
        1; // bump
}
