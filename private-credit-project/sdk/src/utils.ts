import { PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { PrivateCreditError } from './types';

// Utility functions for the Private Credit SDK

/**
 * Generate a random loan ID
 */
export function generateLoanId(): Uint8Array {
  const keypair = Keypair.generate();
  return keypair.publicKey.toBuffer();
}

/**
 * Generate a random salt for commitments
 */
export function generateSalt(): Uint8Array {
  const keypair = Keypair.generate();
  return keypair.publicKey.toBuffer();
}

/**
 * Calculate commitment hash
 */
export function calculateCommitmentHash(
  data: Uint8Array,
  salt: Uint8Array
): Uint8Array {
  // TODO: Implement proper hash function (e.g., SHA-256)
  const combined = new Uint8Array(data.length + salt.length);
  combined.set(data);
  combined.set(salt, data.length);
  
  // Simple hash for now - in production, use proper cryptographic hash
  return new Uint8Array(32).fill(0);
}

/**
 * Convert basis points to decimal
 */
export function basisPointsToDecimal(bps: number): number {
  return bps / 10000;
}

/**
 * Convert decimal to basis points
 */
export function decimalToBasisPoints(decimal: number): number {
  return Math.round(decimal * 10000);
}

/**
 * Calculate loan-to-value ratio
 */
export function calculateLTV(
  loanAmount: BN,
  collateralValue: BN
): number {
  if (collateralValue.isZero()) {
    return 0;
  }
  
  return loanAmount.mul(new BN(10000)).div(collateralValue).toNumber();
}

/**
 * Calculate debt service coverage ratio
 */
export function calculateDSCR(
  netOperatingIncome: BN,
  totalDebtService: BN
): number {
  if (totalDebtService.isZero()) {
    return 0;
  }
  
  return netOperatingIncome.mul(new BN(10000)).div(totalDebtService).toNumber();
}

/**
 * Calculate interest payment
 */
export function calculateInterestPayment(
  principal: BN,
  interestRateBps: number,
  timePeriod: number // in days
): BN {
  const dailyRate = new BN(interestRateBps).mul(new BN(timePeriod)).div(new BN(36500));
  return principal.mul(dailyRate).div(new BN(10000));
}

/**
 * Calculate NAV per token
 */
export function calculateNavPerToken(
  totalValue: BN,
  totalSupply: BN
): BN {
  if (totalSupply.isZero()) {
    return new BN(1000000); // 1.0 with 6 decimals
  }
  
  return totalValue.mul(new BN(1000000)).div(totalSupply);
}

/**
 * Calculate redemption value
 */
export function calculateRedemptionValue(
  tokenAmount: BN,
  navAtMint: BN,
  currentNav: BN
): BN {
  const baseValue = tokenAmount.mul(navAtMint).div(new BN(1000000));
  const appreciation = currentNav.sub(navAtMint);
  const appreciationValue = tokenAmount.mul(appreciation).div(new BN(1000000));
  
  return baseValue.add(appreciationValue);
}

/**
 * Validate pool configuration
 */
export function validatePoolConfig(config: any): boolean {
  try {
    // Check required fields
    if (!config.maxLoanAmount || !config.minLoanAmount) {
      return false;
    }
    
    if (config.minLoanAmount.gt(config.maxLoanAmount)) {
      return false;
    }
    
    if (config.interestRateBps > 10000) {
      return false;
    }
    
    if (config.managementFeeBps > 10000) {
      return false;
    }
    
    if (config.performanceFeeBps > 10000) {
      return false;
    }
    
    if (config.reserveRatioBps > 10000) {
      return false;
    }
    
    if (config.insuranceRatioBps > 10000) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate loan application
 */
export function validateLoanApplication(application: any): boolean {
  try {
    // Check required fields
    if (!application.amount || !application.interestRateBps || !application.duration) {
      return false;
    }
    
    if (application.amount.isZero()) {
      return false;
    }
    
    if (application.interestRateBps < 0 || application.interestRateBps > 10000) {
      return false;
    }
    
    if (application.duration.isZero()) {
      return false;
    }
    
    if (application.tranche < 0 || application.tranche > 3) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format amount for display
 */
export function formatAmount(amount: BN, decimals: number = 6): string {
  const divisor = new BN(10).pow(new BN(decimals));
  const wholePart = amount.div(divisor);
  const fractionalPart = amount.mod(divisor);
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return wholePart.toString();
  }
  
  return `${wholePart.toString()}.${trimmedFractional}`;
}

/**
 * Parse amount from string
 */
export function parseAmount(amountStr: string, decimals: number = 6): BN {
  const [wholePart, fractionalPart] = amountStr.split('.');
  
  let wholeBN = new BN(wholePart || '0');
  let fractionalBN = new BN(0);
  
  if (fractionalPart) {
    const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
    fractionalBN = new BN(paddedFractional);
  }
  
  const multiplier = new BN(10).pow(new BN(decimals));
  return wholeBN.mul(multiplier).add(fractionalBN);
}

/**
 * Generate random keypair
 */
export function generateKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Derive PDA
 */
export function derivePDA(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

/**
 * Validate public key
 */
export function isValidPublicKey(pubkeyStr: string): boolean {
  try {
    new PublicKey(pubkeyStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert BN to number safely
 */
export function bnToNumber(bn: BN, maxSafeInteger: number = Number.MAX_SAFE_INTEGER): number {
  if (bn.gt(new BN(maxSafeInteger))) {
    throw new PrivateCreditError(
      'BN value exceeds safe integer limit',
      'BN_OVERFLOW'
    );
  }
  
  return bn.toNumber();
}

/**
 * Convert number to BN safely
 */
export function numberToBN(num: number): BN {
  if (!Number.isInteger(num)) {
    throw new PrivateCreditError(
      'Number must be an integer',
      'INVALID_NUMBER'
    );
  }
  
  if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
    throw new PrivateCreditError(
      'Number exceeds safe integer limits',
      'NUMBER_OVERFLOW'
    );
  }
  
  return new BN(num);
}
