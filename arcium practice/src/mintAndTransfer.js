import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
const payerSecret = process.env.PRIVATE_KEY ? new Uint8Array(JSON.parse(process.env.PRIVATE_KEY)) : null;

async function run() {
  if (!payerSecret) throw new Error('PRIVATE_KEY not set');
  const payer = Keypair.fromSecretKey(payerSecret);
  const connection = new Connection(rpcUrl, 'confirmed');

  const mintPubkeyStr = process.argv[2];
  const recipientStr = process.argv[3];
  const amount = Number(process.argv[4] || '1000000');
  if (!mintPubkeyStr || !recipientStr) {
    throw new Error('Usage: node src/mintAndTransfer.js <mintPubkey> <recipientPubkey> [amount]');
  }

  const mint = new PublicKey(mintPubkeyStr);
  const recipient = new PublicKey(recipientStr);

  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const recipientAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);

  const mintSig = await mintTo(connection, payer, mint, ownerAta.address, payer, amount);
  console.log('Minted tokens. Sig:', mintSig);

  const transferSig = await transfer(connection, payer, ownerAta.address, recipientAta.address, payer, amount);
  console.log('Transferred tokens. Sig:', transferSig);
}

run().catch((err) => {
  console.error('Error in mintAndTransfer:', err);
  process.exit(1);
});


