import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';
import dotenv from 'dotenv';
import { authorizeTransfer } from './services/arcium.js';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
const payerSecret = process.env.PRIVATE_KEY ? new Uint8Array(JSON.parse(process.env.PRIVATE_KEY)) : null;

async function ensureEnv() {
  if (!payerSecret) throw new Error('PRIVATE_KEY not set');
}

async function main() {
  await ensureEnv();
  const payer = Keypair.fromSecretKey(payerSecret);
  const connection = new Connection(rpcUrl, 'confirmed');

  const recipientStr = process.argv[2] || payer.publicKey.toBase58();
  const recipient = new PublicKey(recipientStr);

  const mint = await createMint(connection, payer, payer.publicKey, null, 9);
  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const recipientAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);

  const amount = 1_000_000n; // 0.001 tokens with 9 decimals
  await mintTo(connection, payer, mint, ownerAta.address, payer, Number(amount));

  const decision = await authorizeTransfer({ owner: payer.publicKey, recipient, mint, amount: Number(amount) });
  if (!decision.approved) throw new Error('Transfer not approved by Arcium');

  const sig = await transfer(connection, payer, ownerAta.address, recipientAta.address, payer, Number(amount));
  console.log('Transfer approved under policy:', decision.policyId);
  console.log('Signature:', sig);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


