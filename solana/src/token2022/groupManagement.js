import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createInitializeMintInstruction as createInitializeMintInstructionV2,
  createInitializeGroupPointerInstruction,
  createInitializeGroupMemberPointerInstruction,
  getGroupPointer,
  getGroupMemberPointer,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token-2022';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Create mint with group pointer extension
 */
export async function createMintWithGroupPointer() {
  console.log('👥 Creating mint with group pointer extension...');

  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  const groupAccount = Keypair.generate();

  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Calculate the space required for the mint
  const extensions = [ExtensionType.GroupPointer];
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

  // Initialize the group pointer
  const initGroupPointerInstruction = createInitializeGroupPointerInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    groupAccount.publicKey, // group account
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initGroupPointerInstruction);

  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);

  console.log(`✅ Mint with group pointer created: ${mint.publicKey.toString()}`);
  console.log(`👥 Group account: ${groupAccount.publicKey.toString()}`);

  // Get the group pointer
  const groupPointer = await getGroupPointer(
    connection,
    mint.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('👥 Group pointer:', groupPointer);

  return { connection, fromWallet, mint: mint.publicKey, groupAccount };
}

/**
 * Create mint with group member pointer extension
 */
export async function createMintWithGroupMemberPointer() {
  console.log('👤 Creating mint with group member pointer extension...');

  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  const memberAccount = Keypair.generate();

  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Calculate the space required for the mint
  const extensions = [ExtensionType.GroupMemberPointer];
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

  // Initialize the group member pointer
  const initGroupMemberPointerInstruction = createInitializeGroupMemberPointerInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    memberAccount.publicKey, // member account
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initGroupMemberPointerInstruction);

  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);

  console.log(`✅ Mint with group member pointer created: ${mint.publicKey.toString()}`);
  console.log(`👤 Member account: ${memberAccount.publicKey.toString()}`);

  // Get the group member pointer
  const groupMemberPointer = await getGroupMemberPointer(
    connection,
    mint.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('👤 Group member pointer:', groupMemberPointer);

  return { connection, fromWallet, mint: mint.publicKey, memberAccount };
}
