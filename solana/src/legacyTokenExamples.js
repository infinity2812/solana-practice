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
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * LEGACY SPL TOKEN EXAMPLES
 * Following the documentation examples exactly
 */

/**
 * Example 1: Create a new mint
 * From: https://spl.solana.com/token#example-creating-a-new-mint
 */
async function createNewMint() {
  console.log('🏗️  Creating a new mint (Legacy SPL Token)...');
  
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
  
  // Create a new mint
  const mint = await createMint(
    connection,
    fromWallet,
    fromWallet.publicKey, // mint authority
    null, // freeze authority (you can use `null` to disable it)
    9 // decimals
  );
  
  console.log(`✅ Mint created: ${mint.toString()}`);
  return { connection, fromWallet, mint };
}

/**
 * Example 2: Create a token account
 * From: https://spl.solana.com/token#example-creating-a-token-account
 */
async function createTokenAccount() {
  console.log('🏦 Creating a token account...');
  
  const { connection, fromWallet, mint } = await createNewMint();
  
  // Create a token account for the from wallet
  const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    fromWallet.publicKey
  );
  
  console.log(`✅ Token account created: ${fromTokenAccount.address.toString()}`);
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Example 3: Mint tokens
 * From: https://spl.solana.com/token#example-minting-tokens
 */
