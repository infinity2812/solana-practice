import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
  getMint,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  ACCOUNT_SIZE,
  getMinimumBalanceForRentExemptMint,
  getMinimumBalanceForRentExemptAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createCloseAccountInstruction,
  createBurnInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import {
  createInitializeMintInstruction as createInitializeMintInstructionV2,
  createInitializeAccountInstruction as createInitializeAccountInstructionV2,
  createMintToInstruction as createMintToInstructionV2,
  createTransferInstruction as createTransferInstructionV2,
  createCloseAccountInstruction as createCloseAccountInstructionV2,
  createBurnInstruction as createBurnInstructionV2,
  createSetAuthorityInstruction as createSetAuthorityInstructionV2,
  createInitializeTransferHookInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeDefaultAccountStateInstruction,
  createInitializeInterestBearingConfigInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeGroupPointerInstruction,
  createInitializeGroupMemberPointerInstruction,
  createInitializeTokenGroupInstruction,
  createUpdateGroupMaxSizeInstruction,
  createAddMemberToGroupInstruction,
  createRemoveMemberFromGroupInstruction,
  createUpdateGroupMemberInstruction,
  createInitializeTokenMetadataInstruction,
  createUpdateFieldInstruction,
  createUpdateTokenMetadataInstruction,
  createUpdateTokenMetadataPointerInstruction,
  createUpdateTransferHookInstruction,
  createUpdateTransferFeeConfigInstruction,
  createUpdateDefaultAccountStateInstruction,
  createUpdateInterestBearingConfigInstruction,
  createUpdatePermanentDelegateInstruction,
  createUpdateMetadataPointerInstruction,
  createUpdateGroupPointerInstruction,
  createUpdateGroupMemberPointerInstruction,
  createUpdateTokenGroupInstruction,
  createUpdateTokenGroupMemberInstruction,
  createUpdateTokenMetadataPointerInstruction,
  createUpdateTransferHookInstruction as createUpdateTransferHookInstructionV2,
  createUpdateTransferFeeConfigInstruction as createUpdateTransferFeeConfigInstructionV2,
  createUpdateDefaultAccountStateInstruction as createUpdateDefaultAccountStateInstructionV2,
  createUpdateInterestBearingConfigInstruction as createUpdateInterestBearingConfigInstructionV2,
  createUpdatePermanentDelegateInstruction as createUpdatePermanentDelegateInstructionV2,
  createUpdateMetadataPointerInstruction as createUpdateMetadataPointerInstructionV2,
  createUpdateGroupPointerInstruction as createUpdateGroupPointerInstructionV2,
  createUpdateGroupMemberPointerInstruction as createUpdateGroupMemberPointerInstructionV2,
  createUpdateTokenGroupInstruction as createUpdateTokenGroupInstructionV2,
  createUpdateTokenGroupMemberInstruction as createUpdateTokenGroupMemberInstructionV2,
  createUpdateTokenMetadataPointerInstruction as createUpdateTokenMetadataPointerInstructionV2,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  getAccountLen,
  getTransferFeeAmount,
  getTransferFeeConfig,
  getDefaultAccountState,
  getInterestBearingMintConfig,
  getPermanentDelegate,
  getMetadataPointer,
  getGroupPointer,
  getGroupMemberPointer,
  getTokenGroup,
  getTokenGroupMember,
  getTokenMetadata,
  getTransferHook,
  getTransferFeeConfig as getTransferFeeConfigV2,
  getDefaultAccountState as getDefaultAccountStateV2,
  getInterestBearingMintConfig as getInterestBearingMintConfigV2,
  getPermanentDelegate as getPermanentDelegateV2,
  getMetadataPointer as getMetadataPointerV2,
  getGroupPointer as getGroupPointerV2,
  getGroupMemberPointer as getGroupMemberPointerV2,
  getTokenGroup as getTokenGroupV2,
  getTokenGroupMember as getTokenGroupMemberV2,
  getTokenMetadata as getTokenMetadataV2,
  getTransferHook as getTransferHookV2,
} from '@solana/spl-token-2022';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * TOKEN 2022 EXAMPLES
 * Following the documentation examples exactly
 */

/**
 * Example 1: Create a new mint with Token2022
 * From: https://spl.solana.com/token-2022#example-creating-a-new-mint
 */
