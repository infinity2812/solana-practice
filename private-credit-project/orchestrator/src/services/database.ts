import { Pool } from 'pg';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/private_credit',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing database service...');
      
      // Test connection
      await this.pool.query('SELECT NOW()');
      
      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      logger.info('Database service initialized');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database service closed');
  }

  private async createTables(): Promise<void> {
    const createTablesSQL = `
      -- Pools table
      CREATE TABLE IF NOT EXISTS pools (
        id SERIAL PRIMARY KEY,
        pool_id VARCHAR(44) UNIQUE NOT NULL,
        owner VARCHAR(44) NOT NULL,
        authority VARCHAR(44) NOT NULL,
        receipt_mint VARCHAR(44) NOT NULL,
        escrow_squad_address VARCHAR(44) NOT NULL,
        config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Loans table
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        loan_id VARCHAR(64) UNIQUE NOT NULL,
        borrower VARCHAR(44) NOT NULL,
        lender VARCHAR(44) NOT NULL,
        amount VARCHAR(20) NOT NULL,
        interest_rate_bps INTEGER NOT NULL,
        duration BIGINT NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Attestations table
      CREATE TABLE IF NOT EXISTS attestations (
        id SERIAL PRIMARY KEY,
        attestation_hash VARCHAR(64) UNIQUE NOT NULL,
        attestation_type VARCHAR(20) NOT NULL,
        data JSONB NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Deposits table
      CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        depositor VARCHAR(44) NOT NULL,
        amount VARCHAR(20) NOT NULL,
        pool_id VARCHAR(44) NOT NULL,
        squads_tx VARCHAR(88),
        mint_tx VARCHAR(88),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Squads transactions table
      CREATE TABLE IF NOT EXISTS squads_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(88) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        data JSONB NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Solana transactions table
      CREATE TABLE IF NOT EXISTS solana_transactions (
        id SERIAL PRIMARY KEY,
        transaction_signature VARCHAR(88) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        data JSONB NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- MXE transactions table
      CREATE TABLE IF NOT EXISTS mxe_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(88) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL,
        data JSONB NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit requests table
      CREATE TABLE IF NOT EXISTS audit_requests (
        id SERIAL PRIMARY KEY,
        requester VARCHAR(44) NOT NULL,
        loan_id VARCHAR(64) NOT NULL,
        auditor VARCHAR(44) NOT NULL,
        legal_order_hash VARCHAR(64) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_at TIMESTAMP
      );

      -- Solana events table
      CREATE TABLE IF NOT EXISTS solana_events (
        id SERIAL PRIMARY KEY,
        slot BIGINT NOT NULL,
        signature VARCHAR(88) NOT NULL,
        logs TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Attestation verifications table
      CREATE TABLE IF NOT EXISTS attestation_verifications (
        id SERIAL PRIMARY KEY,
        attestation_hash VARCHAR(64) UNIQUE NOT NULL,
        verified BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_pools_pool_id ON pools(pool_id);
      CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id);
      CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower);
      CREATE INDEX IF NOT EXISTS idx_loans_lender ON loans(lender);
      CREATE INDEX IF NOT EXISTS idx_attestations_hash ON attestations(attestation_hash);
      CREATE INDEX IF NOT EXISTS idx_attestations_type ON attestations(attestation_type);
      CREATE INDEX IF NOT EXISTS idx_deposits_depositor ON deposits(depositor);
      CREATE INDEX IF NOT EXISTS idx_deposits_pool_id ON deposits(pool_id);
      CREATE INDEX IF NOT EXISTS idx_squads_tx_id ON squads_transactions(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_solana_tx_sig ON solana_transactions(transaction_signature);
      CREATE INDEX IF NOT EXISTS idx_mxe_tx_id ON mxe_transactions(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_audit_requests_loan_id ON audit_requests(loan_id);
      CREATE INDEX IF NOT EXISTS idx_audit_requests_auditor ON audit_requests(auditor);
      CREATE INDEX IF NOT EXISTS idx_solana_events_slot ON solana_events(slot);
    `;

    await this.pool.query(createTablesSQL);
    logger.info('Database tables created/verified');
  }

  // Pool operations
  async storePool(data: any): Promise<void> {
    const query = `
      INSERT INTO pools (pool_id, owner, authority, receipt_mint, escrow_squad_address, config)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (pool_id) DO UPDATE SET
        authority = EXCLUDED.authority,
        receipt_mint = EXCLUDED.receipt_mint,
        escrow_squad_address = EXCLUDED.escrow_squad_address,
        config = EXCLUDED.config,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      data.poolId,
      data.owner,
      data.authority,
      data.receiptMint,
      data.escrowSquadAddress,
      JSON.stringify(data.config)
    ]);
  }

  async getPool(poolId: string): Promise<any> {
    const query = 'SELECT * FROM pools WHERE pool_id = $1';
    const result = await this.pool.query(query, [poolId]);
    return result.rows[0];
  }

  async updatePoolEmergencyPause(reason: string): Promise<void> {
    const query = `
      UPDATE pools 
      SET config = jsonb_set(config, '{emergency_pause}', 'true'),
          updated_at = CURRENT_TIMESTAMP
      WHERE pool_id IN (SELECT pool_id FROM pools LIMIT 1)
    `;
    
    await this.pool.query(query);
  }

  // Loan operations
  async storeLoanApplication(data: any): Promise<void> {
    const query = `
      INSERT INTO loans (loan_id, borrower, lender, amount, interest_rate_bps, duration, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (loan_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      data.loanId,
      data.borrower,
      data.lender || '',
      data.amount || '0',
      data.interestRateBps || 0,
      data.duration || 0,
      data.status
    ]);
  }

  async updateLoanStatus(loanId: string, status: string): Promise<void> {
    const query = `
      UPDATE loans 
      SET status = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE loan_id = $1
    `;
    
    await this.pool.query(query, [loanId, status]);
  }

  async getLoan(loanId: string): Promise<any> {
    const query = 'SELECT * FROM loans WHERE loan_id = $1';
    const result = await this.pool.query(query, [loanId]);
    return result.rows[0];
  }

  // Attestation operations
  async storeAttestation(data: any): Promise<void> {
    const query = `
      INSERT INTO attestations (attestation_hash, attestation_type, data, verified)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (attestation_hash) DO UPDATE SET
        verified = EXCLUDED.verified
    `;
    
    await this.pool.query(query, [
      data.attestationHash,
      data.type,
      JSON.stringify(data.data),
      data.verified
    ]);
  }

  async getAttestation(attestationHash: string): Promise<any> {
    const query = 'SELECT * FROM attestations WHERE attestation_hash = $1';
    const result = await this.pool.query(query, [attestationHash]);
    return result.rows[0];
  }

  // Deposit operations
  async storeDeposit(data: any): Promise<void> {
    const query = `
      INSERT INTO deposits (depositor, amount, pool_id, squads_tx, mint_tx)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.pool.query(query, [
      data.depositor,
      data.amount,
      data.poolId,
      data.squadsTx,
      data.mintTx
    ]);
  }

  async getDeposits(poolId: string): Promise<any[]> {
    const query = 'SELECT * FROM deposits WHERE pool_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [poolId]);
    return result.rows;
  }

  // Squads transaction operations
  async storeSquadsTransaction(data: any): Promise<void> {
    const query = `
      INSERT INTO squads_transactions (transaction_id, type, data, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (transaction_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      data.tx,
      data.type,
      JSON.stringify(data),
      data.status
    ]);
  }

  async updateSquadsTransactionStatus(transactionId: string, status: string): Promise<void> {
    const query = `
      UPDATE squads_transactions 
      SET status = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE transaction_id = $1
    `;
    
    await this.pool.query(query, [transactionId, status]);
  }

  // Solana transaction operations
  async storeSolanaTransaction(data: any): Promise<void> {
    const query = `
      INSERT INTO solana_transactions (transaction_signature, type, data, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (transaction_signature) DO UPDATE SET
        status = EXCLUDED.status
    `;
    
    await this.pool.query(query, [
      data.tx,
      data.type,
      JSON.stringify(data),
      data.status
    ]);
  }

  async storeSolanaEvent(data: any): Promise<void> {
    const query = `
      INSERT INTO solana_events (slot, signature, logs)
      VALUES ($1, $2, $3)
    `;
    
    await this.pool.query(query, [
      data.slot,
      data.signature,
      data.logs
    ]);
  }

  // MXE transaction operations
  async storeMXETransaction(data: any): Promise<void> {
    const query = `
      INSERT INTO mxe_transactions (transaction_id, type, data, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (transaction_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      data.tx,
      data.type,
      JSON.stringify(data),
      data.status
    ]);
  }

  async updateMXETransactionStatus(transactionId: string, status: string): Promise<void> {
    const query = `
      UPDATE mxe_transactions 
      SET status = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE transaction_id = $1
    `;
    
    await this.pool.query(query, [transactionId, status]);
  }

  // Audit request operations
  async storeAuditRequest(data: any): Promise<void> {
    const query = `
      INSERT INTO audit_requests (requester, loan_id, auditor, legal_order_hash, status)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.pool.query(query, [
      data.requester,
      data.loanId,
      data.auditor,
      data.legalOrderHash,
      data.status
    ]);
  }

  async updateAuditRequestStatus(loanId: string, status: string): Promise<void> {
    const query = `
      UPDATE audit_requests 
      SET status = $2, granted_at = CURRENT_TIMESTAMP 
      WHERE loan_id = $1
    `;
    
    await this.pool.query(query, [loanId, status]);
  }

  async getAuditRequest(loanId: string, auditor: string): Promise<any> {
    const query = 'SELECT * FROM audit_requests WHERE loan_id = $1 AND auditor = $2';
    const result = await this.pool.query(query, [loanId, auditor]);
    return result.rows[0];
  }

  // Attestation verification operations
  async storeAttestationVerification(data: any): Promise<void> {
    const query = `
      INSERT INTO attestation_verifications (attestation_hash, verified)
      VALUES ($1, $2)
      ON CONFLICT (attestation_hash) DO UPDATE SET
        verified = EXCLUDED.verified
    `;
    
    await this.pool.query(query, [
      data.attestationHash,
      data.verified
    ]);
  }

  // NAV operations
  async updateNav(poolId: string, nav: string): Promise<void> {
    const query = `
      UPDATE pools 
      SET config = jsonb_set(config, '{nav}', $2),
          updated_at = CURRENT_TIMESTAMP
      WHERE pool_id = $1
    `;
    
    await this.pool.query(query, [poolId, nav]);
  }

  // Generic query method
  async query(query: string, params: any[] = []): Promise<any> {
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}
