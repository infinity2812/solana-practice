import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function run() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const keypair = Keypair.generate();

  const airdropSig = await connection.requestAirdrop(keypair.publicKey, 1 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction({ signature: airdropSig, ...(await connection.getLatestBlockhash()) }, 'confirmed');

  const balance = await connection.getBalance(keypair.publicKey);
  console.log('Public Key:', keypair.publicKey.toBase58());
  console.log('Balance (SOL):', balance / LAMPORTS_PER_SOL);
}

run().catch((err) => {
  console.error('Error in basicWeb3:', err);
  process.exit(1);
});


