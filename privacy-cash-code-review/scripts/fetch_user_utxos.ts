import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { EncryptionService } from './utils/encryption';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import { Keypair as UtxoKeypair } from './models/keypair';
import { Utxo } from './models/utxo';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
// @ts-ignore
import * as ffjavascript from 'ffjavascript';

dotenv.config();

// Use type assertion for the utility functions (same pattern as in get_verification_keys.ts)
const utils = ffjavascript.utils as any;
const { unstringifyBigInts, leInt2Buff } = utils;

// Program ID for the zkcash program - same as in deposit script
const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

/**
 * Interface for the UTXO data returned from the API
 */
interface ApiUtxo {
  commitment: string;
  encrypted_output: string; // Hex-encoded encrypted UTXO data
  index: number;
  nullifier?: string; // Optional, might not be present for all UTXOs
}

/**
 * Interface for the API response format that includes count and encrypted_outputs
 */
interface ApiResponse {
  count: number;
  encrypted_outputs: string[];
}

/**
 * Fetch and decrypt all UTXOs for a user
 * @param keypair The user's Solana keypair
 * @param connection Solana connection to fetch on-chain commitment accounts
 * @param apiUrl Optional custom API URL, defaults to 'https://api.privacycash.org/utxos'
 * @returns Array of decrypted UTXOs that belong to the user
 */
