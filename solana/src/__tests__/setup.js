// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: global.jest ? global.jest.fn() : () => {},
  warn: global.jest ? global.jest.fn() : () => {},
  error: global.jest ? global.jest.fn() : () => {},
  info: global.jest ? global.jest.fn() : () => {},
  debug: global.jest ? global.jest.fn() : () => {}
};

// Set test timeout
if (global.jest) {
  global.jest.setTimeout(30000);
}

// Mock file system operations for tests
if (global.jest) {
  global.jest.mock('fs', () => ({
    existsSync: global.jest.fn(),
    readFileSync: global.jest.fn(),
    writeFileSync: global.jest.fn()
  }));
}

// Global test utilities
global.testUtils = {
  createMockKeypair: () => ({
    publicKey: { toString: () => 'mock-public-key' },
    secretKey: new Uint8Array(64)
  }),

  createMockConnection: () => ({
    getVersion: global.jest
      ? global.jest.fn().mockResolvedValue({ 'solana-core': '1.0.0' })
      : () => Promise.resolve({ 'solana-core': '1.0.0' }),
    getEpochInfo: global.jest
      ? global.jest.fn().mockResolvedValue({ epoch: 0, slotIndex: 0 })
      : () => Promise.resolve({ epoch: 0, slotIndex: 0 }),
    getBalance: global.jest
      ? global.jest.fn().mockResolvedValue(1000000000)
      : () => Promise.resolve(1000000000),
    requestAirdrop: global.jest
      ? global.jest.fn().mockResolvedValue('mock-signature')
      : () => Promise.resolve('mock-signature'),
    confirmTransaction: global.jest
      ? global.jest.fn().mockResolvedValue({ value: { err: null } })
      : () => Promise.resolve({ value: { err: null } })
  }),

  createMockTokenInfo: () => ({
    mint: 'mock-mint-address',
    tokenAccount: 'mock-token-account',
    mintAuthority: {
      publicKey: 'mock-mint-authority-public-key'
    },
    freezeAuthority: {
      publicKey: 'mock-freeze-authority-public-key'
    },
    decimals: 9,
    symbol: 'TEST',
    name: 'Test Token'
  })
};
