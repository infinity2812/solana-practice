import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInfinityToken,
  createAssociatedTokenAccount,
  mintInitialSupply,
  getTokenBalance
} from './createToken.js';
import { mintTokens } from './mintTokens.js';
import { transferTokens } from './transferTokens.js';
import { getAllBalances } from './getBalance.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Main application entry point
 */
async function main() {
  try {
    console.log('🌟 Infinity Token - Solana SPL Token Manager\n');
    
    // Initialize connection
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log(`🔗 Connected to: ${RPC_URL}`);
    
    // Check if token already exists
    const fs = await import('fs');
    if (fs.existsSync('token-info.json')) {
      console.log('✅ Token already exists! Loading token information...');
      const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
      console.log(`🪙 Token: ${tokenInfo.name} (${tokenInfo.symbol})`);
      console.log(`📍 Mint: ${tokenInfo.mint}`);
      console.log(`🔢 Decimals: ${tokenInfo.decimals}`);
      
      // Show menu options
      showMenu();
    } else {
      console.log('🆕 No token found. Would you like to create a new Infinity token?');
      console.log('Run: npm run create-token');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

/**
 * Show interactive menu
 */
function showMenu() {
  console.log('\n📋 Available Commands:');
  console.log('1. Create new token: npm run create-token');
  console.log('2. Mint tokens: npm run mint-tokens <mint-address> <recipient-address> <amount>');
  console.log('3. Transfer tokens: npm run transfer-tokens <mint-address> <from-address> <to-address> <amount>');
  console.log('4. Check balance: npm run get-balance <mint-address> <wallet-address>');
  console.log('\n💡 Example usage:');
  console.log('   npm run create-token');
  console.log('   npm run mint-tokens 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 1000000000');
  console.log('   npm run transfer-tokens 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1 500000000');
  console.log('   npm run get-balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
}

/**
 * Utility function to generate a new keypair
 */
function generateKeypair() {
  const keypair = Keypair.generate();
  console.log('🔑 New Keypair Generated:');
  console.log(`Public Key: ${keypair.publicKey.toString()}`);
  console.log(`Private Key: [${Array.from(keypair.secretKey).join(',')}]`);
  console.log('\n💾 Save this private key securely!');
  return keypair;
}

/**
 * Utility function to check network status
 */
async function checkNetworkStatus() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const version = await connection.getVersion();
    const epochInfo = await connection.getEpochInfo();
    
    console.log('🌐 Network Status:');
    console.log(`   RPC: ${RPC_URL}`);
    console.log(`   Version: ${version['solana-core']}`);
    console.log(`   Epoch: ${epochInfo.epoch}`);
    console.log(`   Slot: ${epochInfo.slotIndex}`);
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  main,
  showMenu,
  generateKeypair,
  checkNetworkStatus
};