export async function getMyUtxos(keypair: Keypair, connection: Connection, apiUrl?: string): Promise<Utxo[]> {
  try {
    // Initialize the light protocol hasher
    const lightWasm = await WasmFactory.getInstance();
    
    // Initialize the encryption service and generate encryption key from the keypair
    const encryptionService = new EncryptionService();
    encryptionService.deriveEncryptionKeyFromWallet(keypair);
    
    // Derive the UTXO keypair from the wallet keypair
    const utxoPrivateKey = encryptionService.deriveUtxoPrivateKey();
    const utxoKeypair = new UtxoKeypair(utxoPrivateKey, lightWasm);
    
    console.log(`Fetching UTXOs for address: ${keypair.publicKey.toBase58()}`);
    
    // Use default API URL if not provided
    const url = apiUrl || 'https://api.privacycash.org/utxos';
    console.log(`Using API endpoint: ${url}`);
    
    // Fetch all UTXOs from the API with retry logic for rate limiting
    let encryptedOutputs: string[] = [];
    
    const maxRetries = 5;
    let retryDelay = 1000; // Start with 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API request attempt ${attempt}/${maxRetries}...`);
        const response = await axios.get(url);
        
        // Log the raw response for debugging
        console.log(`API Response status: ${response.status}`);
        console.log(`Response type: ${typeof response.data}`);
      
        if (!response.data) {
          console.error('API returned empty data');
        } else if (Array.isArray(response.data)) {
          // Handle the case where the API returns an array of UTXOs
          const utxos: ApiUtxo[] = response.data;
          console.log(`Found ${utxos.length} total UTXOs in the system (array format)`);
          
          // Extract encrypted outputs from the array of UTXOs
          encryptedOutputs = utxos
            .filter(utxo => utxo.encrypted_output)
            .map(utxo => utxo.encrypted_output);
        } else if (typeof response.data === 'object' && response.data.encrypted_outputs) {
          // Handle the case where the API returns an object with encrypted_outputs array
          const apiResponse = response.data as ApiResponse;
          encryptedOutputs = apiResponse.encrypted_outputs;
          console.log(`Found ${apiResponse.count} total UTXOs in the system (object format)`);
        } else {
          console.error(`API returned unexpected data format: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
        
        // Log all encrypted outputs line by line
        console.log('\n=== ALL ENCRYPTED OUTPUTS ===');
        encryptedOutputs.forEach((output, index) => {
          console.log(`[${index + 1}] ${output}`);
        });
        console.log(`=== END OF ENCRYPTED OUTPUTS (${encryptedOutputs.length} total) ===\n`);
        
        // Success - break out of retry loop
        break;
        
      } catch (apiError: any) {
        console.log(`API request attempt ${attempt} failed: ${apiError.message}`);
        
        // Check if it's a rate limiting error (429)
        if (apiError.response?.status === 429) {
          if (attempt < maxRetries) {
            console.log(`Server responded with 429 Too Many Requests. Retrying after ${retryDelay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
            continue;
          } else {
            console.error(`Max retries reached. Final error: ${apiError.message}`);
            throw apiError;
          }
        } else {
          // Non-rate-limiting error, throw immediately
          console.error(`API request failed with non-rate-limiting error: ${apiError.message}`);
          throw apiError;
        }
      }
    }
    
    // Try to decrypt each encrypted output
    const myUtxos: Utxo[] = [];
    
    console.log('Attempting to decrypt UTXOs...');
    let decryptionAttempts = 0;
    let successfulDecryptions = 0;
    
    for (let i = 0; i < encryptedOutputs.length; i++) {
      const encryptedOutput = encryptedOutputs[i];
      try {
        if (!encryptedOutput) {
          console.log(`Skipping empty encrypted output at index ${i}`);
          continue;
        }
        
        decryptionAttempts++;
        console.log(`Attempting decryption of encrypted output #${i + 1}...`);
        
        // Try to decrypt the UTXO
        const decryptedUtxo = await encryptionService.decryptUtxo(
          encryptedOutput,
          utxoKeypair,
          lightWasm
        );
        
        // If we got here, decryption succeeded, so this UTXO belongs to the user
        successfulDecryptions++;
        console.log(`✓ Successfully decrypted output #${i + 1}`);
        
        // Get the real index from the on-chain commitment account
        try {
          const commitment = await decryptedUtxo.getCommitment();
          console.log(`Getting real index for commitment: ${commitment}`);
          
          // Convert decimal commitment string to byte array (same format as in proofs)
          const commitmentBytes = Array.from(
            leInt2Buff(unstringifyBigInts(commitment), 32)
          ).reverse() as number[];
          
          // Derive the commitment PDA (could be either commitment0 or commitment1)
          // We'll try both seeds since we don't know which one it is
          let commitmentAccount = null;
          let realIndex = null;
          
          // Try commitment0 seed
          try {
            const [commitment0PDA] = PublicKey.findProgramAddressSync(
              [Buffer.from("commitment0"), Buffer.from(commitmentBytes)],
              PROGRAM_ID
            );
            
            const account0Info = await connection.getAccountInfo(commitment0PDA);
            if (account0Info) {
              // Parse the index from the account data according to CommitmentAccount structure:
              // 0-8: Anchor discriminator
              // 8-40: commitment (32 bytes)  
              // 40-44: encrypted_output length (4 bytes)
              // 44-44+len: encrypted_output data
              // 44+len-52+len: index (8 bytes)
              const encryptedOutputLength = account0Info.data.readUInt32LE(40);
              const indexOffset = 44 + encryptedOutputLength;
              const indexBytes = account0Info.data.slice(indexOffset, indexOffset + 8);
              realIndex = new BN(indexBytes, 'le').toNumber();
              console.log(`Found commitment0 account with index: ${realIndex}`);
            }
          } catch (e) {
            // Try commitment1 seed if commitment0 fails
            try {
              const [commitment1PDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("commitment1"), Buffer.from(commitmentBytes)],
                PROGRAM_ID
              );
              
              const account1Info = await connection.getAccountInfo(commitment1PDA);
              if (account1Info) {
                // Parse the index from the account data according to CommitmentAccount structure
                const encryptedOutputLength = account1Info.data.readUInt32LE(40);
                const indexOffset = 44 + encryptedOutputLength;
                const indexBytes = account1Info.data.slice(indexOffset, indexOffset + 8);
                realIndex = new BN(indexBytes, 'le').toNumber();
                console.log(`Found commitment1 account with index: ${realIndex}`);
              }
            } catch (e2) {
              console.log(`Could not find commitment account for ${commitment}, using encrypted index: ${decryptedUtxo.index}`);
            }
          }
          
          // Update the UTXO with the real index if we found it
          if (realIndex !== null) {
            const oldIndex = decryptedUtxo.index;
            decryptedUtxo.index = realIndex;
            console.log(`Updated UTXO index from ${oldIndex} to ${realIndex}`);
          }
          
        } catch (error: any) {
          console.log(`Failed to get real index for UTXO: ${error.message}`);
        }
        
        // Add to our list of UTXOs
        myUtxos.push(decryptedUtxo);
      } catch (error: any) {
        // Log error but continue - this UTXO doesn't belong to the user
        console.log(`✗ Failed to decrypt output #${i + 1}: ${error.message.split('\n')[0]}`);
        continue;
      }
    }
    
    console.log(`\nDecryption summary: ${successfulDecryptions} successful out of ${decryptionAttempts} attempts`);
    console.log(`Found ${myUtxos.length} UTXOs belonging to your keypair in ${encryptedOutputs.length} total UTXOs`);
    
    return myUtxos;
  } catch (error: any) {
    console.error('Error fetching UTXOs:', error.message);
    return [];
  }
}

/**
 * Check if a UTXO has been spent
 * @param connection Solana connection
 * @param utxo The UTXO to check
 * @returns Promise<boolean> true if spent, false if unspent
 */
