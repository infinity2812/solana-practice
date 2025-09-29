use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::PrivateCreditError;

#[derive(Accounts)]
pub struct RequestAudit<'info> {
    #[account(
        init,
        payer = requester,
        space = AuditRequest::LEN,
        seeds = [b"audit_request", loan_id.as_ref(), auditor_pubkey.key().as_ref()],
        bump
    )]
    pub audit_request: Account<'info, AuditRequest>,
    
    #[account(mut)]
    pub requester: Signer<'info>,
    
    /// CHECK: This is the auditor public key
    pub auditor_pubkey: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantAuditAccess<'info> {
    #[account(
        mut,
        constraint = audit_request.status == AuditRequestStatus::Pending @ PrivateCreditError::AuditRequestDenied
    )]
    pub audit_request: Account<'info, AuditRequest>,
    
    #[account(
        has_one = authority @ PrivateCreditError::UnauthorizedAccess
    )]
    pub pool_account: Account<'info, PoolAccount>,
    
    pub authority: Signer<'info>,
}

pub fn request_audit(
    ctx: Context<RequestAudit>,
    loan_id: [u8; 32],
    auditor_pubkey: Pubkey,
    legal_order_hash: [u8; 32],
) -> Result<()> {
    let audit_request = &mut ctx.accounts.audit_request;
    let clock = Clock::get()?;
    
    // Validate legal order hash (in practice, this would verify against
    // a legal order registry or require additional verification)
    require!(
        legal_order_hash != [0u8; 32],
        PrivateCreditError::LegalOrderVerificationFailed
    );
    
    audit_request.requester = ctx.accounts.requester.key();
    audit_request.loan_id = loan_id;
    audit_request.auditor_pubkey = auditor_pubkey;
    audit_request.permission_hash = calculate_permission_hash(loan_id, auditor_pubkey)?;
    audit_request.legal_order_hash = legal_order_hash;
    audit_request.status = AuditRequestStatus::Pending;
    audit_request.created_at = clock.unix_timestamp;
    audit_request.granted_at = None;
    audit_request.bump = *ctx.bumps.get("audit_request").unwrap();
    
    msg!("Audit request created for loan: {:?}, auditor: {}", loan_id, auditor_pubkey);
    
    Ok(())
}

pub fn grant_audit_access(
    ctx: Context<GrantAuditAccess>,
    loan_id: [u8; 32],
    auditor_pubkey: Pubkey,
    attestation: AttestationData,
) -> Result<()> {
    let audit_request = &mut ctx.accounts.audit_request;
    let clock = Clock::get()?;
    
    // Verify attestation is for audit grant
    require!(
        matches!(attestation.attestation_type, AttestationType::AuditGrant),
        PrivateCreditError::InvalidAttestation
    );
    
    // Verify loan ID matches
    require!(
        audit_request.loan_id == loan_id,
        PrivateCreditError::LoanNotFound
    );
    
    // Verify auditor matches
    require!(
        audit_request.auditor_pubkey == auditor_pubkey,
        PrivateCreditError::InvalidAuditor
    );
    
    // TODO: Verify attestation signature
    // This would verify the threshold signature from Arcium MXE
    
    // Update audit request status
    audit_request.status = AuditRequestStatus::Approved;
    audit_request.granted_at = Some(clock.unix_timestamp);
    
    // TODO: Trigger re-encryption in Arcium MXE
    // This would send a message to the MXE to re-encrypt the loan data
    // for the specific auditor
    
    msg!("Audit access granted for loan: {:?}, auditor: {}", loan_id, auditor_pubkey);
    
    Ok(())
}

fn calculate_permission_hash(loan_id: [u8; 32], auditor_pubkey: Pubkey) -> Result<[u8; 32]> {
    // TODO: Implement proper permission hash calculation
    // This should hash the loan ID, auditor pubkey, and any additional
    // permission parameters
    
    use anchor_lang::prelude::*;
    
    let mut hasher = anchor_lang::solana_program::keccak::Hasher::default();
    hasher.hash(loan_id.as_slice());
    hasher.hash(auditor_pubkey.as_ref());
    
    Ok(hasher.result().to_bytes())
}
