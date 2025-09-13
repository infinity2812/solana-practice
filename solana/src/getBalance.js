import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Get token balance for a specific wallet
 * @param {string} mintAddress - Mint address of the token
 * @param {string} walletAddress - Wallet address to check balance for
 */
async function getTokenBalance(mintAddress, walletAddress) {
  try {
    console.log('💰 Getting token balance...');
    
    // Initialize connection
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Load token info
    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
    const mint = new PublicKey(mintAddress);
    const wallet = new PublicKey(walletAddress);
    
    // Get associated token address
    const associatedTokenAddress = await getAssociatedTokenAddress(mint, wallet);
    console.log(`🏦 Token account: ${associatedTokenAddress.toString()}`);
    
    // Get account info
    const accountInfo = await getAccount(connection, associatedTokenAddress);
    const balance = Number(accountInfo.amount);
    const decimals = tokenInfo.decimals;
    const formattedBalance = balance / Math.pow(10, decimals);
    
    console.log(`✅ Balance: ${formattedBalance} ${tokenInfo.symbol}`);
    console.log(`📊 Raw balance: ${balance} (smallest units)`);
    console.log(`🔢 Decimals: ${decimals}`);
    
    return {
      balance,
      formattedBalance,
      decimals,
      symbol: tokenInfo.symbol
    };
    
  } catch (error) {
    if (error.message.includes('could not find account')) {
      console.log('ℹ️  No token account found for this wallet');
      console.log('💡 The wallet may not have received any tokens yet');
      return {
        balance: 0,
        formattedBalance: 0,
        decimals: tokenInfo?.decimals || 9,
        symbol: tokenInfo?.symbol || 'TOKENS'
      };
    }
    
    console.error('❌ Error getting token balance:', error);
    throw error;
  }
}

/**
 * Get SOL balance for a wallet
 * @param {string} walletAddress - Wallet address to check SOL balance for
 */
async function getSolBalance(walletAddress) {
  try {
    console.log('💰 Getting SOL balance...');
    
    // Initialize connection
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = new PublicKey(walletAddress);
    
    const balance = await connection.getBalance(wallet);
    const solBalance = balance / 1_000_000_000; // Convert lamports to SOL
    
    console.log(`✅ SOL Balance: ${solBalance} SOL`);
    console.log(`📊 Raw balance: ${balance} lamports`);
    
    return {
      balance,
      solBalance
    };
    
  } catch (error) {
    console.error('❌ Error getting SOL balance:', error);
    throw error;
  }
}

/**
 * Get comprehensive balance information
 * @param {string} mintAddress - Mint address of the token
 * @param {string} walletAddress - Wallet address to check balance for
 */
async function getAllBalances(mintAddress, walletAddress) {
  try {
    console.log('🔍 Getting comprehensive balance information...\n');
    
    // Get SOL balance
    console.log('='.repeat(40));
    console.log('SOL BALANCE');
    console.log('='.repeat(40));
    const solInfo = await getSolBalance(walletAddress);
    
    // Get token balance
    console.log('\n' + '='.repeat(40));
    console.log('TOKEN BALANCE');
    console.log('='.repeat(40));
    const tokenInfo = await getTokenBalance(mintAddress, walletAddress);
    
    console.log('\n' + '='.repeat(40));
    console.log('SUMMARY');
    console.log('='.repeat(40));
    console.log(`Wallet: ${walletAddress}`);
    console.log(`SOL: ${solInfo.solBalance} SOL`);
    console.log(`Tokens: ${tokenInfo.formattedBalance} ${tokenInfo.symbol}`);
    
    return {
      sol: solInfo,
      token: tokenInfo
    };
    
  } catch (error) {
    console.error('❌ Error getting balances:', error);
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const walletAddress = process.argv[3];
  
  if (!mintAddress || !walletAddress) {
    console.log('Usage: npm run get-balance <mint-address> <wallet-address>');
    console.log('Example: npm run get-balance 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
    process.exit(1);
  }
  
  getAllBalances(mintAddress, walletAddress);
}

export { getTokenBalance, getSolBalance, getAllBalances };
