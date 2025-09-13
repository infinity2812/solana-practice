import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Transfer tokens from one account to another
 * @param {string} mintAddress - Mint address of the token
 * @param {string} fromAddress - Sender's wallet address
 * @param {string} toAddress - Recipient's wallet address
 * @param {number} amount - Amount to transfer (in smallest unit)
 */
async function transferTokens(mintAddress, fromAddress, toAddress, amount) {
  try {
    console.log('💸 Transferring tokens...');
    
    // Initialize connection
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Load token info
    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
    const mint = new PublicKey(mintAddress);
    const from = new PublicKey(fromAddress);
    const to = new PublicKey(toAddress);
    
    // Create payer keypair
    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    // Get or create associated token accounts
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      from
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      to
    );
    
    console.log(`📤 From token account: ${fromTokenAccount.address.toString()}`);
    console.log(`📥 To token account: ${toTokenAccount.address.toString()}`);
    
    // Check sender balance
    const fromBalance = await getAccount(connection, fromTokenAccount.address);
    const decimals = tokenInfo.decimals;
    const fromBalanceFormatted = Number(fromBalance.amount) / Math.pow(10, decimals);
    const amountFormatted = amount / Math.pow(10, decimals);
    
    console.log(`💰 Sender balance: ${fromBalanceFormatted} ${tokenInfo.symbol}`);
    console.log(`💸 Transfer amount: ${amountFormatted} ${tokenInfo.symbol}`);
    
    if (Number(fromBalance.amount) < amount) {
      throw new Error('Insufficient token balance');
    }
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      from,
      amount
    );
    
    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    
    console.log('📝 Sending transaction...');
    const signature = await connection.sendTransaction(transaction, [payer]);
    
    console.log(`✅ Transfer completed successfully!`);
    console.log(`📝 Transaction signature: ${signature}`);
    
    // Check final balances
    const fromFinalBalance = await getAccount(connection, fromTokenAccount.address);
    const toFinalBalance = await getAccount(connection, toTokenAccount.address);
    
    console.log(`\n📊 Final Balances:`);
    console.log(`   Sender: ${Number(fromFinalBalance.amount) / Math.pow(10, decimals)} ${tokenInfo.symbol}`);
    console.log(`   Recipient: ${Number(toFinalBalance.amount) / Math.pow(10, decimals)} ${tokenInfo.symbol}`);
    
  } catch (error) {
    console.error('❌ Error transferring tokens:', error);
    throw error;
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const fromAddress = process.argv[3];
  const toAddress = process.argv[4];
  const amount = parseInt(process.argv[5]);
  
  if (!mintAddress || !fromAddress || !toAddress || !amount) {
    console.log('Usage: npm run transfer-tokens <mint-address> <from-address> <to-address> <amount>');
    console.log('Example: npm run transfer-tokens 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1 1000000000');
    process.exit(1);
  }
  
  transferTokens(mintAddress, fromAddress, toAddress, amount);
}

export { transferTokens };
