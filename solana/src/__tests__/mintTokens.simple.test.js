// Simple test file for mintTokens function
import { mintTokens } from '../mintTokens.js';

describe('mintTokens Input Validation', () => {
  // Mock console methods
  const originalConsole = global.console;
  beforeEach(() => {
    global.console = {
      ...originalConsole,
      log: () => {},
      warn: () => {},
      error: () => {}
    };
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  it('should throw error for empty mint address', async () => {
    await expect(mintTokens('', 'valid-recipient', 1000)).rejects.toThrow(
      'Invalid mint address: must be a non-empty string'
    );
  });

  it('should throw error for empty recipient address', async () => {
    const validMint = '11111111111111111111111111111112'; // Valid Solana address length
    await expect(mintTokens(validMint, '', 1000)).rejects.toThrow(
      'Invalid recipient address: must be a non-empty string'
    );
  });

  it('should throw error for negative amount', async () => {
    const validMint = '11111111111111111111111111111112';
    const validRecipient = '11111111111111111111111111111113';
    await expect(mintTokens(validMint, validRecipient, -1000)).rejects.toThrow(
      'Invalid amount: must be greater than 0'
    );
  });

  it('should throw error for zero amount', async () => {
    const validMint = '11111111111111111111111111111112';
    const validRecipient = '11111111111111111111111111111113';
    await expect(mintTokens(validMint, validRecipient, 0)).rejects.toThrow(
      'Invalid amount: must be greater than 0'
    );
  });

  it('should throw error for non-integer amount', async () => {
    const validMint = '11111111111111111111111111111112';
    const validRecipient = '11111111111111111111111111111113';
    await expect(mintTokens(validMint, validRecipient, 1000.5)).rejects.toThrow(
      'Invalid amount: must be an integer'
    );
  });

  it('should throw error for non-number amount', async () => {
    const validMint = '11111111111111111111111111111112';
    const validRecipient = '11111111111111111111111111111113';
    await expect(mintTokens(validMint, validRecipient, '1000')).rejects.toThrow(
      'Invalid amount: must be a valid number'
    );
  });

  it('should throw error for address that is too short', async () => {
    await expect(mintTokens('short', 'valid-recipient', 1000)).rejects.toThrow(
      'Invalid mint address: must be a valid Solana address'
    );
  });

  it('should throw error for address that is too long', async () => {
    const longAddress = 'a'.repeat(50);
    await expect(mintTokens(longAddress, 'valid-recipient', 1000)).rejects.toThrow(
      'Invalid mint address: must be a valid Solana address'
    );
  });
});
