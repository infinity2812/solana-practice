import { Connection, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function listSomeTokenAccounts() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const tempOwner = Keypair.generate();
  const parsed = await connection.getParsedTokenAccountsByOwner(tempOwner.publicKey, { programId: TOKEN_PROGRAM_ID });
  const rawProgramAccounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, { dataSlice: { offset: 0, length: 0 }, filters: [] });
  return { parsedCount: parsed.value.length, rawCount: rawProgramAccounts.length };
}


