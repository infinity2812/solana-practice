import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com');
const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.PRIVATE_KEY || '[]')));

async function testTokenCreation() {
  console.log('Testing token creation');
  
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    6
  );
  
  console.log('Test token mint:', mint.toString());
  
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  
  console.log('Test token account:', tokenAccount.address.toString());
  
  const signature = await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    1000000
  );
  
  console.log('Test mint signature:', signature);
  console.log('Test completed successfully');
}

testTokenCreation().catch(console.error);
