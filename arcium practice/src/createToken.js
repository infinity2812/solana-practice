import { Connection, Keypair } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
const payerSecret = process.env.PRIVATE_KEY ? new Uint8Array(JSON.parse(process.env.PRIVATE_KEY)) : null;

async function run() {
  if (!payerSecret) throw new Error('PRIVATE_KEY not set');
  const payer = Keypair.fromSecretKey(payerSecret);
  const connection = new Connection(rpcUrl, 'confirmed');

  const mint = await createMint(connection, payer, payer.publicKey, null, 9);
  console.log('Created mint:', mint.toBase58());
}

run().catch((err) => {
  console.error('Error in createToken:', err);
  process.exit(1);
});


