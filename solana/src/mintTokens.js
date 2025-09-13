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

async function mintTokens(mintAddress, recipientAddress, amount) {
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
