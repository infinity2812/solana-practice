import { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
import axios from 'axios';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from 'crypto';
import { DatabaseService } from './database';
import { logger } from '../utils/logger';
import { 
  AttestationData, 
  AttestationType, 
  LoanApplicationParams,
  LoanOriginationCircuit,
  CovenantMonitoringCircuit,
  NAVAccountingCircuit,
  ComplianceData,
  MXECircuitSpec
} from '@arcium/private-credit-sdk';

export class MXEService {
  private connection: Connection;
  private clusterUrl: string;
  private clusterPubkey: PublicKey;
  private apiKey: string;
  private databaseService: DatabaseService;
  private lastAttestationTimestamp: BN = new BN(0);

  constructor(
    connection: Connection,
    clusterUrl: string,
    clusterPubkey: PublicKey,
    apiKey: string,
    databaseService: DatabaseService
  ) {
    this.connection = connection;
    this.clusterUrl = clusterUrl.replace(/\/$/, '');
    this.clusterPubkey = clusterPubkey;
    this.apiKey = apiKey;
    this.databaseService = databaseService;
  }

  // Simple KDF: derive 32-byte key from shared secret (placeholder; use HKDF in prod)
  private kdf(sharedSecret: Uint8Array): Uint8Array {
    // XOR-fold to 32 bytes (placeholder). Replace with HKDF-SHA256 in production.
    const out = new Uint8Array(32);
    for (let i = 0; i < sharedSecret.length; i++) {
      out[i % 32] ^= sharedSecret[i];
    }
    return out;
  }

  // Binary pack utility
  private concatBuffers(buffers: Uint8Array[]): Uint8Array {
    const total = buffers.reduce((acc, b) => acc + b.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const b of buffers) {
      out.set(b, off);
      off += b.length;
    }
    return out;
  }

  // Convert Uint8Array to base64 string
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
  }

  // Convert base64 string to Uint8Array
  private base64ToUint8Array(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'base64'));
  }

  // Encrypt loan application data to MXE using X25519 + ChaCha20-Poly1305
  async encryptLoanApplication(
    loanApplication: LoanApplicationParams
  ): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array; ephPubkey: Uint8Array }> {
    try {
      // Generate ephemeral keypair
      const ephPriv = x25519.utils.randomPrivateKey();
      const ephPub = x25519.getPublicKey(ephPriv);

      // MXE cluster public key is assumed to be x25519-compatible; if ed25519, convert via XEdDSA if needed
      const mxePubBytes = this.clusterPubkey.toBytes();

      // Derive shared secret and symmetric key
      const shared = x25519.getSharedSecret(ephPriv, mxePubBytes);
      const key = this.kdf(shared);

      // Serialize plaintext deterministically
      const borrower = loanApplication.borrowerPubkey.toBytes();
      const amount = loanApplication.amount.toArrayLike(Uint8Array, 'be', 16);
      const ir = new Uint8Array([loanApplication.interestRateBps & 0xff, (loanApplication.interestRateBps >> 8) & 0xff]);
      const duration = loanApplication.duration.toArrayLike(Uint8Array, 'be', 8);
      const tranche = new Uint8Array([loanApplication.tranche & 0xff]);
      const plaintext = this.concatBuffers([
        borrower,
        amount,
        ir,
        duration,
        loanApplication.collateralHash,
        tranche,
        loanApplication.encryptedData,
      ]);

      // Nonce 12 bytes for ChaCha20-Poly1305
      const nonce = randomBytes(12);
      const aead = chacha20poly1305(key);
      const ciphertext = aead.seal(nonce, plaintext);

      return { ciphertext, nonce, ephPubkey: ephPub };
    } catch (error: any) {
      logger.error('Failed to encrypt loan application:', error);
      throw new Error(`Failed to encrypt loan application: ${error.message}`);
    }
  }

  // Submit loan application to MXE (HTTP placeholder)
  async submitLoanApplication(payload: {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    ephPubkey: Uint8Array;
  }): Promise<string> {
    try {
      const url = `${this.clusterUrl}/api/v1/loan_applications`;
      const res = await axios.post(url, {
        ciphertext: this.uint8ArrayToBase64(payload.ciphertext),
        nonce: this.uint8ArrayToBase64(payload.nonce),
        ephPubkey: this.uint8ArrayToBase64(payload.ephPubkey),
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 30000,
      });
      return res.data?.txId || res.data?.id || 'submitted';
    } catch (error: any) {
      logger.error('Failed to submit loan application:', error);
      throw new Error(`Failed to submit loan application: ${error.message}`);
    }
  }

  async processDesignation(designation: any): Promise<void> {
    try {
      logger.info('Processing designation in MXE...');
      
      // Submit designation to MXE for processing
      const tx = await this.arciumClient.submitComputation(
        'process_designation',
        new Uint8Array(Buffer.from(JSON.stringify(designation)))
      );
      
      // Store in database
      await this.databaseService.storeMXETransaction({
        type: 'designation',
        data: designation,
        tx,
        status: 'pending',
        createdAt: new Date(),
      });
      
      logger.info('Designation processed in MXE', { tx });
    } catch (error) {
      logger.error('Failed to process designation in MXE:', error);
      throw error;
    }
  }

  async getNavAttestation(poolId: PublicKey): Promise<AttestationData> {
    try {
      logger.info('Getting NAV attestation from MXE...', { poolId: poolId.toString() });
      
      const attestation = await this.arciumClient.getNavAttestation(poolId);
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('NAV attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get NAV attestation from MXE:', error);
      throw error;
    }
  }

  async getLoanApprovalAttestation(
    loanId: Uint8Array,
    borrowerPubkey: PublicKey,
    amount: BN
  ): Promise<AttestationData> {
    try {
      logger.info('Getting loan approval attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        borrower: borrowerPubkey.toString(),
        amount: amount.toString()
      });
      
      const attestation = await this.arciumClient.getLoanApprovalAttestation(
        loanId,
        borrowerPubkey,
        amount
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Loan approval attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get loan approval attestation from MXE:', error);
      throw error;
    }
  }

  async getLoanDisbursementAttestation(
    loanId: Uint8Array,
    amount: BN,
    beneficiary: PublicKey
  ): Promise<AttestationData> {
    try {
      logger.info('Getting loan disbursement attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        amount: amount.toString(),
        beneficiary: beneficiary.toString()
      });
      
      const attestation = await this.arciumClient.getLoanDisbursementAttestation(
        loanId,
        amount,
        beneficiary
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Loan disbursement attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get loan disbursement attestation from MXE:', error);
      throw error;
    }
  }

  async getLoanRepaymentAttestation(
    loanId: Uint8Array,
    amount: BN,
    remainingBalance: BN
  ): Promise<AttestationData> {
    try {
      logger.info('Getting loan repayment attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        amount: amount.toString(),
        remainingBalance: remainingBalance.toString()
      });
      
      const attestation = await this.arciumClient.getLoanRepaymentAttestation(
        loanId,
        amount,
        remainingBalance
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Loan repayment attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get loan repayment attestation from MXE:', error);
      throw error;
    }
  }

  async getCovenantBreachAttestation(
    loanId: Uint8Array,
    breachType: string,
    severity: number
  ): Promise<AttestationData> {
    try {
      logger.info('Getting covenant breach attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        breachType,
        severity
      });
      
      const attestation = await this.arciumClient.getCovenantBreachAttestation(
        loanId,
        breachType,
        severity
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Covenant breach attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get covenant breach attestation from MXE:', error);
      throw error;
    }
  }

  async getLiquidationAttestation(
    loanId: Uint8Array,
    collateralAmount: BN,
    recoveryAmount: BN
  ): Promise<AttestationData> {
    try {
      logger.info('Getting liquidation attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        collateralAmount: collateralAmount.toString(),
        recoveryAmount: recoveryAmount.toString()
      });
      
      const attestation = await this.arciumClient.getLiquidationAttestation(
        loanId,
        collateralAmount,
        recoveryAmount
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Liquidation attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get liquidation attestation from MXE:', error);
      throw error;
    }
  }

  async getAuditGrantAttestation(
    loanId: Uint8Array,
    auditorPubkey: PublicKey,
    accessLevel: number
  ): Promise<AttestationData> {
    try {
      logger.info('Getting audit grant attestation from MXE...', {
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString(),
        accessLevel
      });
      
      const attestation = await this.arciumClient.getAuditGrantAttestation(
        loanId,
        auditorPubkey,
        accessLevel
      );
      
      // Store attestation in database
      await this.databaseService.storeAttestation({
        type: attestation.attestationType,
        data: attestation,
        verified: true,
        createdAt: new Date(),
      });
      
      logger.info('Audit grant attestation retrieved from MXE');
      return attestation;
    } catch (error) {
      logger.error('Failed to get audit grant attestation from MXE:', error);
      throw error;
    }
  }

  async verifyAttestation(attestation: AttestationData): Promise<boolean> {
    try {
      logger.info('Verifying attestation...', {
        type: attestation.attestationType,
        nonce: attestation.nonce.toString()
      });
      
      const isValid = await this.arciumClient.verifyAttestation(attestation);
      
      if (isValid) {
        logger.info('Attestation verified successfully');
      } else {
        logger.warn('Attestation verification failed');
      }
      
      return isValid;
    } catch (error) {
      logger.error('Failed to verify attestation:', error);
      throw error;
    }
  }

  async getNewAttestations(): Promise<AttestationData[]> {
    try {
      // Query MXE for new attestations since last check
      const currentTime = new BN(Math.floor(Date.now() / 1000));
      
      // This would typically query the MXE cluster for new attestations
      // For now, return empty array
      const attestations: AttestationData[] = [];
      
      if (attestations.length > 0) {
        this.lastAttestationTimestamp = currentTime;
        logger.info(`Retrieved ${attestations.length} new attestations from MXE`);
      }
      
      return attestations;
    } catch (error) {
      logger.error('Failed to get new attestations from MXE:', error);
      return [];
    }
  }

  async submitComputation(
    computationType: string,
    encryptedInput: Uint8Array
  ): Promise<string> {
    try {
      logger.info('Submitting computation to MXE...', { computationType });
      
      const tx = await this.arciumClient.submitComputation(computationType, encryptedInput);
      
      // Store computation in database
      await this.databaseService.storeMXETransaction({
        type: 'computation',
        data: { computationType, input: Array.from(encryptedInput) },
        tx,
        status: 'pending',
        createdAt: new Date(),
      });
      
      logger.info('Computation submitted to MXE', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to submit computation to MXE:', error);
      throw error;
    }
  }

  async getComputationResult(computationId: string): Promise<Uint8Array> {
    try {
      logger.info('Getting computation result from MXE...', { computationId });
      
      const result = await this.arciumClient.getComputationResult(computationId);
      
      // Update computation status in database
      await this.databaseService.updateMXETransactionStatus(computationId, 'completed');
      
      logger.info('Computation result retrieved from MXE');
      return result;
    } catch (error) {
      logger.error('Failed to get computation result from MXE:', error);
      throw error;
    }
  }
}
