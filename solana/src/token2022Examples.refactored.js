/**
 * Token2022 Examples - Refactored
 * 
 * This file demonstrates various Token2022 features by importing
 * from smaller, focused modules instead of having everything in one file.
 */

import {
  createNewMintV2,
  createTokenAccountV2,
  mintTokensV2,
  transferTokensV2
} from './token2022/basicOperations.js';

import {
  createMintWithTransferFee
} from './token2022/transferFee.js';

import {
  createMintWithMetadataPointer
} from './token2022/metadata.js';

import {
  createMintWithGroupPointer,
  createMintWithGroupMemberPointer
} from './token2022/groupManagement.js';

/**
 * Run all Token2022 examples
 */
export async function runAllToken2022Examples() {
  console.log('🚀 Running all Token2022 examples...\n');
  
  try {
    console.log('1️⃣ Creating new mint (Token2022)...');
    await createNewMintV2();
    
    console.log('\n2️⃣ Creating token account (Token2022)...');
    await createTokenAccountV2();
    
    console.log('\n3️⃣ Minting tokens (Token2022)...');
    await mintTokensV2();
    
    console.log('\n4️⃣ Transferring tokens (Token2022)...');
    await transferTokensV2();
    
    console.log('\n5️⃣ Creating mint with transfer fee extension...');
    await createMintWithTransferFee();
    
    console.log('\n6️⃣ Creating mint with metadata pointer extension...');
    await createMintWithMetadataPointer();
    
    console.log('\n7️⃣ Creating mint with group pointer extension...');
    await createMintWithGroupPointer();
    
    console.log('\n8️⃣ Creating mint with group member pointer extension...');
    await createMintWithGroupMemberPointer();
    
    console.log('\n✅ All Token2022 examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running Token2022 examples:', error);
  }
}

// Export individual functions for testing
export {
  createNewMintV2,
  createTokenAccountV2,
  mintTokensV2,
  transferTokensV2,
  createMintWithTransferFee,
  createMintWithMetadataPointer,
  createMintWithGroupPointer,
  createMintWithGroupMemberPointer
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllToken2022Examples();
}
