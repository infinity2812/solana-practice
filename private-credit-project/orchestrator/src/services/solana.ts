import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { DatabaseService } from './database';
import { logger } from '../utils/logger';
import { AttestationData } from '@arcium/private-credit-sdk';

export class SolanaService {
  private connection: Connection;
  private program: Program;
  private databaseService: DatabaseService;
  private lastEventSlot: number = 0;

  constructor(connection: Connection, program: Program, databaseService: DatabaseService) {
    this.connection = connection;
    this.program = program;
    this.databaseService = databaseService;
  }

  async createPool(
    owner: PublicKey,
    authority: PublicKey,
    receiptMint: PublicKey,
    escrowSquadAddress: PublicKey,
    poolConfig: any
  ): Promise<string> {
    try {
      logger.info('Creating pool on Solana...', { owner: owner.toString() });
      
      const tx = await this.program.methods
        .initializePool(poolConfig)
        .accounts({
          poolAccount: owner, // This would be derived from seeds
          payer: owner,
          owner,
          authority,
          receiptMint,
          escrowSquadAddress,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      // Store pool creation in database
      await this.databaseService.storeSolanaTransaction({
        type: 'create_pool',
        poolId: owner.toString(),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Pool created on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to create pool on Solana:', error);
      throw error;
    }
  }

  async createLoanCommit(
    lender: PublicKey,
    loanCommitData: any
  ): Promise<string> {
    try {
      logger.info('Creating loan commit on Solana...', { lender: lender.toString() });
      
      const tx = await this.program.methods
        .createLoanCommit(loanCommitData)
        .accounts({
          loanCommit: PublicKey.default, // This would be derived from seeds
          poolAccount: PublicKey.default, // This would be the pool account
          payer: lender,
          authority: lender,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      // Store loan commit in database
      await this.databaseService.storeSolanaTransaction({
        type: 'create_loan_commit',
        loanId: Buffer.from(loanCommitData.loanId).toString('hex'),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Loan commit created on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to create loan commit on Solana:', error);
      throw error;
    }
  }

  async mintReceiptTokens(
    depositor: PublicKey,
    poolId: PublicKey,
    amount: BN,
    attestation: AttestationData
  ): Promise<string> {
    try {
      logger.info('Minting receipt tokens on Solana...', {
        depositor: depositor.toString(),
        poolId: poolId.toString(),
        amount: amount.toString()
      });
      
      const tx = await this.program.methods
        .mintReceiptTokens(amount, attestation)
        .accounts({
          poolAccount: poolId,
          receiptTokenAccount: PublicKey.default, // This would be derived from seeds
          receiptMint: PublicKey.default, // This would be the receipt mint
          recipient: depositor,
          payer: depositor,
          authority: depositor,
          tokenProgram: PublicKey.default,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      // Store mint transaction in database
      await this.databaseService.storeSolanaTransaction({
        type: 'mint_receipt_tokens',
        poolId: poolId.toString(),
        depositor: depositor.toString(),
        amount: amount.toString(),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Receipt tokens minted on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to mint receipt tokens on Solana:', error);
      throw error;
    }
  }

  async burnReceiptTokens(
    owner: PublicKey,
    poolId: PublicKey,
    amount: BN,
    attestation: AttestationData
  ): Promise<string> {
    try {
      logger.info('Burning receipt tokens on Solana...', {
        owner: owner.toString(),
        poolId: poolId.toString(),
        amount: amount.toString()
      });
      
      const tx = await this.program.methods
        .burnReceiptTokens(amount, attestation)
        .accounts({
          poolAccount: poolId,
          receiptTokenAccount: PublicKey.default, // This would be derived from seeds
          receiptMint: PublicKey.default, // This would be the receipt mint
          owner,
          authority: owner,
          tokenProgram: PublicKey.default,
        })
        .rpc();
      
      // Store burn transaction in database
      await this.databaseService.storeSolanaTransaction({
        type: 'burn_receipt_tokens',
        poolId: poolId.toString(),
        owner: owner.toString(),
        amount: amount.toString(),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Receipt tokens burned on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to burn receipt tokens on Solana:', error);
      throw error;
    }
  }

  async submitAttestation(attestation: AttestationData): Promise<string> {
    try {
      logger.info('Submitting attestation on Solana...', {
        type: attestation.attestationType,
        nonce: attestation.nonce.toString()
      });
      
      const tx = await this.program.methods
        .submitAttestation(attestation)
        .accounts({
          attestationRecord: PublicKey.default, // This would be derived from seeds
          payer: PublicKey.default, // This would be the payer
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      // Store attestation in database
      await this.databaseService.storeSolanaTransaction({
        type: 'submit_attestation',
        attestationType: attestation.attestationType,
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Attestation submitted on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to submit attestation on Solana:', error);
      throw error;
    }
  }

  async verifyAttestation(attestationHash: Uint8Array): Promise<boolean> {
    try {
      logger.info('Verifying attestation on Solana...', {
        hash: Buffer.from(attestationHash).toString('hex')
      });
      
      const result = await this.program.methods
        .verifyAttestation(attestationHash)
        .accounts({
          attestationRecord: PublicKey.default, // This would be derived from seeds
          verifier: PublicKey.default, // This would be the verifier
        })
        .view();
      
      const isValid = result as boolean;
      
      // Store verification result in database
      await this.databaseService.storeAttestationVerification({
        attestationHash: Buffer.from(attestationHash).toString('hex'),
        verified: isValid,
        createdAt: new Date(),
      });
      
      logger.info('Attestation verification completed', { verified: isValid });
      return isValid;
    } catch (error) {
      logger.error('Failed to verify attestation on Solana:', error);
      throw error;
    }
  }

  async requestAudit(
    requester: PublicKey,
    loanId: Uint8Array,
    auditorPubkey: PublicKey,
    legalOrderHash: Uint8Array
  ): Promise<string> {
    try {
      logger.info('Requesting audit on Solana...', {
        requester: requester.toString(),
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString()
      });
      
      const tx = await this.program.methods
        .requestAudit(loanId, auditorPubkey, legalOrderHash)
        .accounts({
          auditRequest: PublicKey.default, // This would be derived from seeds
          requester,
          auditorPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      // Store audit request in database
      await this.databaseService.storeSolanaTransaction({
        type: 'request_audit',
        loanId: Buffer.from(loanId).toString('hex'),
        requester: requester.toString(),
        auditor: auditorPubkey.toString(),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Audit request created on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to request audit on Solana:', error);
      throw error;
    }
  }

  async grantAuditAccess(
    authority: PublicKey,
    poolId: PublicKey,
    loanId: Uint8Array,
    auditorPubkey: PublicKey,
    attestation: AttestationData
  ): Promise<string> {
    try {
      logger.info('Granting audit access on Solana...', {
        authority: authority.toString(),
        poolId: poolId.toString(),
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString()
      });
      
      const tx = await this.program.methods
        .grantAuditAccess(loanId, auditorPubkey, attestation)
        .accounts({
          auditRequest: PublicKey.default, // This would be derived from seeds
          poolAccount: poolId,
          authority,
        })
        .rpc();
      
      // Store audit access grant in database
      await this.databaseService.storeSolanaTransaction({
        type: 'grant_audit_access',
        poolId: poolId.toString(),
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString(),
        tx,
        status: 'confirmed',
        createdAt: new Date(),
      });
      
      logger.info('Audit access granted on Solana', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to grant audit access on Solana:', error);
      throw error;
    }
  }

  async getNewEvents(): Promise<any[]> {
    try {
      // Get current slot
      const currentSlot = await this.connection.getSlot();
      
      if (currentSlot <= this.lastEventSlot) {
        return [];
      }
      
      // Get program logs since last event slot
      const logs = await this.connection.getProgramLogs(
        this.program.programId,
        {
          limit: 1000,
          commitment: 'confirmed'
        }
      );
      
      // Filter logs for new events
      const newEvents = logs.filter(log => 
        log.slot > this.lastEventSlot && 
        log.err === null
      );
      
      this.lastEventSlot = currentSlot;
      
      if (newEvents.length > 0) {
        logger.info(`Retrieved ${newEvents.length} new events from Solana`);
      }
      
      return newEvents;
    } catch (error) {
      logger.error('Failed to get new events from Solana:', error);
      return [];
    }
  }

  async processEvent(event: any): Promise<void> {
    try {
      logger.info('Processing Solana event...', { slot: event.slot });
      
      // Parse event data and store in database
      await this.databaseService.storeSolanaEvent({
        slot: event.slot,
        signature: event.signature,
        logs: event.logs,
        createdAt: new Date(),
      });
      
      // Process based on event type
      // This would parse the logs and determine the event type
      // For now, just log the event
      logger.info('Solana event processed', { slot: event.slot });
    } catch (error) {
      logger.error('Failed to process Solana event:', error);
      throw error;
    }
  }

  async getPoolAccount(poolId: PublicKey): Promise<any> {
    try {
      logger.info('Getting pool account from Solana...', { poolId: poolId.toString() });
      
      const account = await this.program.account.poolAccount.fetch(poolId);
      
      logger.info('Pool account retrieved from Solana');
      return account;
    } catch (error) {
      logger.error('Failed to get pool account from Solana:', error);
      throw error;
    }
  }

  async getLoanCommit(loanId: Uint8Array): Promise<any> {
    try {
      logger.info('Getting loan commit from Solana...', {
        loanId: Buffer.from(loanId).toString('hex')
      });
      
      const [loanCommitPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('loan_commit'), loanId],
        this.program.programId
      );
      
      const account = await this.program.account.loanCommit.fetch(loanCommitPda);
      
      logger.info('Loan commit retrieved from Solana');
      return account;
    } catch (error) {
      logger.error('Failed to get loan commit from Solana:', error);
      throw error;
    }
  }

  async getReceiptTokenAccount(
    poolId: PublicKey,
    owner: PublicKey
  ): Promise<any> {
    try {
      logger.info('Getting receipt token account from Solana...', {
        poolId: poolId.toString(),
        owner: owner.toString()
      });
      
      const [receiptTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('receipt_token'), poolId.toBuffer(), owner.toBuffer()],
        this.program.programId
      );
      
      const account = await this.program.account.receiptTokenAccount.fetch(receiptTokenPda);
      
      logger.info('Receipt token account retrieved from Solana');
      return account;
    } catch (error) {
      logger.error('Failed to get receipt token account from Solana:', error);
      throw error;
    }
  }

  async getAttestationRecord(attestationHash: Uint8Array): Promise<any> {
    try {
      logger.info('Getting attestation record from Solana...', {
        hash: Buffer.from(attestationHash).toString('hex')
      });
      
      const [attestationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('attestation'), attestationHash],
        this.program.programId
      );
      
      const account = await this.program.account.attestationRecord.fetch(attestationPda);
      
      logger.info('Attestation record retrieved from Solana');
      return account;
    } catch (error) {
      logger.error('Failed to get attestation record from Solana:', error);
      throw error;
    }
  }

  async getAuditRequest(
    loanId: Uint8Array,
    auditorPubkey: PublicKey
  ): Promise<any> {
    try {
      logger.info('Getting audit request from Solana...', {
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString()
      });
      
      const [auditRequestPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('audit_request'), loanId, auditorPubkey.toBuffer()],
        this.program.programId
      );
      
      const account = await this.program.account.auditRequest.fetch(auditRequestPda);
      
      logger.info('Audit request retrieved from Solana');
      return account;
    } catch (error) {
      logger.error('Failed to get audit request from Solana:', error);
      throw error;
    }
  }
}