export async function isUtxoSpent(connection: Connection, utxo: Utxo): Promise<boolean> {
  const maxRetries = 3;
  let retryDelay = 1000; // Start with 1 second for RPC calls to reduce rate limiting
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get the nullifier for this UTXO
      const nullifier = await utxo.getNullifier();
      console.log(`Checking if UTXO with nullifier ${nullifier} is spent (attempt ${attempt}/${maxRetries})`);
      
      // Convert decimal nullifier string to byte array (same format as in proofs)
      // This matches how commitments are handled and how the Rust code expects the seeds
      const nullifierBytes = Array.from(
        leInt2Buff(unstringifyBigInts(nullifier), 32)
      ).reverse() as number[];
      
      // Try both nullifier0 and nullifier1 seeds since we don't know which one it would use
      let isSpent = false;
      
      // Try nullifier0 seed
      try {
        const [nullifier0PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("nullifier0"), Buffer.from(nullifierBytes)],
          PROGRAM_ID
        );
        
        console.log(`Derived nullifier0 PDA: ${nullifier0PDA.toBase58()}`);
        const nullifier0Account = await connection.getAccountInfo(nullifier0PDA);
        if (nullifier0Account !== null) {
          isSpent = true;
          console.log(`UTXO is spent (nullifier0 account exists)`);
          return isSpent;
        }
      } catch (e) {
        // PDA derivation failed for nullifier0, continue to nullifier1
      }
      
      // Try nullifier1 seed
      try {
        const [nullifier1PDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("nullifier1"), Buffer.from(nullifierBytes)],
          PROGRAM_ID
        );
        
        console.log(`Derived nullifier1 PDA: ${nullifier1PDA.toBase58()}`);
        const nullifier1Account = await connection.getAccountInfo(nullifier1PDA);
        if (nullifier1Account !== null) {
          isSpent = true;
          console.log(`UTXO is spent (nullifier1 account exists)`);
          return isSpent;
        }
      } catch (e) {
        // PDA derivation failed for nullifier1 as well
      }
      
      console.log(`UTXO is unspent (no nullifier accounts found)`);
      return false;
    } catch (error: any) {
      console.log(`Error checking UTXO spent status (attempt ${attempt}): ${error.message}`);
      
      // Check for rate limiting or RPC errors that might be retryable
      const isRetryableError = error.message?.includes('429') || 
                              error.message?.includes('Too Many Requests') ||
                              error.message?.includes('rate limit') ||
                              error.code === 429;
      
      if (isRetryableError && attempt < maxRetries) {
        console.log(`Rate limiting detected. Retrying after ${retryDelay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
        continue;
      } else if (attempt === maxRetries) {
        console.error(`Max retries reached for UTXO spent check. Unable to determine status for UTXO.`);
        throw new Error(`Failed to check UTXO spent status after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  // This should never be reached, but just in case
  return true;
}

/**
 * Sample usage: Load a keypair from file and fetch all UTXOs
 */
async function main() {
  try {
    // Load keypair from script_keypair.json
    let keypair: Keypair;
    
    try {
      // First try to load from script_keypair.json
      const scriptKeypairPath = path.join(__dirname, 'script_keypair.json');
      const keypairJson = JSON.parse(readFileSync(scriptKeypairPath, 'utf-8'));
      keypair = Keypair.fromSecretKey(Uint8Array.from(keypairJson));
      console.log('Using script_keypair.json');
    } catch (err) {
      console.log('Could not load script_keypair.json, falling back to zkcash-keypair.json');
      return;
    }
    
    console.log('Using keypair with public key:', keypair.publicKey.toBase58());
    
    // Check for custom API URL in .env file
    const apiUrl = process.env.UTXO_API_URL;
    
    // Connect to Solana once instead of for each UTXO
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://rorie-6cdtt5-fast-mainnet.helius-rpc.com');
    
    // Fetch all UTXOs for this keypair
    const myUtxos = await getMyUtxos(keypair, connection, apiUrl);
    
    // Display them
    console.log('\nYour UTXOs:');
    if (myUtxos.length === 0) {
      console.log('No UTXOs found for this keypair.');
    } else {
      for (const utxo of myUtxos) {
        await utxo.log();
        
        const isSpent = await isUtxoSpent(connection, utxo);
        console.log(`UTXO status: ${isSpent ? 'SPENT' : 'UNSPENT'}`);
        console.log('------------------------');
      }
    }
    
    console.log(`\nTotal UTXOs found: ${myUtxos.length}`);
    
    // Determine spendable (unspent) balance only
    const spentFlags = await Promise.all(myUtxos.map(u => isUtxoSpent(connection, u)));
    const unspentUtxos = myUtxos.filter((_, idx) => !spentFlags[idx]);
    const totalBalance = unspentUtxos.reduce((sum, utxo) => sum.add(utxo.amount), new BN(0));

    const LAMPORTS_PER_SOL = new BN(1_000_000_000);
    const balanceInSol = totalBalance.div(LAMPORTS_PER_SOL);
    const remainderLamports = totalBalance.mod(LAMPORTS_PER_SOL);
    const balanceInSolWithDecimals = balanceInSol.toNumber() + remainderLamports.toNumber() / 1_000_000_000;

    console.log(`Unspent balance: ${balanceInSolWithDecimals.toFixed(9)} SOL (${unspentUtxos.length} UTXOs)`);
  } catch (error: any) {
    console.error('Error in main function:', error.message);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} 