import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// Pool Types
export interface PoolConfig {
  maxLoanAmount: BN;
  minLoanAmount: BN;
  maxLoanDuration: BN;
  interestRateBps: number;
  managementFeeBps: number;
  performanceFeeBps: number;
  reserveRatioBps: number;
  insuranceRatioBps: number;
  maxBorrowerConcentration: number;
  minCreditScore: number;
  covenantThresholds: CovenantThresholds;
  emergencyPause: boolean;
}

export interface CovenantThresholds {
  maxLtv: number; // Loan-to-value ratio in basis points
  minDscr: number; // Debt service coverage ratio in basis points
  maxUtilization: number; // Maximum pool utilization in basis points
  minCollateralRatio: number; // Minimum collateral ratio in basis points
}

export interface PoolAccount {
  owner: PublicKey;
  authority: PublicKey;
  receiptMint: PublicKey;
  escrowSquadAddress: PublicKey;
  navCommitRoot: Uint8Array;
  reservedFunds: BN;
  totalDeposits: BN;
  totalLoans: BN;
  config: PoolConfig;
  createdAt: BN;
  updatedAt: BN;
  bump: number;
}

// Loan Types
export enum LoanStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Active = 'Active',
  Repaid = 'Repaid',
  Defaulted = 'Defaulted',
  Liquidated = 'Liquidated',
  Cancelled = 'Cancelled',
}

export interface LoanCommitData {
  borrowerPubkey: PublicKey;
  lenderPubkey: PublicKey;
  commitHash: Uint8Array;
  amount: BN;
  interestRateBps: number;
  duration: BN;
  collateralHash: Uint8Array;
  tranche: number;
  maturity: BN;
}

export interface LoanCommit {
  loanId: Uint8Array;
  borrowerPubkey: PublicKey;
  lenderPubkey: PublicKey;
  commitHash: Uint8Array;
  status: LoanStatus;
  amount: BN;
  interestRateBps: number;
  duration: BN;
  collateralHash: Uint8Array;
  tranche: number;
  maturity: BN;
  createdAt: BN;
  updatedAt: BN;
  bump: number;
}

export interface LoanAccount {
  loanId: Uint8Array;
  borrowerPubkey: PublicKey;
  lenderPubkey: PublicKey;
  amount: BN;
  outstandingBalance: BN;
  interestAccrued: BN;
  lastPaymentAt: BN;
  nextPaymentDue: BN;
  status: LoanStatus;
  covenantBreach: boolean;
  createdAt: BN;
  updatedAt: BN;
  bump: number;
}

// Attestation Types
export enum AttestationType {
  NavUpdate = 'NavUpdate',
  LoanApproval = 'LoanApproval',
  LoanDisbursement = 'LoanDisbursement',
  LoanRepayment = 'LoanRepayment',
  CovenantBreach = 'CovenantBreach',
  Liquidation = 'Liquidation',
  AuditGrant = 'AuditGrant',
  EmergencyPause = 'EmergencyPause',
  LoanOrigination = 'LoanOrigination',
  CovenantMonitoring = 'CovenantMonitoring',
  NavAccounting = 'NavAccounting',
}

export interface AttestationPayload {
  navUpdate?: {
    poolId: Uint8Array;
    newNav: BN;
    epoch: BN;
  };
  loanApproval?: {
    loanId: Uint8Array;
    borrowerPubkey: PublicKey;
    amount: BN;
  };
  loanDisbursement?: {
    loanId: Uint8Array;
    amount: BN;
    beneficiary: PublicKey;
  };
  loanRepayment?: {
    loanId: Uint8Array;
    amount: BN;
    remainingBalance: BN;
  };
  covenantBreach?: {
    loanId: Uint8Array;
    breachType: string;
    severity: number;
  };
  liquidation?: {
    loanId: Uint8Array;
    collateralAmount: BN;
    recoveryAmount: BN;
  };
  auditGrant?: {
    loanId: Uint8Array;
    auditorPubkey: PublicKey;
    accessLevel: number;
  };
  emergencyPause?: {
    reason: string;
    duration: BN;
  };
  loanOrigination?: {
    borrowerCommitment: Uint8Array;
    amount: BN;
    interestRateBps: number;
    durationDays: number;
    collateralHash: Uint8Array;
    kycVerified: boolean;
    riskScore: number;
    circuitProof: Uint8Array;
  };
  covenantMonitoring?: {
    loanId: Uint8Array;
    currentNav: BN;
    debtToEquityRatio: number;
    interestCoverageRatio: number;
    collateralValue: BN;
    marketVolatility: number;
    breachSeverity: number;
    circuitProof: Uint8Array;
  };
  navAccounting?: {
    poolId: Uint8Array;
    totalAssets: BN;
    totalLiabilities: BN;
    accruedInterest: BN;
    defaultReserves: BN;
    managementFees: BN;
    circuitProof: Uint8Array;
  };
}

export interface AttestationData {
  attestationType: AttestationType;
  payload: AttestationPayload;
  signatures: Uint8Array[];
  signerPubkeys: PublicKey[];
  threshold: number;
  nonce: BN;
  timestamp: BN;
  expiry: BN;
  circuitId: string;
  version: number;
}

export interface SignerMeta {
  pubkey: PublicKey;
  signature: Uint8Array;
  weight: number;
}

export interface AttestationRecord {
  attestationHash: Uint8Array;
  signerMeta: SignerMeta[];
  payloadHash: Uint8Array;
  timestamp: BN;
  verified: boolean;
  bump: number;
}

// Receipt Token Types
export interface ReceiptMint {
  mint: PublicKey;
  poolAccount: PublicKey;
  totalSupply: BN;
  navPerToken: BN;
  lastNavUpdate: BN;
  transferGated: boolean;
  kycRequired: boolean;
  createdAt: BN;
  bump: number;
}

