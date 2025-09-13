import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createInitializeMintInstruction as createInitializeMintInstructionV2,
  createInitializeTransferFeeConfigInstruction,
  getTransferFeeConfig,
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token-2022';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

/**
 * Create mint with transfer fee extension
 */
export async function createMintWithTransferFee() {
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
    programId: TOKEN_2022_PROGRAM_ID
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
  const transferFeeConfig = await getTransferFeeConfig(
    connection,
    mint.publicKey,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );
  console.log('💰 Transfer fee config:', transferFeeConfig);

  return { connection, fromWallet, mint: mint.publicKey };
}
