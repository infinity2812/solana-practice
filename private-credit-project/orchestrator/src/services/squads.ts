import { PublicKey, Connection, Keypair, SystemProgram, TransactionMessage } from '@solana/web3.js';
import BN from 'bn.js';
import * as multisig from '@sqds/multisig';
import { logger } from '../utils/logger';

/**
 * Squads Multisig Service for Orchestrator
 * 
 * This service handles all Squads multisig operations for the private credit platform.
 * It's part of the orchestrator service, not the client SDK, because:
 * 1. Multisig operations are complex server-side operations
 * 2. The orchestrator coordinates between Arcium MXE, Squads, and Solana
 * 3. Client SDK should be lightweight and focused on client interactions
 */

export interface SquadsConfig {
  multisigPda: PublicKey;
  threshold: number;
  timeLock: number;
  members: PublicKey[];
  vaults: {
    usdc: PublicKey;
    pUSD: PublicKey;
    emergency: PublicKey;
  };
}

export interface SquadsTransaction {
  id: string;
  type: 'transfer' | 'disbursement' | 'redemption' | 'governance';
  from: PublicKey;
  to: PublicKey;
  amount: BN;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  proposer: PublicKey;
  approvers: PublicKey[];
  createdAt: Date;
  executedAt?: Date;
}

export class SquadsService {
  private connection: Connection;
  private multisigPda: PublicKey;
  private config: SquadsConfig | null = null;

  constructor(connection: Connection, multisigPda: PublicKey) {
    this.connection = connection;
    this.multisigPda = multisigPda;
  }

  /**
   * Initialize Squads multisig configuration
   */
  async initializeMultisig(config: SquadsConfig): Promise<void> {
    try {
      this.config = config;
      logger.info('Squads multisig initialized', {
        multisigPda: config.multisigPda.toString(),
        threshold: config.threshold,
        memberCount: config.members.length,
      });
    } catch (error: any) {
      logger.error('Failed to initialize Squads multisig:', error);
      throw new Error(`Squads initialization failed: ${error.message}`);
    }
  }

  /**
   * Get multisig status and configuration
   */
  async getMultisigStatus(): Promise<{
    isActive: boolean;
    threshold: number;
    members: PublicKey[];
    transactionIndex: bigint;
    timeLock: number;
  }> {
    try {
      const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(
        this.connection,
        this.multisigPda
      );

      return {
        isActive: multisigAccount.isActive,
        threshold: multisigAccount.threshold,
        members: multisigAccount.members,
        transactionIndex: multisigAccount.transactionIndex,
        timeLock: multisigAccount.timeLock,
      };
    } catch (error: any) {
      logger.error('Failed to get multisig status:', error);
      throw new Error(`Failed to get multisig status: ${error.message}`);
    }
  }

  /**
   * Create a new multisig
   */
  async createMultisig(
    creator: Keypair,
    members: PublicKey[],
    threshold: number,
    timeLock: number = 0
  ): Promise<PublicKey> {
    try {
      const createKey = Keypair.generate();
      const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });

      const signature = await multisig.rpc.multisigCreate({
        connection: this.connection,
        feePayer: creator,
        creator: creator,
        multisigPda: multisigPda,
        configAuthority: creator.publicKey,
        threshold,
        members,
        timeLock,
        createKey: createKey.publicKey,
      });

      logger.info('Multisig created successfully', {
        multisigPda: multisigPda.toString(),
        signature,
        threshold,
        memberCount: members.length,
      });

