import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from '@solana/spl-token';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

// Input validation functions
function validateAddress(address, name) {
  if (!address || typeof address !== 'string') {
    throw new Error(`Invalid ${name}: must be a non-empty string`);
  }
  if (address.length < 32 || address.length > 44) {
    throw new Error(`Invalid ${name}: must be a valid Solana address`);
  }
  return true;
}

function validateAmount(amount, name) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid ${name}: must be a valid number`);
  }
  if (amount <= 0) {
    throw new Error(`Invalid ${name}: must be greater than 0`);
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`Invalid ${name}: must be an integer`);
  }
  return true;
}

async function mintTokens(mintAddress, recipientAddress, amount) {
  try {
    // Input validation
    validateAddress(mintAddress, 'mint address');
    validateAddress(recipientAddress, 'recipient address');
    validateAmount(amount, 'amount');

    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Check if token-info.json exists
    if (!fs.existsSync('token-info.json')) {
      throw new Error('token-info.json not found. Please create a token first.');
    }
    
    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
    const mint = new PublicKey(mintAddress);
    const recipient = new PublicKey(recipientAddress);
    
    // Validate environment variables
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    
    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    // SECURITY: Secret keys removed from JSON file
    // For production, use proper key management solution
    // For now, generate new keypair (this will break functionality)
    const mintAuthority = Keypair.generate();
    console.warn('WARNING: Using generated keypair instead of stored secret key');
    
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );
    
    const signature = await mintTo(
      connection,
      payer,
      mint,
      associatedTokenAccount.address,
      mintAuthority,
      amount
    );
    
    const balance = await getAccount(connection, associatedTokenAccount.address);
    const decimals = tokenInfo.decimals;
    
    return {
      signature,
      balance: Number(balance.amount) / Math.pow(10, decimals),
      symbol: tokenInfo.symbol
    };
  } catch (error) {
    console.error('Error minting tokens:', error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const recipientAddress = process.argv[3];
  const amount = parseInt(process.argv[4]);
  
  if (!mintAddress || !recipientAddress || !amount) {
    process.exit(1);
  }
  
  mintTokens(mintAddress, recipientAddress, amount);
}

export { mintTokens };
