import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  PrivateCreditError,
  PoolConfig,
  LoanApplicationParams,
  DesignationParams,
  AuditRequestParams,
  AttestationData,
  LoanStatus,
  AuditRequestStatus,
} from './types';

// Helper function to extract error message from axios errors
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (axios.isAxiosError(error)) {
    return extractErrorMessage(error);
  }
  return 'Unknown error';
}

/**
 * Lightweight Private Credit Client
 * 
 * This client only handles API calls to the orchestrator server.
 * All complex business logic is handled server-side.
 */
export class PrivateCreditClient {
  private apiClient: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
    });
  }

  // Pool Management
  async createPool(
    owner: string,
    authority: string,
    receiptMint: string,
    escrowSquadAddress: string,
    config: PoolConfig
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/pools/create', {
        owner,
        authority,
        receiptMint,
        escrowSquadAddress,
        config,
      });
      return response.data.tx;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to create pool: ${extractErrorMessage(error)}`,
        'POOL_CREATION_FAILED'
      );
    }
  }

  async getPool(poolId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.apiClient.get(`/api/pools/${poolId}`);
      return response.data;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to get pool: ${extractErrorMessage(error)}`,
        'POOL_FETCH_FAILED'
      );
    }
  }

  // Loan Management
  async applyForLoan(
    borrower: string,
    application: LoanApplicationParams
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/loans/apply', {
        borrower,
        application,
      });
      return response.data.tx;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to apply for loan: ${extractErrorMessage(error)}`,
        'LOAN_APPLICATION_FAILED'
      );
    }
  }

  async getLoan(loanId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.apiClient.get(`/api/loans/${loanId}`);
      return response.data;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to get loan: ${extractErrorMessage(error)}`,
        'LOAN_FETCH_FAILED'
      );
    }
  }

  async createDesignation(
    lender: string,
    designation: DesignationParams
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/loans/designate', {
        lender,
        designation,
      });
      return response.data.tx;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to create designation: ${extractErrorMessage(error)}`,
        'DESIGNATION_CREATION_FAILED'
      );
    }
  }

  // Deposit Management
  async deposit(
    depositor: string,
    amount: string,
    poolId: string
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/deposits', {
        depositor,
        amount,
        poolId,
      });
      return response.data.tx;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to process deposit: ${extractErrorMessage(error)}`,
        'DEPOSIT_FAILED'
      );
    }
  }

  // Attestation Management
  async submitAttestation(attestation: AttestationData): Promise<void> {
    try {
      await this.apiClient.post('/api/attestations/submit', {
        attestation,
      });
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to submit attestation: ${extractErrorMessage(error)}`,
        'ATTESTATION_SUBMISSION_FAILED'
      );
    }
  }

  async getAttestation(attestationHash: string): Promise<AttestationData> {
    try {
      const response = await this.apiClient.get(`/api/attestations/${attestationHash}`);
      return response.data;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to get attestation: ${extractErrorMessage(error)}`,
        'ATTESTATION_FETCH_FAILED'
      );
    }
  }

  // Audit Management
  async requestAudit(
    requester: string,
    loanId: string,
    auditor: string,
    legalOrderHash: string
  ): Promise<string> {
    try {
      const response = await this.apiClient.post('/api/audits/request', {
        requester,
        loanId,
        auditor,
        legalOrderHash,
      });
      return response.data.tx;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to request audit: ${extractErrorMessage(error)}`,
        'AUDIT_REQUEST_FAILED'
      );
    }
  }

  async getAuditRequest(loanId: string, auditor: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.apiClient.get(`/api/audits/${loanId}/${auditor}`);
      return response.data;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to get audit request: ${extractErrorMessage(error)}`,
        'AUDIT_FETCH_FAILED'
      );
    }
  }

  // System Health
  async getSystemHealth(): Promise<Record<string, unknown>> {
    try {
      const response = await this.apiClient.get('/api/health');
      return response.data;
    } catch (error: unknown) {
      throw new PrivateCreditError(
        `Failed to get system health: ${extractErrorMessage(error)}`,
        'HEALTH_CHECK_FAILED'
      );
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
    return new WebSocket(wsUrl);
  }

  // Utility methods
  setApiKey(apiKey: string): void {
    this.apiClient.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiClient.defaults.baseURL = this.baseUrl;
  }
}