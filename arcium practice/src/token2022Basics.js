import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
const payerSecret = process.env.PRIVATE_KEY ? new Uint8Array(JSON.parse(process.env.PRIVATE_KEY)) : null;

export async function createToken2022MintAndAta() {
  if (!payerSecret) throw new Error('PRIVATE_KEY not set');
  const payer = Keypair.fromSecretKey(payerSecret);
  const connection = new Connection(rpcUrl, 'confirmed');
  const mint = await createMint(connection, payer, payer.publicKey, null, 9, undefined, undefined, TOKEN_2022_PROGRAM_ID);
  const ownerAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey, undefined, undefined, undefined, TOKEN_2022_PROGRAM_ID);
  const sig = await mintTo(connection, payer, mint, ownerAta.address, payer, 123456789, [], undefined, TOKEN_2022_PROGRAM_ID);
  return { mint, ownerAtaAddress: ownerAta.address, signature: sig };
}


