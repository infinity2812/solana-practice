import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  getMint
} from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function createNewMint() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();

  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9);

  return { connection, fromWallet, mint };
}

export async function createTokenAccount() {
  const { connection, fromWallet, mint } = await createNewMint();

  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    fromWallet.publicKey
  );

  return { connection, fromWallet, mint, fromTokenAccount };
}

export async function mintTokens() {
  const { connection, fromWallet, mint, fromTokenAccount } = await createTokenAccount();

  const amount = 1000 * Math.pow(10, 9);

  const signature = await mintTo(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet,
    amount
  );

  return { connection, fromWallet, mint, fromTokenAccount, signature };
}

export async function transferTokens() {
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokens();

  const toWallet = Keypair.generate();
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    toWallet.publicKey
  );

  const transferAmount = 100 * Math.pow(10, 9);

  const signature = await transfer(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet,
    transferAmount
  );

  return { connection, fromWallet, toWallet, mint, fromTokenAccount, toTokenAccount, signature };
}

export async function getTokenBalance() {
  const { connection, fromWallet, mint, fromTokenAccount } = await transferTokens();

  const accountInfo = await getAccount(connection, fromTokenAccount.address);
  const mintInfo = await getMint(connection, mint);

  return {
    connection,
    fromWallet,
    mint,
    fromTokenAccount,
    balance: Number(accountInfo.amount),
    decimals: mintInfo.decimals,
    supply: Number(mintInfo.supply)
  };
}
