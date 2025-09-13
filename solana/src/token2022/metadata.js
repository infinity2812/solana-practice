import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createInitializeMintInstruction as createInitializeMintInstructionV2,
  createInitializeMetadataPointerInstruction,
  getMetadataPointer,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token-2022';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Create mint with metadata pointer extension
 */
export async function createMintWithMetadataPointer() {
  console.log('📝 Creating mint with metadata pointer extension...');

  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  const metadataAccount = Keypair.generate();

  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Calculate the space required for the mint
  const extensions = [ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);

  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID
  });

  // Initialize the mint
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );

  // Initialize the metadata pointer
  const initMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    metadataAccount.publicKey, // metadata account
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initMetadataPointerInstruction);

  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);

  console.log(`✅ Mint with metadata pointer created: ${mint.publicKey.toString()}`);
  console.log(`📝 Metadata account: ${metadataAccount.publicKey.toString()}`);

  // Get the metadata pointer
  const metadataPointer = await getMetadataPointer(
    connection,
    mint.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('📝 Metadata pointer:', metadataPointer);

  return { connection, fromWallet, mint: mint.publicKey, metadataAccount };
}
