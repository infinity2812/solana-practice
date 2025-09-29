import { Router } from 'express';
import { WebSocket } from 'ws';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { MXEService } from './mxe';
import { SquadsService } from './squads';
import { SolanaService } from './solana';
import { DatabaseService } from './database';
import { QueueService } from './queue';
import { logger } from '../utils/logger';
import {
  AttestationData,
  AttestationType,
  LoanStatus,
  AuditRequestStatus,
  SquadsConfig,
  ComplianceData,
  LoanOriginationCircuit,
  CovenantMonitoringCircuit,
  NAVAccountingCircuit,
} from '@arcium/private-credit-sdk';
import { CircuitFactory } from './circuits';

export class OrchestratorService {
  private mxeService: MXEService;
  private squadsService: SquadsService;
  private solanaService: SolanaService;
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private isInitialized = false;

  constructor(
    mxeService: MXEService,
    squadsService: SquadsService,
    solanaService: SolanaService,
    queueService: QueueService,
    databaseService: DatabaseService
  ) {
    this.mxeService = mxeService;
    this.squadsService = squadsService;
    this.solanaService = solanaService;
    this.queueService = queueService;
    this.databaseService = databaseService;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    logger.info('Initializing orchestrator service...');

    // Start monitoring services
    await this.startMXEMonitoring();
    await this.startSquadsMonitoring();
    await this.startSolanaMonitoring();

    // Start queue processors
    await this.startQueueProcessors();

    this.isInitialized = true;
    logger.info('Orchestrator service initialized');
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down orchestrator service...');
    this.isInitialized = false;
  }