async function createNewMintV2() {
  console.log('🏗️  Creating a new mint (Token2022)...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Generate a new wallet to hold the mint
  const fromWallet = Keypair.generate();
  console.log(`👤 From wallet: ${fromWallet.publicKey.toString()}`);
  
  // Airdrop some SOL to the wallet
  console.log('💰 Requesting airdrop...');
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Create a new mint with Token2022
  const mint = await createMint(
    connection,
    fromWallet,
    fromWallet.publicKey, // mint authority
    null, // freeze authority (you can use `null` to disable it)
    9, // decimals
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );
  
  console.log(`✅ Mint created: ${mint.toString()}`);
  return { connection, fromWallet, mint };
}

/**
 * Example 2: Create a token account with Token2022
 * From: https://spl.solana.com/token-2022#example-creating-a-token-account
 */
async function createTokenAccountV2() {
  console.log('🏦 Creating a token account (Token2022)...');
  
  const { connection, fromWallet, mint } = await createNewMintV2();
  
  // Create a token account for the from wallet
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    fromWallet.publicKey,
    false, // allowOwnerOffCurve
    'confirmed', // commitment
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );
  
  console.log(`✅ Token account created: ${fromTokenAccount.address.toString()}`);
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Example 3: Mint tokens with Token2022
 * From: https://spl.solana.com/token-2022#example-minting-tokens
 */
async function mintTokensV2() {
  console.log('🪙 Minting tokens (Token2022)...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await createTokenAccountV2();
  
  // Mint 1000 tokens to the from token account
  const signature = await mintTo(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet, // mint authority
    1000 * Math.pow(10, 9), // amount in smallest unit (1000 tokens with 9 decimals)
    [], // multiSigners
    { commitment: 'confirmed' }, // options
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );
  
  console.log(`✅ Tokens minted! Signature: ${signature}`);
  
  // Check the balance
  const accountInfo = await getAccount(connection, fromTokenAccount.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`💰 Token balance: ${accountInfo.amount}`);
  
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Example 4: Transfer tokens with Token2022
 * From: https://spl.solana.com/token-2022#example-transferring-tokens
 */
async function transferTokensV2() {
  console.log('💸 Transferring tokens (Token2022)...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokensV2();
  
  // Generate a new wallet to receive the tokens
  const toWallet = Keypair.generate();
  console.log(`👤 To wallet: ${toWallet.publicKey.toString()}`);
  
  // Create a token account for the to wallet
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    toWallet.publicKey,
    false, // allowOwnerOffCurve
    'confirmed', // commitment
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );
  
  // Transfer 50 tokens
  const signature = await transfer(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet,
    50 * Math.pow(10, 9), // amount in smallest unit
    [], // multiSigners
    { commitment: 'confirmed' }, // options
    TOKEN_2022_PROGRAM_ID // use Token2022 program
  );
  
  console.log(`✅ Transfer completed! Signature: ${signature}`);
  
  // Check balances
  const fromAccountInfo = await getAccount(connection, fromTokenAccount.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
  const toAccountInfo = await getAccount(connection, toTokenAccount.address, 'confirmed', TOKEN_2022_PROGRAM_ID);
  
  console.log(`💰 From balance: ${fromAccountInfo.amount}`);
  console.log(`💰 To balance: ${toAccountInfo.amount}`);
  
  return { connection, fromWallet, toWallet, mint, fromTokenAccount, toTokenAccount };
}

/**
 * Example 5: Create mint with transfer fee extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-transfer-fee-extension
 */
async function createMintWithTransferFee() {
  console.log('💸 Creating mint with transfer fee extension...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  
  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Calculate the space required for the mint
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize the mint with transfer fee
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize the transfer fee config
  const initTransferFeeInstruction = createInitializeTransferFeeConfigInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    fromWallet.publicKey, // withdraw authority
    100, // transfer fee numerator (1%)
    10000, // transfer fee denominator (100%)
    1000000, // maximum fee (0.1 SOL)
    TOKEN_2022_PROGRAM_ID
  );
  
  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initTransferFeeInstruction);
  
  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);
  
  console.log(`✅ Mint with transfer fee created: ${mint.publicKey.toString()}`);
  
  // Get the transfer fee config
  const transferFeeConfig = await getTransferFeeConfig(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`💰 Transfer fee config:`, transferFeeConfig);
  
  return { connection, fromWallet, mint: mint.publicKey };
}

/**
 * Example 6: Create mint with default account state extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-default-account-state-extension
 */
async function createMintWithDefaultAccountState() {
  console.log('🔒 Creating mint with default account state extension...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  
  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Calculate the space required for the mint
  const extensions = [ExtensionType.DefaultAccountState];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize the mint
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize the default account state (frozen)
  const initDefaultAccountStateInstruction = createInitializeDefaultAccountStateInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    'Frozen', // default account state
    TOKEN_2022_PROGRAM_ID
  );
  
  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initDefaultAccountStateInstruction);
  
  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);
  
  console.log(`✅ Mint with default account state created: ${mint.publicKey.toString()}`);
  
  // Get the default account state
  const defaultAccountState = await getDefaultAccountState(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`🔒 Default account state:`, defaultAccountState);
  
  return { connection, fromWallet, mint: mint.publicKey };
}