async function mintTokens() {
  console.log('🪙 Minting tokens...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await createTokenAccount();
  
  // Mint 1000 tokens to the from token account
  const signature = await mintTo(
    connection,
    fromWallet,
    mint,
    fromTokenAccount.address,
    fromWallet, // mint authority
    1000 * Math.pow(10, 9) // amount in smallest unit (1000 tokens with 9 decimals)
  );
  
  console.log(`✅ Tokens minted! Signature: ${signature}`);
  
  // Check the balance
  const accountInfo = await getAccount(connection, fromTokenAccount.address);
  console.log(`💰 Token balance: ${accountInfo.amount}`);
  
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Example 4: Transfer tokens
 * From: https://spl.solana.com/token#example-transferring-tokens
 */
async function transferTokens() {
  console.log('💸 Transferring tokens...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokens();
  
  // Generate a new wallet to receive the tokens
  const toWallet = Keypair.generate();
  console.log(`👤 To wallet: ${toWallet.publicKey.toString()}`);
  
  // Create a token account for the to wallet
  const toTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    fromWallet,
    mint,
    toWallet.publicKey
  );
  
  // Transfer 50 tokens
  const signature = await transfer(
    connection,
    fromWallet,
    fromTokenAccount.address,
    toTokenAccount.address,
    fromWallet,
    50 * Math.pow(10, 9) // amount in smallest unit
  );
  
  console.log(`✅ Transfer completed! Signature: ${signature}`);
  
  // Check balances
  const fromAccountInfo = await getAccount(connection, fromTokenAccount.address);
  const toAccountInfo = await getAccount(connection, toTokenAccount.address);
  
  console.log(`💰 From balance: ${fromAccountInfo.amount}`);
  console.log(`💰 To balance: ${toAccountInfo.amount}`);
  
  return { connection, fromWallet, toWallet, mint, fromTokenAccount, toTokenAccount };
}

/**
 * Example 5: Burn tokens
 * From: https://spl.solana.com/token#example-burning-tokens
 */
async function burnTokens() {
  console.log('🔥 Burning tokens...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokens();
  
  // Burn 100 tokens
  const signature = await createBurnInstruction(
    fromTokenAccount.address,
    mint,
    fromWallet.publicKey,
    100 * Math.pow(10, 9) // amount in smallest unit
  );
  
  const transaction = new Transaction().add(signature);
  const burnSignature = await connection.sendTransaction(transaction, [fromWallet]);
  
  console.log(`✅ Tokens burned! Signature: ${burnSignature}`);
  
  // Check the balance
  const accountInfo = await getAccount(connection, fromTokenAccount.address);
  console.log(`💰 Token balance after burn: ${accountInfo.amount}`);
  
  return { connection, fromWallet, mint, fromTokenAccount };
}

/**
 * Example 6: Set authority
 * From: https://spl.solana.com/token#example-setting-authority
 */
async function setAuthority() {
  console.log('🔐 Setting authority...');
  
  const { connection, fromWallet, mint } = await createNewMint();
  
  // Generate a new authority
  const newAuthority = Keypair.generate();
  console.log(`🔑 New authority: ${newAuthority.publicKey.toString()}`);
  
  // Set the new authority
  const signature = await createSetAuthorityInstruction(
    mint,
    fromWallet.publicKey, // current authority
    AuthorityType.MintTokens, // authority type
    newAuthority.publicKey // new authority
  );
  
  const transaction = new Transaction().add(signature);
  const setAuthoritySignature = await connection.sendTransaction(transaction, [fromWallet]);
  
  console.log(`✅ Authority set! Signature: ${setAuthoritySignature}`);
  
  return { connection, fromWallet, mint, newAuthority };
}

/**
 * Example 7: Close account
 * From: https://spl.solana.com/token#example-closing-an-account
 */
async function closeAccount() {
  console.log('🚪 Closing account...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokens();
  
  // Close the token account
  const signature = await createCloseAccountInstruction(
    fromTokenAccount.address,
    fromWallet.publicKey, // destination for remaining SOL
    fromWallet.publicKey // owner of the account
  );
  
  const transaction = new Transaction().add(signature);
  const closeSignature = await connection.sendTransaction(transaction, [fromWallet]);
  
  console.log(`✅ Account closed! Signature: ${closeSignature}`);
  
  return { connection, fromWallet, mint };
}

/**
 * Example 8: Get account info
 * From: https://spl.solana.com/token#example-getting-account-info
 */
async function getAccountInfo() {
  console.log('📊 Getting account info...');
  
  const { connection, fromWallet, mint, fromTokenAccount } = await mintTokens();
  
  // Get mint info
  const mintInfo = await getMint(connection, mint);
  console.log(`🪙 Mint info:`);
  console.log(`   Supply: ${mintInfo.supply}`);
  console.log(`   Decimals: ${mintInfo.decimals}`);
  console.log(`   Mint Authority: ${mintInfo.mintAuthority}`);
  console.log(`   Freeze Authority: ${mintInfo.freezeAuthority}`);
  
  // Get account info
  const accountInfo = await getAccount(connection, fromTokenAccount.address);
  console.log(`🏦 Account info:`);
  console.log(`   Amount: ${accountInfo.amount}`);
  console.log(`   Mint: ${accountInfo.mint}`);
  console.log(`   Owner: ${accountInfo.owner}`);
  console.log(`   Delegate: ${accountInfo.delegate}`);
  console.log(`   State: ${accountInfo.state}`);
  
  return { connection, fromWallet, mint, fromTokenAccount, mintInfo, accountInfo };
}

/**
 * Example 9: Get all token accounts by owner
 * From: https://spl.solana.com/token#example-getting-all-token-accounts-by-owner
 */
async function getAllTokenAccountsByOwner() {
  console.log('🔍 Getting all token accounts by owner...');
  
  const { connection, fromWallet } = await createNewMint();
  
  // Get all token accounts for the owner
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    fromWallet.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  
  console.log(`📊 Found ${tokenAccounts.value.length} token accounts:`);
  tokenAccounts.value.forEach((account, index) => {
    const parsedInfo = account.account.data.parsed.info;
    console.log(`   ${index + 1}. ${account.pubkey.toString()}`);
    console.log(`      Mint: ${parsedInfo.mint}`);
    console.log(`      Amount: ${parsedInfo.tokenAmount.amount}`);
    console.log(`      Decimals: ${parsedInfo.tokenAmount.decimals}`);
  });
  
  return { connection, fromWallet, tokenAccounts };
}

/**
 * Example 10: Get all token accounts by mint
 * From: https://spl.solana.com/token#example-getting-all-token-accounts-by-mint
 */
async function getAllTokenAccountsByMint() {
  console.log('🔍 Getting all token accounts by mint...');
  
  const { connection, mint } = await createNewMint();
  
  // Get all token accounts for the mint
  const tokenAccounts = await connection.getParsedTokenAccountsByMint(
    mint,
    { programId: TOKEN_PROGRAM_ID }
  );
  
  console.log(`📊 Found ${tokenAccounts.value.length} token accounts for mint ${mint.toString()}:`);
  tokenAccounts.value.forEach((account, index) => {
    const parsedInfo = account.account.data.parsed.info;
    console.log(`   ${index + 1}. ${account.pubkey.toString()}`);
    console.log(`      Owner: ${parsedInfo.owner}`);
    console.log(`      Amount: ${parsedInfo.tokenAmount.amount}`);
    console.log(`      Decimals: ${parsedInfo.tokenAmount.decimals}`);
  });
  
  return { connection, mint, tokenAccounts };
}

/**
 * Run all legacy token examples
 */
async function runAllLegacyExamples() {
  console.log('🚀 Running all Legacy SPL Token examples...\n');
  
  try {
    console.log('1️⃣ Creating new mint...');
    await createNewMint();
    
    console.log('\n2️⃣ Creating token account...');
    await createTokenAccount();
    
    console.log('\n3️⃣ Minting tokens...');
    await mintTokens();
    
    console.log('\n4️⃣ Transferring tokens...');
    await transferTokens();
    
    console.log('\n5️⃣ Burning tokens...');
    await burnTokens();
    
    console.log('\n6️⃣ Setting authority...');
    await setAuthority();
    
    console.log('\n7️⃣ Closing account...');
    await closeAccount();
    
    console.log('\n8️⃣ Getting account info...');
    await getAccountInfo();
    
    console.log('\n9️⃣ Getting all token accounts by owner...');
    await getAllTokenAccountsByOwner();
    
    console.log('\n🔟 Getting all token accounts by mint...');
    await getAllTokenAccountsByMint();
    
    console.log('\n✅ All legacy examples completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running legacy examples:', error);
  }
}

// Export all functions
export {
  createNewMint,
  createTokenAccount,
  mintTokens,
  transferTokens,
  burnTokens,
  setAuthority,
  closeAccount,
  getAccountInfo,
  getAllTokenAccountsByOwner,
  getAllTokenAccountsByMint,
  runAllLegacyExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllLegacyExamples();
}
