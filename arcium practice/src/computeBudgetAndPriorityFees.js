import { ComputeBudgetProgram, Connection, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function buildPriorityFeeTransaction() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const payer = Keypair.generate();
  const recipient = Keypair.generate();

  const airdrop = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction({ signature: airdrop, ...(await connection.getLatestBlockhash()) }, 'confirmed');

  const cuLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 });
  const cuPriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 });
  const transferIx = SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient.publicKey, lamports: 5000 });

  const tx = new Transaction().add(cuLimitIx, cuPriceIx, transferIx);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  return { tx, payerPublicKey: payer.publicKey, recipientPublicKey: recipient.publicKey };
}