/**
 * Example 7: Create mint with interest bearing extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-interest-bearing-extension
 */
async function createMintWithInterestBearing() {
  console.log('📈 Creating mint with interest bearing extension...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  
  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Calculate the space required for the mint
  const extensions = [ExtensionType.InterestBearingConfig];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize the mint
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize the interest bearing config
  const initInterestBearingInstruction = createInitializeInterestBearingConfigInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    fromWallet.publicKey, // rate authority
    500, // rate (5% annual interest)
    TOKEN_2022_PROGRAM_ID
  );
  
  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initInterestBearingInstruction);
  
  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);
  
  console.log(`✅ Mint with interest bearing created: ${mint.publicKey.toString()}`);
  
  // Get the interest bearing config
  const interestBearingConfig = await getInterestBearingMintConfig(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`📈 Interest bearing config:`, interestBearingConfig);
  
  return { connection, fromWallet, mint: mint.publicKey };
}

/**
 * Example 8: Create mint with permanent delegate extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-permanent-delegate-extension
 */
async function createMintWithPermanentDelegate() {
  console.log('👑 Creating mint with permanent delegate extension...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  const permanentDelegate = Keypair.generate();
  
  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Calculate the space required for the mint
  const extensions = [ExtensionType.PermanentDelegate];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize the mint
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize the permanent delegate
  const initPermanentDelegateInstruction = createInitializePermanentDelegateInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    permanentDelegate.publicKey, // permanent delegate
    TOKEN_2022_PROGRAM_ID
  );
  
  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initPermanentDelegateInstruction);
  
  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);
  
  console.log(`✅ Mint with permanent delegate created: ${mint.publicKey.toString()}`);
  console.log(`👑 Permanent delegate: ${permanentDelegate.publicKey.toString()}`);
  
  // Get the permanent delegate
  const permanentDelegateInfo = await getPermanentDelegate(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`👑 Permanent delegate info:`, permanentDelegateInfo);
  
  return { connection, fromWallet, mint: mint.publicKey, permanentDelegate };
}

/**
 * Example 9: Create mint with metadata pointer extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-metadata-pointer-extension
 */
async function createMintWithMetadataPointer() {
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
    programId: TOKEN_2022_PROGRAM_ID,
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
  const metadataPointer = await getMetadataPointer(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`📝 Metadata pointer:`, metadataPointer);
  
  return { connection, fromWallet, mint: mint.publicKey, metadataAccount };
}

/**
 * Example 10: Create mint with group pointer extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-group-pointer-extension
 */
async function createMintWithGroupPointer() {
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
    programId: TOKEN_2022_PROGRAM_ID,
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
  const groupPointer = await getGroupPointer(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`👥 Group pointer:`, groupPointer);
  
  return { connection, fromWallet, mint: mint.publicKey, groupAccount };
}

/**
 * Example 11: Create mint with group member pointer extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-group-member-pointer-extension
 */
async function createMintWithGroupMemberPointer() {
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
    programId: TOKEN_2022_PROGRAM_ID,
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
  const groupMemberPointer = await getGroupMemberPointer(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`👤 Group member pointer:`, groupMemberPointer);
  
  return { connection, fromWallet, mint: mint.publicKey, memberAccount };
}

/**
 * Example 12: Create mint with transfer hook extension
 * From: https://spl.solana.com/token-2022#example-creating-a-mint-with-transfer-hook-extension
 */