      return multisigPda;
    } catch (error: any) {
      logger.error('Failed to create multisig:', error);
      throw new Error(`Multisig creation failed: ${error.message}`);
    }
  }

  /**
   * Create a vault transaction
   */
  async createVaultTransaction(
    creator: Keypair,
    vaultIndex: number,
    instructions: any[],
    memo?: string
  ): Promise<string> {
    try {
      const transactionIndex = await this.getNextTransactionIndex();
      
      const signature = await multisig.rpc.vaultTransactionCreate({
        connection: this.connection,
        feePayer: creator,
        multisigPda: this.multisigPda,
        transactionIndex,
        creator: creator.publicKey,
        vaultIndex,
        ephemeralSigners: 0,
        transactionMessage: {
          instructions,
          addressTableLookups: [],
        },
        memo,
      });

      logger.info('Vault transaction created', {
        transactionIndex: transactionIndex.toString(),
        signature,
        vaultIndex,
        instructionCount: instructions.length,
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to create vault transaction:', error);
      throw new Error(`Vault transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Create a proposal for a transaction
   */
  async createProposal(
    creator: Keypair,
    transactionIndex: bigint,
    isDraft: boolean = false
  ): Promise<string> {
    try {
      const signature = await multisig.rpc.proposalCreate({
        connection: this.connection,
        feePayer: creator,
        creator: creator,
        multisigPda: this.multisigPda,
        transactionIndex,
        isDraft,
      });

      logger.info('Proposal created', {
        transactionIndex: transactionIndex.toString(),
        signature,
        isDraft,
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to create proposal:', error);
      throw new Error(`Proposal creation failed: ${error.message}`);
    }
  }

  /**
   * Approve a proposal
   */
  async approveProposal(
    approver: Keypair,
    transactionIndex: bigint,
    memo?: string
  ): Promise<string> {
    try {
      const signature = await multisig.rpc.proposalApprove({
        connection: this.connection,
        feePayer: approver,
        member: approver,
        multisigPda: this.multisigPda,
        transactionIndex,
        memo,
      });

      logger.info('Proposal approved', {
        transactionIndex: transactionIndex.toString(),
        signature,
        approver: approver.publicKey.toString(),
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to approve proposal:', error);
      throw new Error(`Proposal approval failed: ${error.message}`);
    }
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(
    rejector: Keypair,
    transactionIndex: bigint,
    memo?: string
  ): Promise<string> {
    try {
      const signature = await multisig.rpc.proposalReject({
        connection: this.connection,
        feePayer: rejector,
        member: rejector,
        multisigPda: this.multisigPda,
        transactionIndex,
        memo,
      });

      logger.info('Proposal rejected', {
        transactionIndex: transactionIndex.toString(),
        signature,
        rejector: rejector.publicKey.toString(),
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to reject proposal:', error);
      throw new Error(`Proposal rejection failed: ${error.message}`);
    }
  }

  /**
   * Execute a vault transaction
   */
  async executeVaultTransaction(
    executor: Keypair,
    transactionIndex: bigint,
    signers?: Keypair[]
  ): Promise<string> {
    try {
      const signature = await multisig.rpc.vaultTransactionExecute({
        connection: this.connection,
        feePayer: executor,
        multisigPda: this.multisigPda,
        transactionIndex,
        member: executor.publicKey,
        signers: signers || [],
      });

      logger.info('Vault transaction executed', {
        transactionIndex: transactionIndex.toString(),
        signature,
        executor: executor.publicKey.toString(),
      });

      return signature;
    } catch (error: any) {
      logger.error('Failed to execute vault transaction:', error);
      throw new Error(`Vault transaction execution failed: ${error.message}`);
    }
  }

  /**
   * Add a member to the multisig
   */
  async addMember(
    proposer: Keypair,
    newMember: PublicKey
  ): Promise<string> {
    try {
      const transactionIndex = await this.getNextTransactionIndex();
      
      // Create the add member instruction
      const addMemberIx = multisig.instructions.multisigAddMember({
        multisigPda: this.multisigPda,
        configAuthority: proposer.publicKey,
        newMember,
        multisig: this.multisigPda,
      });

      // Create vault transaction
      await this.createVaultTransaction(proposer, 0, [addMemberIx], 'Add new member');

      // Create proposal
      const proposalSignature = await this.createProposal(proposer, transactionIndex);

      logger.info('Member addition proposed', {
        newMember: newMember.toString(),
        transactionIndex: transactionIndex.toString(),
        proposalSignature,
      });

      return proposalSignature;
    } catch (error: any) {
      logger.error('Failed to add member:', error);
      throw new Error(`Member addition failed: ${error.message}`);
    }
  }

  /**
   * Remove a member from the multisig
   */
  async removeMember(
    proposer: Keypair,
    memberToRemove: PublicKey
  ): Promise<string> {
    try {
      const transactionIndex = await this.getNextTransactionIndex();
      
      // Create the remove member instruction
      const removeMemberIx = multisig.instructions.multisigRemoveMember({
        multisigPda: this.multisigPda,
        configAuthority: proposer.publicKey,
        oldMember: memberToRemove,
        multisig: this.multisigPda,
      });

      // Create vault transaction
      await this.createVaultTransaction(proposer, 0, [removeMemberIx], 'Remove member');

      // Create proposal
      const proposalSignature = await this.createProposal(proposer, transactionIndex);

      logger.info('Member removal proposed', {
        memberToRemove: memberToRemove.toString(),
        transactionIndex: transactionIndex.toString(),
        proposalSignature,
      });

      return proposalSignature;
    } catch (error: any) {
      logger.error('Failed to remove member:', error);
      throw new Error(`Member removal failed: ${error.message}`);
    }
  }

  /**
   * Update multisig threshold
   */
  async updateThreshold(
    proposer: Keypair,
    newThreshold: number
  ): Promise<string> {
    try {
      const transactionIndex = await this.getNextTransactionIndex();
      
      // Create the update threshold instruction
      const updateThresholdIx = multisig.instructions.multisigChangeThreshold({
        multisigPda: this.multisigPda,
        configAuthority: proposer.publicKey,
        newThreshold,
        multisig: this.multisigPda,
      });

      // Create vault transaction
      await this.createVaultTransaction(proposer, 0, [updateThresholdIx], 'Update threshold');

      // Create proposal
      const proposalSignature = await this.createProposal(proposer, transactionIndex);

      logger.info('Threshold update proposed', {
        newThreshold,
        transactionIndex: transactionIndex.toString(),
        proposalSignature,
      });

      return proposalSignature;
    } catch (error: any) {
      logger.error('Failed to update threshold:', error);
      throw new Error(`Threshold update failed: ${error.message}`);
    }
  }

  /**
   * Get vault PDA for a specific index
   */
  getVaultPda(vaultIndex: number): PublicKey {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: this.multisigPda,
      index: vaultIndex,
    });
    return vaultPda;
  }

  /**
   * Get next transaction index
   */
  private async getNextTransactionIndex(): Promise<bigint> {
    try {
      const status = await this.getMultisigStatus();
      return status.transactionIndex + 1n;
    } catch (error) {
      // If multisig doesn't exist yet, start with index 1
      return 1n;
    }
  }

  /**
   * Get pending transactions
   */
  async getPendingTransactions(): Promise<SquadsTransaction[]> {
    try {
      // This would query the blockchain for pending transactions
      // For now, return empty array as placeholder
      return [];
    } catch (error: any) {
      logger.error('Failed to get pending transactions:', error);
      throw new Error(`Failed to get pending transactions: ${error.message}`);
    }
  }

  /**
   * Create a SOL transfer transaction
   */
  async createTransferTransaction(
    from: PublicKey,
    to: PublicKey,
    amount: BN,
    creator: Keypair,
    vaultIndex: number = 0
  ): Promise<string> {
    try {
      const vaultPda = this.getVaultPda(vaultIndex);
      
      const transferIx = SystemProgram.transfer({
        fromPubkey: vaultPda,
        toPubkey: to,
        lamports: amount.toNumber(),
      });

      const signature = await this.createVaultTransaction(
        creator,
        vaultIndex,
        [transferIx],
        `Transfer ${amount.toString()} lamports to ${to.toString()}`
      );

      return signature;
    } catch (error: any) {
      logger.error('Failed to create transfer transaction:', error);
      throw new Error(`Transfer transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Create a token transfer transaction
   */
  async createTokenTransferTransaction(
    mint: PublicKey,
    from: PublicKey,
    to: PublicKey,
    amount: BN,
    creator: Keypair,
    vaultIndex: number = 0
  ): Promise<string> {
    try {
      const vaultPda = this.getVaultPda(vaultIndex);
      
      // This would create SPL token transfer instructions
      // For now, return a placeholder
      const signature = await this.createVaultTransaction(
        creator,
        vaultIndex,
        [], // Token transfer instructions would go here
        `Transfer ${amount.toString()} tokens of ${mint.toString()}`
      );

      return signature;
    } catch (error: any) {
      logger.error('Failed to create token transfer transaction:', error);
      throw new Error(`Token transfer transaction creation failed: ${error.message}`);
    }
  }
}