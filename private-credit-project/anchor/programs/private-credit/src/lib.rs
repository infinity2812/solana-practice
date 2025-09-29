use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("5DKVqvSpnVhuGnatnrhtKWXxMqVwgsG2d5MRznTsaa4S");

#[program]
pub mod private_credit {
    use super::*;

    // Pool Management
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        pool_config: PoolConfig,
    ) -> Result<()> {
        instructions::pool::initialize_pool(ctx, pool_config)
    }

    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        new_config: PoolConfig,
    ) -> Result<()> {
        instructions::pool::update_pool_config(ctx, new_config)
    }

    // Loan Management
    pub fn create_loan_commit(
        ctx: Context<CreateLoanCommit>,
        loan_commit: LoanCommitData,
    ) -> Result<()> {
        instructions::loan::create_loan_commit(ctx, loan_commit)
    }

    pub fn update_loan_status(
        ctx: Context<UpdateLoanStatus>,
        loan_id: [u8; 32],
        status: LoanStatus,
        attestation: AttestationData,
    ) -> Result<()> {
        instructions::loan::update_loan_status(ctx, loan_id, status, attestation)
    }

    // Receipt Token Management
    pub fn mint_receipt_tokens(
        ctx: Context<MintReceiptTokens>,
        amount: u64,
        attestation: AttestationData,
    ) -> Result<()> {
        instructions::receipt::mint_receipt_tokens(ctx, amount, attestation)
    }

    pub fn burn_receipt_tokens(
        ctx: Context<BurnReceiptTokens>,
        amount: u64,
        attestation: AttestationData,
    ) -> Result<()> {
        instructions::receipt::burn_receipt_tokens(ctx, amount, attestation)
    }

    // Attestation Management
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        attestation: AttestationData,
    ) -> Result<()> {
        instructions::attestation::submit_attestation(ctx, attestation)
    }

    pub fn verify_attestation(
        ctx: Context<VerifyAttestation>,
        attestation_hash: [u8; 32],
    ) -> Result<bool> {
        instructions::attestation::verify_attestation(ctx, attestation_hash)
    }

    // Audit and Disclosure
    pub fn request_audit(
        ctx: Context<RequestAudit>,
        loan_id: [u8; 32],
        auditor_pubkey: Pubkey,
        legal_order_hash: [u8; 32],
    ) -> Result<()> {
        instructions::audit::request_audit(ctx, loan_id, auditor_pubkey, legal_order_hash)
    }

    pub fn grant_audit_access(
        ctx: Context<GrantAuditAccess>,
        loan_id: [u8; 32],
        auditor_pubkey: Pubkey,
        attestation: AttestationData,
    ) -> Result<()> {
        instructions::audit::grant_audit_access(ctx, loan_id, auditor_pubkey, attestation)
    }
}