async function createMintWithTransferHook() {
  console.log('🪝 Creating mint with transfer hook extension...');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const fromWallet = Keypair.generate();
  const transferHookProgramId = Keypair.generate().publicKey; // In practice, this would be a real program
  
  // Airdrop some SOL
  const airdropSignature = await connection.requestAirdrop(
    fromWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  
  // Calculate the space required for the mint
  const extensions = [ExtensionType.TransferHook];
  const mintLen = getMintLen(extensions);
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint account
  const mint = Keypair.generate();
  const mintInstruction = SystemProgram.createAccount({
    fromPubkey: fromWallet.publicKey,
    newAccountPubkey: mint.publicKey,
    space: mintLen,
    lamports: mintRent,
    programId: TOKEN_2022_PROGRAM_ID,
  });
  
  // Initialize the mint
  const initMintInstruction = createInitializeMintInstructionV2(
    mint.publicKey,
    9, // decimals
    fromWallet.publicKey, // mint authority
    null, // freeze authority
    TOKEN_2022_PROGRAM_ID
  );
  
  // Initialize the transfer hook
  const initTransferHookInstruction = createInitializeTransferHookInstruction(
    mint.publicKey,
    fromWallet.publicKey, // mint authority
    transferHookProgramId, // transfer hook program
    TOKEN_2022_PROGRAM_ID
  );
  
  const transaction = new Transaction()
    .add(mintInstruction)
    .add(initMintInstruction)
    .add(initTransferHookInstruction);
  
  const signature = await connection.sendTransaction(transaction, [fromWallet, mint]);
  await connection.confirmTransaction(signature);
  
  console.log(`✅ Mint with transfer hook created: ${mint.publicKey.toString()}`);
  console.log(`🪝 Transfer hook program: ${transferHookProgramId.toString()}`);
  
  // Get the transfer hook
  const transferHook = await getTransferHook(connection, mint.publicKey, 'confirmed', TOKEN_2022_PROGRAM_ID);
  console.log(`🪝 Transfer hook:`, transferHook);
  
  return { connection, fromWallet, mint: mint.publicKey, transferHookProgramId };
}

/**
 * Run all Token2022 examples
 */
async function runAllToken2022Examples() {
  console.log('🚀 Running all Token2022 examples...\n');
  
  try {
    console.log('1️⃣ Creating new mint (Token2022)...');
    await createNewMintV2();
    
    console.log('\n2️⃣ Creating token account (Token2022)...');
    await createTokenAccountV2();
    
    console.log('\n3️⃣ Minting tokens (Token2022)...');
    await mintTokensV2();
    
    console.log('\n4️⃣ Transferring tokens (Token2022)...');
    await transferTokensV2();
    
    console.log('\n5️⃣ Creating mint with transfer fee extension...');
    await createMintWithTransferFee();
    
    console.log('\n6️⃣ Creating mint with default account state extension...');
    await createMintWithDefaultAccountState();
    
    console.log('\n7️⃣ Creating mint with interest bearing extension...');
    await createMintWithInterestBearing();
    
    console.log('\n8️⃣ Creating mint with permanent delegate extension...');
    await createMintWithPermanentDelegate();
    
    console.log('\n9️⃣ Creating mint with metadata pointer extension...');
    await createMintWithMetadataPointer();
    
    console.log('\n🔟 Creating mint with group pointer extension...');
    await createMintWithGroupPointer();
    
    console.log('\n1️⃣1️⃣ Creating mint with group member pointer extension...');
    await createMintWithGroupMemberPointer();
    
    console.log('\n1️⃣2️⃣ Creating mint with transfer hook extension...');
    await createMintWithTransferHook();
    
    console.log('\n✅ All Token2022 examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running Token2022 examples:', error);
  }
}

// Export all functions
export {
  createNewMintV2,
  createTokenAccountV2,
  mintTokensV2,
  transferTokensV2,
  createMintWithTransferFee,
  createMintWithDefaultAccountState,
  createMintWithInterestBearing,
  createMintWithPermanentDelegate,
  createMintWithMetadataPointer,
  createMintWithGroupPointer,
  createMintWithGroupMemberPointer,
  createMintWithTransferHook,
  runAllToken2022Examples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllToken2022Examples();
}