  // Pool Management
  async createPool(
    owner: PublicKey,
    authority: PublicKey,
    receiptMint: PublicKey,
    escrowSquadAddress: PublicKey,
    poolConfig: any
  ): Promise<string> {
    try {
      logger.info('Creating pool...', { owner: owner.toString() });

      // Create pool on Solana
      const tx = await this.solanaService.createPool(
        owner,
        authority,
        receiptMint,
        escrowSquadAddress,
        poolConfig
      );

      // Store pool in database
      await this.databaseService.storePool({
        poolId: owner.toString(),
        owner: owner.toString(),
        authority: authority.toString(),
        receiptMint: receiptMint.toString(),
        escrowSquadAddress: escrowSquadAddress.toString(),
        config: poolConfig,
        createdAt: new Date(),
      });

      logger.info('Pool created successfully', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to create pool:', error);
      throw error;
    }
  }

  // Loan Management
  async processLoanApplication(
    borrower: PublicKey,
    loanApplication: any
  ): Promise<string> {
    try {
      logger.info('Processing loan application...', { borrower: borrower.toString() });

      // Submit to MXE for processing
      const mxeTx = await this.mxeService.submitLoanApplication(loanApplication);

      // Store application in database
      await this.databaseService.storeLoanApplication({
        borrower: borrower.toString(),
        application: loanApplication,
        mxeTx,
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('Loan application submitted to MXE', { mxeTx });
      return mxeTx;
    } catch (error) {
      logger.error('Failed to process loan application:', error);
      throw error;
    }
  }

  async processDesignation(
    lender: PublicKey,
    designation: any
  ): Promise<string> {
    try {
      logger.info('Processing designation...', { lender: lender.toString() });

      // Create loan commit on Solana
      const tx = await this.solanaService.createLoanCommit(
        lender,
        designation
      );

      // Notify MXE of designation
      await this.mxeService.processDesignation(designation);

      logger.info('Designation processed', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to process designation:', error);
      throw error;
    }
  }

  // Deposit Management
  async processDeposit(
    depositor: PublicKey,
    amount: BN,
    poolId: PublicKey
  ): Promise<string> {
    try {
      logger.info('Processing deposit...', { 
        depositor: depositor.toString(),
        amount: amount.toString(),
        poolId: poolId.toString()
      });

      // Get NAV attestation from MXE
      const navAttestation = await this.mxeService.getNavAttestation(poolId);

      // Create Squads transfer transaction
      const squadsTx = await this.squadsService.createTransferTransaction(
        depositor,
        amount
      );

      // Mint receipt tokens
      const mintTx = await this.solanaService.mintReceiptTokens(
        depositor,
        poolId,
        amount,
        navAttestation
      );

      // Store deposit in database
      await this.databaseService.storeDeposit({
        depositor: depositor.toString(),
        amount: amount.toString(),
        poolId: poolId.toString(),
        squadsTx,
        mintTx,
        createdAt: new Date(),
      });

      logger.info('Deposit processed successfully', { squadsTx, mintTx });
      return mintTx;
    } catch (error) {
      logger.error('Failed to process deposit:', error);
      throw error;
    }
  }

  // Attestation Management
  async processAttestation(attestation: AttestationData): Promise<void> {
    try {
      logger.info('Processing attestation...', { 
        type: attestation.attestationType,
        nonce: attestation.nonce.toString()
      });

      // Verify attestation
      const isValid = await this.mxeService.verifyAttestation(attestation);
      if (!isValid) {
        throw new Error('Invalid attestation');
      }

      // Submit to Solana
      await this.solanaService.submitAttestation(attestation);

      // Process based on type
      switch (attestation.attestationType) {
        case AttestationType.NavUpdate:
          await this.processNavUpdate(attestation);
          break;
        case AttestationType.LoanApproval:
          await this.processLoanApproval(attestation);
          break;
        case AttestationType.LoanDisbursement:
          await this.processLoanDisbursement(attestation);
          break;
        case AttestationType.LoanRepayment:
          await this.processLoanRepayment(attestation);
          break;
        case AttestationType.CovenantBreach:
          await this.processCovenantBreach(attestation);
          break;
        case AttestationType.Liquidation:
          await this.processLiquidation(attestation);
          break;
        case AttestationType.AuditGrant:
          await this.processAuditGrant(attestation);
          break;
        case AttestationType.EmergencyPause:
          await this.processEmergencyPause(attestation);
          break;
      }

      logger.info('Attestation processed successfully');
    } catch (error) {
      logger.error('Failed to process attestation:', error);
      throw error;
    }
  }

  // Audit Management
  async requestAudit(
    requester: PublicKey,
    loanId: Uint8Array,
    auditorPubkey: PublicKey,
    legalOrderHash: Uint8Array
  ): Promise<string> {
    try {
      logger.info('Processing audit request...', { 
        requester: requester.toString(),
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString()
      });

      // Create audit request on Solana
      const tx = await this.solanaService.requestAudit(
        requester,
        loanId,
        auditorPubkey,
        legalOrderHash
      );

      // Store in database
      await this.databaseService.storeAuditRequest({
        requester: requester.toString(),
        loanId: Buffer.from(loanId).toString('hex'),
        auditor: auditorPubkey.toString(),
        legalOrderHash: Buffer.from(legalOrderHash).toString('hex'),
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('Audit request created', { tx });
      return tx;
    } catch (error) {
      logger.error('Failed to request audit:', error);
      throw error;
    }
  }

  // WebSocket handling
  async handleWebSocketMessage(ws: WebSocket, data: any): Promise<void> {
    try {
      const { type, payload } = data;

      switch (type) {
        case 'subscribe':
          await this.handleSubscription(ws, payload);
          break;
        case 'unsubscribe':
          await this.handleUnsubscription(ws, payload);
          break;
        case 'query':
          await this.handleQuery(ws, payload);
          break;
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('WebSocket message handling error:', error);
      ws.send(JSON.stringify({ error: 'Message processing failed' }));
    }
  }

  // Private methods
  private async startMXEMonitoring(): Promise<void> {
    // Start monitoring MXE for new attestations
    setInterval(async () => {
      try {
        const attestations = await this.mxeService.getNewAttestations();
        for (const attestation of attestations) {
          await this.processAttestation(attestation);
        }
      } catch (error) {
        logger.error('MXE monitoring error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  private async startSquadsMonitoring(): Promise<void> {
    // Start monitoring Squads for new transactions
    setInterval(async () => {
      try {
        const transactions = await this.squadsService.getPendingTransactions();
        for (const tx of transactions) {
          await this.queueService.addJob('processSquadsTransaction', tx);
        }
      } catch (error) {
        logger.error('Squads monitoring error:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  private async startSolanaMonitoring(): Promise<void> {
    // Start monitoring Solana for program events
    setInterval(async () => {
      try {
        const events = await this.solanaService.getNewEvents();
        for (const event of events) {
          await this.queueService.addJob('processSolanaEvent', event);
        }
      } catch (error) {
        logger.error('Solana monitoring error:', error);
      }
    }, 3000); // Check every 3 seconds
  }

  private async startQueueProcessors(): Promise<void> {
    // Process Squads transactions
    this.queueService.process('processSquadsTransaction', async (job) => {
      await this.squadsService.processTransaction(job.data);
    });

    // Process Solana events
    this.queueService.process('processSolanaEvent', async (job) => {
      await this.solanaService.processEvent(job.data);
    });

    // Process attestations
    this.queueService.process('processAttestation', async (job) => {
      await this.processAttestation(job.data);
    });
  }

  private async processNavUpdate(attestation: AttestationData): Promise<void> {
    // Update NAV in database and notify clients
    if (attestation.payload.navUpdate) {
      await this.databaseService.updateNav(
        Buffer.from(attestation.payload.navUpdate.poolId).toString('hex'),
        attestation.payload.navUpdate.newNav.toString()
      );
    }
  }

  private async processLoanApproval(attestation: AttestationData): Promise<void> {
    // Update loan status and notify clients
    if (attestation.payload.loanApproval) {
      await this.databaseService.updateLoanStatus(
        Buffer.from(attestation.payload.loanApproval.loanId).toString('hex'),
        LoanStatus.Approved
      );
    }
  }

  private async processLoanDisbursement(attestation: AttestationData): Promise<void> {
    // Create disbursement transaction in Squads
    if (attestation.payload.loanDisbursement) {
      await this.squadsService.createDisbursementTransaction(
        attestation.payload.loanDisbursement.amount,
        attestation.payload.loanDisbursement.beneficiary
      );
    }
  }

  private async processLoanRepayment(attestation: AttestationData): Promise<void> {
    // Update loan status and NAV
    if (attestation.payload.loanRepayment) {
      await this.databaseService.updateLoanStatus(
        Buffer.from(attestation.payload.loanRepayment.loanId).toString('hex'),
        LoanStatus.Repaid
      );
    }
  }

  private async processCovenantBreach(attestation: AttestationData): Promise<void> {
    // Handle covenant breach
    if (attestation.payload.covenantBreach) {
      await this.databaseService.updateLoanStatus(
        Buffer.from(attestation.payload.covenantBreach.loanId).toString('hex'),
        LoanStatus.Defaulted
      );
    }
  }

  private async processLiquidation(attestation: AttestationData): Promise<void> {
    // Handle liquidation
    if (attestation.payload.liquidation) {
      await this.databaseService.updateLoanStatus(
        Buffer.from(attestation.payload.liquidation.loanId).toString('hex'),
        LoanStatus.Liquidated
      );
    }
  }

  private async processAuditGrant(attestation: AttestationData): Promise<void> {
    // Grant audit access
    if (attestation.payload.auditGrant) {
      await this.databaseService.updateAuditRequestStatus(
        Buffer.from(attestation.payload.auditGrant.loanId).toString('hex'),
        AuditRequestStatus.Approved
      );
    }
  }

  private async processEmergencyPause(attestation: AttestationData): Promise<void> {
    // Handle emergency pause
    if (attestation.payload.emergencyPause) {
      await this.databaseService.updatePoolEmergencyPause(
        attestation.payload.emergencyPause.reason
      );
    }
  }

  private async handleSubscription(ws: WebSocket, payload: any): Promise<void> {
    // Handle WebSocket subscription
    ws.send(JSON.stringify({ type: 'subscribed', payload }));
  }

  private async handleUnsubscription(ws: WebSocket, payload: any): Promise<void> {
    // Handle WebSocket unsubscription
    ws.send(JSON.stringify({ type: 'unsubscribed', payload }));
  }

  private async handleQuery(ws: WebSocket, payload: any): Promise<void> {
    // Handle WebSocket query
    const result = await this.databaseService.query(payload.query, payload.params);
    ws.send(JSON.stringify({ type: 'query_result', payload: result }));
  }

  // API Routes
  getPoolRoutes(): Router {
    const router = Router();
    
    router.post('/create', async (req, res) => {
      try {
        const { owner, authority, receiptMint, escrowSquadAddress, config } = req.body;
        const tx = await this.createPool(
          new PublicKey(owner),
          new PublicKey(authority),
          new PublicKey(receiptMint),
          new PublicKey(escrowSquadAddress),
          config
        );
        res.json({ success: true, tx });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  getLoanRoutes(): Router {
    const router = Router();
    
    router.post('/apply', async (req, res) => {
      try {
        const { borrower, application } = req.body;
        const tx = await this.processLoanApplication(
          new PublicKey(borrower),
          application
        );
        res.json({ success: true, tx });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  getAttestationRoutes(): Router {
    const router = Router();
    
    router.post('/submit', async (req, res) => {
      try {
        const { attestation } = req.body;
        await this.processAttestation(attestation);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  getAuditRoutes(): Router {
    const router = Router();
    
    router.post('/request', async (req, res) => {
      try {
        const { requester, loanId, auditor, legalOrderHash } = req.body;
        const tx = await this.requestAudit(
          new PublicKey(requester),
          new Uint8Array(Buffer.from(loanId, 'hex')),
          new PublicKey(auditor),
          new Uint8Array(Buffer.from(legalOrderHash, 'hex'))
        );
        res.json({ success: true, tx });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  // Process loan origination circuit
  async processLoanOriginationCircuit(
    circuit: LoanOriginationCircuit
  ): Promise<string> {
    try {
      logger.info('Processing loan origination circuit...', {
        borrowerCommitment: Buffer.from(circuit.borrowerCommitment).toString('hex'),
        amount: circuit.amount.toString(),
        interestRateBps: circuit.interestRateBps,
      });

      // Process circuit locally first
      const result = await CircuitFactory.processCircuit('loan_origination', circuit);
      
      logger.info('Loan origination circuit processed locally', {
        approval: result.approval,
        approvedAmount: result.approvedAmount.toString(),
        approvedRate: result.approvedRate,
        riskFactors: result.riskFactors,
      });

      // Submit circuit to MXE for verification
      const circuitId = await this.mxeService.submitComputation(
        'loan_origination',
        new Uint8Array(Buffer.from(JSON.stringify(circuit)))
      );

      // Store circuit and result in database
      await this.databaseService.storeMXETransaction({
        type: 'loan_origination_circuit',
        data: { circuit, result },
        tx: circuitId,
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('Loan origination circuit submitted to MXE', { circuitId });
      return circuitId;
    } catch (error) {
      logger.error('Failed to process loan origination circuit:', error);
      throw error;
    }
  }

  // Process covenant monitoring circuit
  async processCovenantMonitoringCircuit(
    circuit: CovenantMonitoringCircuit
  ): Promise<string> {
    try {
      logger.info('Processing covenant monitoring circuit...', {
        loanId: Buffer.from(circuit.loanId).toString('hex'),
        currentNav: circuit.currentNav.toString(),
        debtToEquityRatio: circuit.debtToEquityRatio,
      });

      // Process circuit locally first
      const result = await CircuitFactory.processCircuit('covenant_monitoring', circuit);
      
      logger.info('Covenant monitoring circuit processed locally', {
        breachDetected: result.breachDetected,
        breachType: result.breachType,
        severity: result.severity,
        recommendedAction: result.recommendedAction,
      });

      // Submit circuit to MXE for verification
      const circuitId = await this.mxeService.submitComputation(
        'covenant_monitoring',
        new Uint8Array(Buffer.from(JSON.stringify(circuit)))
      );

      // Store circuit and result in database
      await this.databaseService.storeMXETransaction({
        type: 'covenant_monitoring_circuit',
        data: { circuit, result },
        tx: circuitId,
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('Covenant monitoring circuit submitted to MXE', { circuitId });
      return circuitId;
    } catch (error) {
      logger.error('Failed to process covenant monitoring circuit:', error);
      throw error;
    }
  }

  // Process NAV accounting circuit
  async processNAVAccountingCircuit(
    circuit: NAVAccountingCircuit
  ): Promise<string> {
    try {
      logger.info('Processing NAV accounting circuit...', {
        poolId: Buffer.from(circuit.poolId).toString('hex'),
        totalAssets: circuit.totalAssets.toString(),
        totalLiabilities: circuit.totalLiabilities.toString(),
      });

      // Process circuit locally first
      const result = await CircuitFactory.processCircuit('nav_accounting', circuit);
      
      logger.info('NAV accounting circuit processed locally', {
        netAssetValue: result.netAssetValue.toString(),
        navPerToken: result.navPerToken.toString(),
        totalFees: result.totalFees.toString(),
        reserves: result.reserves.toString(),
      });

      // Submit circuit to MXE for verification
      const circuitId = await this.mxeService.submitComputation(
        'nav_accounting',
        new Uint8Array(Buffer.from(JSON.stringify(circuit)))
      );

      // Store circuit and result in database
      await this.databaseService.storeMXETransaction({
        type: 'nav_accounting_circuit',
        data: { circuit, result },
        tx: circuitId,
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('NAV accounting circuit submitted to MXE', { circuitId });
      return circuitId;
    } catch (error) {
      logger.error('Failed to process NAV accounting circuit:', error);
      throw error;
    }
  }

  // Process compliance data
  async processComplianceData(
    complianceData: ComplianceData
  ): Promise<string> {
    try {
      logger.info('Processing compliance data...', {
        kycVerified: complianceData.kycStatus.verified,
        amlRiskLevel: complianceData.amlStatus.riskLevel,
        riskScore: complianceData.riskAssessment.score,
      });

      // Submit compliance data to MXE
      const complianceId = await this.mxeService.submitComputation(
        'compliance_verification',
        new Uint8Array(Buffer.from(JSON.stringify(complianceData)))
      );

      // Store compliance data in database
      await this.databaseService.storeMXETransaction({
        type: 'compliance_verification',
        data: complianceData,
        tx: complianceId,
        status: 'pending',
        createdAt: new Date(),
      });

      logger.info('Compliance data submitted', { complianceId });
      return complianceId;
    } catch (error) {
      logger.error('Failed to process compliance data:', error);
      throw error;
    }
  }

  // Configure Squads multisig
  async configureSquadsMultisig(config: SquadsConfig): Promise<void> {
    try {
      logger.info('Configuring Squads multisig...', {
        multisigPda: config.multisigPda.toString(),
        threshold: config.threshold,
        memberCount: config.members.length,
      });

      // Store configuration in database
      await this.databaseService.storeSquadsConfig(config);

      logger.info('Squads multisig configured successfully');
    } catch (error) {
      logger.error('Failed to configure Squads multisig:', error);
      throw error;
    }
  }

  // Get system health status
  async getSystemHealth(): Promise<{
    mxeStatus: string;
    squadsStatus: string;
    solanaStatus: string;
    databaseStatus: string;
    queueStatus: string;
    lastAttestation: Date | null;
    pendingTransactions: number;
  }> {
    try {
      const mxeStatus = await this.mxeService.getNewAttestations().then(() => 'healthy').catch(() => 'unhealthy');
      const squadsStatus = await this.squadsService.getMultisigStatus().then(() => 'healthy').catch(() => 'unhealthy');
      const solanaStatus = await this.solanaService.getConnectionHealth().then(() => 'healthy').catch(() => 'unhealthy');
      const databaseStatus = await this.databaseService.healthCheck().then(() => 'healthy').catch(() => 'unhealthy');
      const queueStatus = await this.queueService.getQueueHealth().then(() => 'healthy').catch(() => 'unhealthy');
      
      const lastAttestation = await this.databaseService.getLastAttestation();
      const pendingTransactions = await this.squadsService.getPendingTransactions().then(txs => txs.length).catch(() => 0);

      return {
        mxeStatus,
        squadsStatus,
        solanaStatus,
        databaseStatus,
        queueStatus,
        lastAttestation: lastAttestation?.createdAt || null,
        pendingTransactions,
      };
    } catch (error) {
      logger.error('Failed to get system health:', error);
      throw error;
    }
  }
}