export interface ReceiptTokenAccount {
  owner: PublicKey;
  mint: PublicKey;
  amount: BN;
  navAtMint: BN;
  mintedAt: BN;
  lastClaimAt: BN;
  totalClaimed: BN;
  bump: number;
}

// Audit Types
export enum AuditRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Denied = 'Denied',
  Expired = 'Expired',
}

export interface AuditRequest {
  requester: PublicKey;
  loanId: Uint8Array;
  auditorPubkey: PublicKey;
  permissionHash: Uint8Array;
  legalOrderHash: Uint8Array;
  status: AuditRequestStatus;
  createdAt: BN;
  grantedAt?: BN;
  bump: number;
}

// Client Configuration
export interface PrivateCreditConfig {
  rpcUrl: string;
  wsUrl?: string;
  programId: PublicKey;
  arciumClusterUrl: string;
  arciumClusterPubkey: PublicKey;
  squadsMultisigAddress: PublicKey;
  squadsVaultIndex: number;
}

// Transaction Types
export interface DepositParams {
  amount: BN;
  depositor: PublicKey;
}

export interface LoanApplicationParams {
  borrowerPubkey: PublicKey;
  amount: BN;
  interestRateBps: number;
  duration: BN;
  collateralHash: Uint8Array;
  tranche: number;
  encryptedData: Uint8Array;
}

export interface DesignationParams {
  loanId: Uint8Array;
  borrowerDidHash: Uint8Array;
  terms: string;
  salt: Uint8Array;
  timestamp: BN;
}

export interface AuditRequestParams {
  loanId: Uint8Array;
  auditorPubkey: PublicKey;
  legalOrderHash: Uint8Array;
}

// Error Types
export class PrivateCreditError extends Error {
  constructor(
    message: string,
    public code: string,
    public logs?: string[]
  ) {
    super(message);
    this.name = 'PrivateCreditError';
  }
}

// Squads Configuration Types
export interface SquadsConfig {
  multisigPda: PublicKey;
  threshold: number;
  timeLock: number; // seconds
  members: SquadsMember[];
  vaults: SquadsVaults;
  policies: SquadsPolicies;
}

export interface SquadsMember {
  key: PublicKey;
  permissions: SquadsPermissions;
  role: 'custodian' | 'governance' | 'relayer' | 'emergency';
}

export interface SquadsPermissions {
  canCreate: boolean;
  canApprove: boolean;
  canExecute: boolean;
  canReject: boolean;
  canAddMember: boolean;
  canRemoveMember: boolean;
  canChangeThreshold: boolean;
  canEmergencyPause: boolean;
}

export interface SquadsVaults {
  usdc: PublicKey;
  pUSD: PublicKey;
  emergency: PublicKey;
}

export interface SquadsPolicies {
  maxLoanAmount: BN;
  maxDailyDisbursements: BN;
  emergencyPauseDuration: number;
  maxTransactionAmount: BN;
  minConfirmationTime: number;
}

// MXE Circuit Types
export interface MXECircuitSpec {
  circuitId: string;
  version: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  constraints: string[];
  publicInputs: string[];
  privateInputs: string[];
}

export interface LoanOriginationCircuit {
  borrowerCommitment: Uint8Array;
  amount: BN;
  interestRateBps: number;
  durationDays: number;
  collateralHash: Uint8Array;
  kycVerified: boolean;
  riskScore: number;
  marketConditions: MarketConditions;
}

export interface CovenantMonitoringCircuit {
  loanId: Uint8Array;
  currentNav: BN;
  debtToEquityRatio: number;
  interestCoverageRatio: number;
  collateralValue: BN;
  marketVolatility: number;
  covenantThresholds: CovenantThresholds;
}

export interface NAVAccountingCircuit {
  poolId: Uint8Array;
  totalAssets: BN;
  totalLiabilities: BN;
  accruedInterest: BN;
  defaultReserves: BN;
  managementFees: BN;
  performanceFees: BN;
  insuranceReserves: BN;
}

export interface MarketConditions {
  interestRate: number;
  volatility: number;
  liquidity: number;
  creditSpread: number;
}

// Compliance Types
export interface ComplianceData {
  kycStatus: KYCStatus;
  amlStatus: AMLStatus;
  riskAssessment: RiskAssessment;
  auditTrail: AuditEntry[];
}

export interface KYCStatus {
  verified: boolean;
  level: 'basic' | 'enhanced' | 'institutional';
  provider: string;
  verifiedAt: BN;
  expiresAt: BN;
  documents: string[];
}

export interface AMLStatus {
  screened: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  sanctionsCheck: boolean;
  pepCheck: boolean;
  screenedAt: BN;
}

export interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  recommendation: 'approve' | 'reject' | 'manual_review';
  assessedAt: BN;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: PublicKey;
  timestamp: BN;
  data: Record<string, any>;
  signature: Uint8Array;
}

// Event Types
export interface PoolInitializedEvent {
  poolId: PublicKey;
  owner: PublicKey;
  authority: PublicKey;
  config: PoolConfig;
}

export interface LoanCommitCreatedEvent {
  loanId: Uint8Array;
  borrowerPubkey: PublicKey;
  lenderPubkey: PublicKey;
  amount: BN;
}

export interface ReceiptTokensMintedEvent {
  recipient: PublicKey;
  amount: BN;
  navPerToken: BN;
}

export interface AttestationSubmittedEvent {
  attestationHash: Uint8Array;
  attestationType: AttestationType;
  timestamp: BN;
}

export interface AuditRequestCreatedEvent {
  loanId: Uint8Array;
  auditorPubkey: PublicKey;
  requester: PublicKey;
}
