import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_NAME = process.env.TOKEN_NAME || 'Infinity';
const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || 'INF';
const TOKEN_DECIMALS = parseInt(process.env.TOKEN_DECIMALS) || 9;

async function createInfinityToken(connection, payer, name, symbol, decimals) {
  const mintAuthority = Keypair.generate();
  const freezeAuthority = Keypair.generate();
  
  const mint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    freezeAuthority.publicKey,
    decimals,
    TOKEN_PROGRAM_ID
  );
  
  return {
    mint,
    mintAuthority,
    freezeAuthority
  };
}

async function createAssociatedTokenAccount(connection, payer, mint) {
  const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  
  return associatedTokenAccount.address;
}

async function mintInitialSupply(connection, payer, mint, mintAuthority, destination, amount) {
  const signature = await mintTo(
    connection,
    payer,
    mint,
    destination,
    mintAuthority,
    amount
  );
  
  return signature;
}

async function getTokenBalance(connection, tokenAccount) {
  const accountInfo = await getAccount(connection, tokenAccount);
  return Number(accountInfo.amount);
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  
  if (!process.env.PRIVATE_KEY) {
    return;
  }
  
  const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
  const payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  
  const { mint, mintAuthority, freezeAuthority } = await createInfinityToken(
    connection,
    payer,
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_DECIMALS
  );
  
  const tokenAccount = await createAssociatedTokenAccount(connection, payer, mint);
  
  const initialSupply = 1000000 * Math.pow(10, TOKEN_DECIMALS);
  await mintInitialSupply(connection, payer, mint, mintAuthority, tokenAccount, initialSupply);
  
  const tokenInfo = {
    mint: mint.toString(),
    tokenAccount: tokenAccount.toString(),
    mintAuthority: {
      publicKey: mintAuthority.publicKey.toString()
      // SECURITY: Secret keys removed - use proper key management
    },
    freezeAuthority: {
      publicKey: freezeAuthority.publicKey.toString()
      // SECURITY: Secret keys removed - use proper key management
    },
    decimals: TOKEN_DECIMALS,
    symbol: TOKEN_SYMBOL,
    name: TOKEN_NAME
  };
  
  const fs = await import('fs');
  fs.writeFileSync('token-info.json', JSON.stringify(tokenInfo, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  createInfinityToken,
  createAssociatedTokenAccount,
  mintInitialSupply,
  getTokenBalance
};
