import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInfinityToken,
  createAssociatedTokenAccount,
  mintInitialSupply,
  getTokenBalance
} from './createToken.js';
import { mintTokens } from './mintTokens.js';
import { transferTokens } from './transferTokens.js';
import { getAllBalances } from './getBalance.js';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const fs = await import('fs');
  
  if (fs.existsSync('token-info.json')) {
    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf8'));
    showMenu();
  }
}

function showMenu() {
  return;
}

function generateKeypair() {
  const keypair = Keypair.generate();
  return keypair;
}

async function checkNetworkStatus() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const version = await connection.getVersion();
  const epochInfo = await connection.getEpochInfo();
  
  return {
    rpc: RPC_URL,
    version: version['solana-core'],
    epoch: epochInfo.epoch,
    slot: epochInfo.slotIndex
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  main,
  showMenu,
  generateKeypair,
  checkNetworkStatus
};
