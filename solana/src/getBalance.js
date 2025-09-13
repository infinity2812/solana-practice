import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function getTokenBalance(mintAddress, walletAddress) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
  const mint = new PublicKey(mintAddress);
  const wallet = new PublicKey(walletAddress);
  
  const associatedTokenAddress = await getAssociatedTokenAddress(mint, wallet);
  const accountInfo = await getAccount(connection, associatedTokenAddress);
  const balance = Number(accountInfo.amount);
  const decimals = tokenInfo.decimals;
  const formattedBalance = balance / Math.pow(10, decimals);
  
  return {
    balance,
    formattedBalance,
    decimals,
    symbol: tokenInfo.symbol
  };
}

async function getSolBalance(walletAddress) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new PublicKey(walletAddress);
  
  const balance = await connection.getBalance(wallet);
  const solBalance = balance / 1000000000;
  
  return {
    balance,
    solBalance
  };
}

async function getAllBalances(mintAddress, walletAddress) {
  const solInfo = await getSolBalance(walletAddress);
  const tokenInfo = await getTokenBalance(mintAddress, walletAddress);
  
  return {
    sol: solInfo,
    token: tokenInfo
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mintAddress = process.argv[2];
  const walletAddress = process.argv[3];
  
  if (!mintAddress || !walletAddress) {
    process.exit(1);
  }
  
  getAllBalances(mintAddress, walletAddress);
}

export { getTokenBalance, getSolBalance, getAllBalances };
