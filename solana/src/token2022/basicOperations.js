import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
// Legacy imports not used in this file
import {
  createMint as createMintV2,
  getOrCreateAssociatedTokenAccount as getOrCreateAssociatedTokenAccountV2,
  mintTo as mintToV2,
  transfer as transferV2,
  getAccount as getAccountV2,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token-2022';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Create a new mint with Token2022
 */
export async function createNewMintV2() {
  console.log('🏗️  Creating a new mint (Token2022)...');

  const connection = new Connection(RPC_URL, 'confirmed');

  // Generate a new wallet to hold the mint
  const fromWallet = Keypair.generate();
  console.log(`👤 From wallet: ${fromWallet.publicKey.toString()}`);

  // Airdrop some SOL to the wallet
  console.log('💰 Requesting airdrop...');
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Create a new mint with Token2022
  const mint = await createMintV2(
    connection,
    fromWallet,
    fromWallet.publicKey, // mint authority
    null, // freeze authority (you can use `null` to disable it)
    9, // decimals
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );

  console.log(`✅ Mint created: ${mint.toString()}`);
  return { connection, fromWallet, mint };
}

/**
 * Create a token account with Token2022
 */
export async function createTokenAccountV2() {
  console.log('🏦 Creating a token account (Token2022)...');

  const { connection, fromWallet, mint } = await createNewMintV2();

  // Create a token account for the from wallet
  const fromTokenAccount = await getOrCreateAssociatedTokenAccountV2(
    connection,
    fromWallet,
    mint,
    fromWallet.publicKey,
    false, // allowOwnerOffCurve
    'confirmed', // commitment
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );

  console.log(`✅ Token account created: ${fromTokenAccount.address.toString()}`);
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Mint tokens with Token2022
 */
export async function mintTokensV2() {
  console.log('🪙 Minting tokens (Token2022)...');

  const { connection, fromWallet, mint, fromTokenAccount } = await createTokenAccountV2();

  // Mint 1000 tokens to the from token account
  const signature = await mintToV2(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet, // mint authority
    1000 * Math.pow(10, 9), // amount in smallest unit (1000 tokens with 9 decimals)
    [], // multiSigners
    { commitment: 'confirmed' }, // options
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );

  console.log(`✅ Tokens minted! Signature: ${signature}`);

  // Check the balance
  const accountInfo = await getAccountV2(
    connection,
    fromTokenAccount.address,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log(`💰 Token balance: ${accountInfo.amount}`);

  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Transfer tokens with Token2022
 */
export async function transferTokensV2() {
  console.log('💸 Transferring tokens (Token2022)...');

  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokensV2();

  // Generate a new wallet to receive the tokens
  const toWallet = Keypair.generate();
  console.log(`👤 To wallet: ${toWallet.publicKey.toString()}`);

  // Create a token account for the to wallet
  const toTokenAccount = await getOrCreateAssociatedTokenAccountV2(
    connection,
    fromWallet,
    mint,
    toWallet.publicKey,
    false, // allowOwnerOffCurve
    'confirmed', // commitment
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );

  // Transfer 50 tokens
  const signature = await transferV2(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet,
    50 * Math.pow(10, 9), // amount in smallest unit
    [], // multiSigners
    { commitment: 'confirmed' }, // options
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );

  console.log(`✅ Transfer completed! Signature: ${signature}`);

  // Check balances
  const fromAccountInfo = await getAccountV2(
    connection,
    fromTokenAccount.address,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  const toAccountInfo = await getAccountV2(
    connection,
    toTokenAccount.address,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`💰 From balance: ${fromAccountInfo.amount}`);
  console.log(`💰 To balance: ${toAccountInfo.amount}`);

  return { connection, fromWallet, toWallet, mint, fromTokenAccount, toTokenAccount };
}
