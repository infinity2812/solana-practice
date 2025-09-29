import { AddressLookupTableProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';

export async function buildMemoAndAlt() {
  const connection = new Connection(rpcUrl, 'confirmed');
  const payer = Keypair.generate();
  const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  const memoIx = new TransactionInstruction({ keys: [], programId: memoProgram, data: Buffer.from('hello from arcium practice') });

  const [altCreateIx, altAddress] = AddressLookupTableProgram.createLookupTable({ authority: payer.publicKey, payer: payer.publicKey, recentSlot: await connection.getSlot() });
  const extendIx = AddressLookupTableProgram.extendLookupTable({ payer: payer.publicKey, authority: payer.publicKey, lookupTable: altAddress, addresses: [payer.publicKey] });

  const tx = new Transaction().add(altCreateIx, extendIx, memoIx, SystemProgram.nop());
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  return { tx, altAddress };
}


