use anchor_lang::prelude::*;

#[error_code]
pub enum PrivateCreditError {
    #[msg("Invalid pool configuration")]
    InvalidPoolConfig,
    
    #[msg("Pool not initialized")]
    PoolNotInitialized,
    
    #[msg("Invalid loan status transition")]
    InvalidLoanStatusTransition,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Invalid attestation")]
    InvalidAttestation,
    
    #[msg("Attestation verification failed")]
    AttestationVerificationFailed,
    
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    
    #[msg("Loan not found")]
    LoanNotFound,
    
    #[msg("Invalid loan commit")]
    InvalidLoanCommit,
    
    #[msg("Receipt token mint failed")]
    ReceiptTokenMintFailed,
    
    #[msg("Receipt token burn failed")]
    ReceiptTokenBurnFailed,
    
    #[msg("Audit request denied")]
    AuditRequestDenied,
    
    #[msg("Invalid auditor")]
    InvalidAuditor,
    
    #[msg("Legal order verification failed")]
    LegalOrderVerificationFailed,
    
    #[msg("NAV calculation error")]
    NavCalculationError,
    
    #[msg("Covenant breach detected")]
    CovenantBreachDetected,
    
    #[msg("Invalid tranche configuration")]
    InvalidTrancheConfig,
    
    #[msg("Reserve insufficient")]
    ReserveInsufficient,
    
    #[msg("Emergency pause active")]
    EmergencyPauseActive,
    
    #[msg("Invalid multisig signature")]
    InvalidMultisigSignature,
    
    #[msg("Oracle price stale")]
    OraclePriceStale,
    
    #[msg("Slippage exceeded")]
    SlippageExceeded,
}
