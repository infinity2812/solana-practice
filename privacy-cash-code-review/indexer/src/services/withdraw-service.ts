import { 
  Connection, 
  Keypair, 
  PublicKey, 
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { connection, PROGRAM_ID } from '../config';
import { logger } from '../utils/logger';

// Interface for withdraw parameters
export interface WithdrawParams {
  serializedProof: string;
  treeAccount: string;
  nullifier0PDA: string;
  nullifier1PDA: string;
  commitment0PDA: string;
  commitment1PDA: string;
  treeTokenAccount: string;
  globalConfigAccount: string;
  recipient: string;
  feeRecipientAccount: string;
  extAmount: number;
  encryptedOutput1: string; // Base64 encoded
  encryptedOutput2: string; // Base64 encoded
  fee: number;
  // Address Lookup Table address (required)
  lookupTableAddress: string;
  extraData?: any;
}

// Load the relayer fee payer keypair
function loadRelayerKeypair(): Keypair {
  const keypairPath = path.resolve(__dirname, '../../relayer_fee_payer_keypair.json');
  
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Relayer keypair not found at ${keypairPath}`);
  }
  
  const keypairData = fs.readFileSync(keypairPath, 'utf8');
  const keypairJson = JSON.parse(keypairData);
  
  // Handle both array format and object format
  const secretKey = Array.isArray(keypairJson) ? keypairJson : keypairJson.secretKey;
  
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// Get relayer public key
export function getRelayerPublicKey(): PublicKey {
  try {
    const keypair = loadRelayerKeypair();
    return keypair.publicKey;
  } catch (error) {
    logger.error('Failed to load relayer keypair:', error);
    throw error;
  }
}

// Submit withdraw transaction
export async function submitWithdrawTransaction(params: WithdrawParams): Promise<string> {
  try {
    logger.info('Processing withdraw request:', {
      recipient: params.recipient,
      extAmount: params.extAmount,
      fee: params.fee,
      treeAccount: params.treeAccount,
      serializedProofSize: params.serializedProof.length
    });

    // Load the relayer keypair
    const relayerKeypair = loadRelayerKeypair();
    logger.info('Using relayer:', relayerKeypair.publicKey.toString());

    // Decode the serialized proof from base64
    const serializedProofData = Buffer.from(params.serializedProof, 'base64');
    logger.info(`Decoded instruction data size: ${serializedProofData.length} bytes`);
    
    // Create the withdraw instruction using the same pattern as deposit
    const withdrawInstruction = createWithdrawInstruction(params, serializedProofData);

    // Set compute budget for the transaction (needed for complex transactions)
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
      units: 1_000_000 
    });

    // Always use Address Lookup Table
    logger.info(`Using Address Lookup Table: ${params.lookupTableAddress}`);
    
    // Get the lookup table account
    const lookupTableAccount = await connection.getAddressLookupTable(new PublicKey(params.lookupTableAddress));
    if (!lookupTableAccount.value) {
      throw new Error('Failed to get lookup table account');
    }

    // Create versioned transaction with Address Lookup Table
    const recentBlockhash = await connection.getLatestBlockhash();
    
    const messageV0 = new TransactionMessage({
      payerKey: relayerKeypair.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [modifyComputeUnits, withdrawInstruction],
    }).compileToV0Message([lookupTableAccount.value]);

    const versionedTransaction = new VersionedTransaction(messageV0);
    versionedTransaction.sign([relayerKeypair]);
    
    // Send the versioned transaction
    const signature = await connection.sendTransaction(versionedTransaction);
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
    });
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    logger.info('Withdraw transaction submitted successfully:', signature);
    return signature;

  } catch (error) {
    logger.error('Failed to submit withdraw transaction:', error);
    throw error;
  }
}

// Create withdraw instruction following the same pattern as deposit
function createWithdrawInstruction(
  params: WithdrawParams,
  serializedProofData: Buffer
): TransactionInstruction {
  // Convert string addresses to PublicKeys
  const treeAccount = new PublicKey(params.treeAccount);
  const nullifier0PDA = new PublicKey(params.nullifier0PDA);
  const nullifier1PDA = new PublicKey(params.nullifier1PDA);
  const commitment0PDA = new PublicKey(params.commitment0PDA);
  const commitment1PDA = new PublicKey(params.commitment1PDA);
  const treeTokenAccount = new PublicKey(params.treeTokenAccount);
  const globalConfigAccount = new PublicKey(params.globalConfigAccount);
  const recipient = new PublicKey(params.recipient);
  const feeRecipientAccount = new PublicKey(params.feeRecipientAccount);

  // The serializedProofData contains the full instruction data in the new format:
  // discriminator + proof + extData (without encrypted outputs) + encrypted_output1 + encrypted_output2
  const instructionData = serializedProofData;

  logger.info(`Creating withdraw instruction with data size: ${instructionData.length} bytes`);
  logger.info('Instruction accounts:', {
    treeAccount: treeAccount.toString(),
    nullifier0PDA: nullifier0PDA.toString(),
    nullifier1PDA: nullifier1PDA.toString(),
    commitment0PDA: commitment0PDA.toString(),
    commitment1PDA: commitment1PDA.toString(),
    recipient: recipient.toString(),
    relayer: loadRelayerKeypair().publicKey.toString()
  });

  return new TransactionInstruction({
    keys: [
      { pubkey: treeAccount, isSigner: false, isWritable: true },
      { pubkey: nullifier0PDA, isSigner: false, isWritable: true },
      { pubkey: nullifier1PDA, isSigner: false, isWritable: true },
      { pubkey: commitment0PDA, isSigner: false, isWritable: true },
      { pubkey: commitment1PDA, isSigner: false, isWritable: true },
      { pubkey: treeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: globalConfigAccount, isSigner: false, isWritable: false },
      // recipient
      { pubkey: recipient, isSigner: false, isWritable: true },
      // fee recipient
      { pubkey: feeRecipientAccount, isSigner: false, isWritable: true },
      // signer (relayer instead of user)
      { pubkey: loadRelayerKeypair().publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });
}