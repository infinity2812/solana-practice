/**
 * Legacy Token Examples - Refactored
 * 
 * This file demonstrates SPL Token operations by importing
 * from smaller, focused modules instead of having everything in one file.
 */

import {
  createNewMint,
  createTokenAccount,
  mintTokens,
  transferTokens,
  getTokenBalance
} from './legacy/basicOperations.js';

import {
  burnTokens,
  closeTokenAccount,
  setMintAuthority,
  createMintWithCustomDecimals,
  createTokenAccountManually,
  mintTokensManually,
  transferTokensManually,
  createAssociatedTokenAccountManually
} from './legacy/advancedOperations.js';

// Re-export all functions for backward compatibility
export {
  createNewMint,
  createTokenAccount,
  mintTokens,
  transferTokens,
  getTokenBalance,
  burnTokens,
  closeTokenAccount,
  setMintAuthority,
  createMintWithCustomDecimals,
  createTokenAccountManually,
  mintTokensManually,
  transferTokensManually,
  createAssociatedTokenAccountManually
};
