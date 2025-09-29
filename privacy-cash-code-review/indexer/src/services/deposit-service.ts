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

// Interface for deposit parameters
export interface DepositParams {
  signedTransaction: string; // Base64 encoded VersionedTransaction
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

// Relay pre-signed deposit transaction onchain
export async function relayDepositTransaction(params: DepositParams): Promise<string> {
  try {
    logger.info('Relaying pre-signed deposit transaction onchain:', {
      signedTransactionSize: params.signedTransaction.length
    });

    // Decode the pre-signed transaction from base64
    const transactionBuffer = Buffer.from(params.signedTransaction, 'base64');
    const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
    
    logger.info(`Decoded pre-signed transaction, signature count: ${versionedTransaction.signatures.length}`);
    
    // Relay the pre-signed transaction onchain (no additional signing needed)
    const signature = await connection.sendTransaction(versionedTransaction);
    
    // Get the recent blockhash for confirmation
    const recentBlockhash = await connection.getLatestBlockhash();
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
    });
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    logger.info('Pre-signed deposit transaction relayed onchain successfully:', signature);
    return signature;

  } catch (error) {
    logger.error('Failed to relay deposit transaction onchain:', error);
    throw error;
  }
}

// Note: For deposits, we don't need to create instructions on the server side
// The user creates and signs the transaction locally, then sends it to us for relay
