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

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function mintTokens(mintAddress, recipientAddress, amount) {
  try {
    console.log('Minting tokens...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
    const mint = new PublicKey(mintAddress);
    const recipient = new PublicKey(recipientAddress);
    
    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    const mintAuthority = Keypair.fromSecretKey(
      new Uint8Array(tokenInfo.mintAuthority.secretKey)
    );
    
    const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );
    
    console.log(`Recipient token account: ${associatedTokenAccount.address.toString()}`);
    
    const signature = await mintTo(
      connection,
      payer,
      mint,
      associatedTokenAccount.address,
      mintAuthority,
      amount
    );
    
    console.log(`Tokens minted successfully!`);
    console.log(`Transaction signature: ${signature}`);
    
    const balance = await getAccount(connection, associatedTokenAccount.address);
    const decimals = tokenInfo.decimals;
    console.log(`New balance: ${Number(balance.amount) / Math.pow(10, decimals)} ${tokenInfo.symbol}`);
    
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const recipientAddress = process.argv[3];
  const amount = parseInt(process.argv[4]);
  
  if (!mintAddress || !recipientAddress || !amount) {
    console.log('Usage: npm run mint-tokens <mint-address> <recipient-address> <amount>');
    console.log('Example: npm run mint-tokens 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 1000000000');
    process.exit(1);
  }
  
  mintTokens(mintAddress, recipientAddress, amount);
}

export { mintTokens };
