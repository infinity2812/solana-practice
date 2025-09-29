import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function deriveExamplePda() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const payer = Keypair.generate();
  const programId = new PublicKey('11111111111111111111111111111111');
  const seeds = [Buffer.from('vault'), payer.publicKey.toBuffer()];
  const [derivedAddress, bumpSeed] = PublicKey.findProgramAddressSync(seeds, programId);
  const balanceLamports = await connection.getBalance(payer.publicKey);
  return { derivedAddress, bumpSeed, payerPublicKey: payer.publicKey, balanceLamports };
}


