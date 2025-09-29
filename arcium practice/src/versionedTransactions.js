import { Connection, Keypair, SystemProgram, TransactionMessage, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function buildVersionedTransfer() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const payer = Keypair.generate();
  const recipient = Keypair.generate();
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction({ signature: airdropSig, ...(await connection.getLatestBlockhash()) }, 'confirmed');

  const transferInstruction = SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: recipient.publicKey, lamports: 1000000 });
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: blockhash, instructions: [transferInstruction] }).compileToV0Message();
  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([payer]);
  return { transaction, payerPublicKey: payer.publicKey, recipientPublicKey: recipient.publicKey };
}


