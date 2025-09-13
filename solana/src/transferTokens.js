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

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function transferTokens(mintAddress, fromAddress, toAddress, amount) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
  const mint = new PublicKey(mintAddress);
  const from = new PublicKey(fromAddress);
  const to = new PublicKey(toAddress);
  
  const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
  const payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  
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
  
  const fromBalance = await getAccount(connection, fromTokenAccount.address);
  const decimals = tokenInfo.decimals;
  
  if (Number(fromBalance.amount) < amount) {
    throw new Error('Insufficient token balance');
  }
  
  const transferInstruction = createTransferInstruction(
    fromTokenAccount.address,
    toTokenAccount.address,
    from,
    amount
  );
  
  const transaction = new Transaction().add(transferInstruction);
  const signature = await connection.sendTransaction(transaction, [payer]);
  
  const fromFinalBalance = await getAccount(connection, fromTokenAccount.address);
  const toFinalBalance = await getAccount(connection, toTokenAccount.address);
  
  return {
    signature,
    fromBalance: Number(fromFinalBalance.amount) / Math.pow(10, decimals),
    toBalance: Number(toFinalBalance.amount) / Math.pow(10, decimals),
    symbol: tokenInfo.symbol
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const fromAddress = process.argv[3];
  const toAddress = process.argv[4];
  const amount = parseInt(process.argv[5]);
  
  if (!mintAddress || !fromAddress || !toAddress || !amount) {
    process.exit(1);
  }
  
  transferTokens(mintAddress, fromAddress, toAddress, amount);
}

export { transferTokens };
