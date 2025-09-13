import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com');
const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.PRIVATE_KEY || '[]')));

async function createToken() {
  try {
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      9
    );
    console.log('Token created:', mint.toString());
    return mint;
  } catch (error) {
    console.error('Error creating token:', error);
  }
}

async function getTokenBalance(mint, owner) {
  try {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      owner
    );
    return tokenAccount.address;
  } catch (error) {
    console.error('Error getting token balance:', error);
  }
}

async function mintTokens(mint, destination, amount) {
  try {
    const signature = await mintTo(
      connection,
      payer,
      mint,
      destination,
      payer,
      amount
    );
    console.log('Tokens minted:', signature);
    return signature;
  } catch (error) {
    console.error('Error minting tokens:', error);
  }
}

async function transferTokens(source, destination, amount) {
  try {
    const signature = await transfer(
      connection,
      payer,
      source,
      destination,
      payer,
      amount
    );
    console.log('Tokens transferred:', signature);
    return signature;
  } catch (error) {
    console.error('Error transferring tokens:', error);
  }
}

async function main() {
  console.log('Starting LiteSVM project');
  
  const mint = await createToken();
  if (!mint) return;
  
  const tokenAccount = await getTokenBalance(mint, payer.publicKey);
  if (!tokenAccount) return;
  
  await mintTokens(mint, tokenAccount, 1000000000);
  
  console.log('LiteSVM project completed');
}

main().catch(console.error);
