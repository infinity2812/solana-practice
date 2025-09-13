import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createCloseAccountInstruction,
  createBurnInstruction,
  createSetAuthorityInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  ACCOUNT_SIZE,
  getMinimumBalanceForRentExemptMint,
  getMinimumBalanceForRentExemptAccount,
  AuthorityType
} from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function burnTokens() {
  // Import getTokenBalance from basicOperations
  const { getTokenBalance } = await import('./basicOperations.js');
  const { connection, fromWallet, mint, fromTokenAccount } = await getTokenBalance();

  const burnAmount = 50 * Math.pow(10, 9);

  const signature = await createBurnInstruction(
    fromTokenAccount.address,
    mint,
    fromWallet.publicKey,
    burnAmount
  );

  const transaction = new Transaction().add(signature);
  const txSignature = await connection.sendTransaction(transaction, [fromWallet]);

  return { connection, fromWallet, mint, fromTokenAccount, signature: txSignature };
}

export async function closeTokenAccount() {
  const { connection, fromWallet, mint, fromTokenAccount } = await burnTokens();

  const closeInstruction = createCloseAccountInstruction(
    fromTokenAccount.address,
    fromWallet.publicKey,
    fromWallet.publicKey
  );

  const transaction = new Transaction().add(closeInstruction);
  const signature = await connection.sendTransaction(transaction, [fromWallet]);

  return { connection, fromWallet, mint, signature };
}

export async function setMintAuthority() {
  const { connection, fromWallet, mint } = await closeTokenAccount();

  const newAuthority = Keypair.generate();

  const setAuthorityInstruction = createSetAuthorityInstruction(
    mint,
    fromWallet.publicKey,
    AuthorityType.MintTokens,
    newAuthority.publicKey
  );

  const transaction = new Transaction().add(setAuthorityInstruction);
  const signature = await connection.sendTransaction(transaction, [fromWallet]);

  return { connection, fromWallet, mint, newAuthority, signature };
}

export async function createMintWithCustomDecimals() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const payer = Keypair.generate();

  const airdropSignature = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSignature);

  const mint = Keypair.generate();
  const decimals = 6;

  const rentExemptionAmount = await getMinimumBalanceForRentExemptMint(connection);

  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports: rentExemptionAmount,
    programId: TOKEN_PROGRAM_ID
  });

  const initializeMintInstruction = createInitializeMintInstruction(
    mint.publicKey,
    decimals,
    payer.publicKey,
    payer.publicKey
  );

  const transaction = new Transaction().add(createAccountInstruction, initializeMintInstruction);

  const signature = await connection.sendTransaction(transaction, [payer, mint]);

  return { connection, payer, mint: mint.publicKey, signature };
}

export async function createTokenAccountManually() {
  const { connection, payer, mint } = await createMintWithCustomDecimals();

  const tokenAccount = Keypair.generate();

  const rentExemptionAmount = await getMinimumBalanceForRentExemptAccount(connection);

  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: tokenAccount.publicKey,
    space: ACCOUNT_SIZE,
    lamports: rentExemptionAmount,
    programId: TOKEN_PROGRAM_ID
  });

  const initializeAccountInstruction = createInitializeAccountInstruction(
    tokenAccount.publicKey,
    mint,
    payer.publicKey
  );

  const transaction = new Transaction().add(createAccountInstruction, initializeAccountInstruction);

  const signature = await connection.sendTransaction(transaction, [payer, tokenAccount]);

  return { connection, payer, mint, tokenAccount: tokenAccount.publicKey, signature };
}

export async function mintTokensManually() {
  const { connection, payer, mint, tokenAccount } = await createTokenAccountManually();

  const amount = 1000 * Math.pow(10, 6);

  const mintToInstruction = createMintToInstruction(mint, tokenAccount, payer.publicKey, amount);

  const transaction = new Transaction().add(mintToInstruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  return { connection, payer, mint, tokenAccount, signature };
}

export async function transferTokensManually() {
  const { connection, payer, mint, tokenAccount } = await mintTokensManually();

  const toWallet = Keypair.generate();
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    toWallet.publicKey
  );

  const transferAmount = 100 * Math.pow(10, 6);

  const transferInstruction = createTransferInstruction(
    tokenAccount,
    toTokenAccount.address,
    payer.publicKey,
    transferAmount
  );

  const transaction = new Transaction().add(transferInstruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  return { connection, payer, toWallet, mint, tokenAccount, toTokenAccount, signature };
}

export async function createAssociatedTokenAccountManually() {
  const { connection, payer, mint } = await transferTokensManually();

  const owner = Keypair.generate();
  const associatedTokenAddress = await getAssociatedTokenAddress(mint, owner.publicKey);

  const createATAInstruction = createAssociatedTokenAccountInstruction(
    payer.publicKey,
    associatedTokenAddress,
    owner.publicKey,
    mint
  );

  const transaction = new Transaction().add(createATAInstruction);
  const signature = await connection.sendTransaction(transaction, [payer]);

  return { connection, payer, owner, mint, associatedTokenAddress, signature };
}
