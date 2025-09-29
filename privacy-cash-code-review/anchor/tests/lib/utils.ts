import * as anchor from "@coral-xyz/anchor";
import { utils } from "ffjavascript";
import BN from 'bn.js';
import { Utxo } from './utxo';
import * as borsh from 'borsh';
import { sha256 } from '@ethersproject/sha2';
import { PublicKey } from '@solana/web3.js';

/**
 * Converts an anchor.BN to a byte array of length 32 (big-endian format)
 * @param bn - The anchor.BN to convert
 * @returns A number array representing the bytes
 */
export function bnToBytes(bn: anchor.BN): number[] {
  // Cast the result to number[] since we know the output is a byte array
  return Array.from(
    utils.leInt2Buff(utils.unstringifyBigInts(bn.toString()), 32)
  ).reverse() as number[];
}

/**
 * Mock encryption function - in real implementation this would be proper encryption
 * For testing, we just return a fixed prefix to ensure consistent extDataHash
 * @param value Value to encrypt
 * @returns Encrypted string representation
 */
export function mockEncrypt(value: Utxo): string {
  return JSON.stringify(value);
}

/**
 * Calculates the hash of ext data using Borsh serialization
 * @param extData External data object containing recipient, amount, encrypted outputs, fee, and mint address
 * @returns The hash as a Uint8Array (32 bytes)
 */
export function getExtDataHash(extData: {
  recipient: string | PublicKey;
  extAmount: string | number | BN;
  encryptedOutput1: string | Uint8Array;
  encryptedOutput2: string | Uint8Array;
  fee: string | number | BN;
  mintAddress: string | PublicKey;
}): Uint8Array {
  // Convert all inputs to their appropriate types
  const recipient = extData.recipient instanceof PublicKey 
    ? extData.recipient 
    : new PublicKey(extData.recipient);
  
  const mintAddress = extData.mintAddress instanceof PublicKey 
    ? extData.mintAddress 
    : new PublicKey(extData.mintAddress);
  
  // Convert to BN for proper i64/u64 handling
  const extAmount = new BN(extData.extAmount.toString());
  const fee = new BN(extData.fee.toString());
  
  // Always convert to Buffer
  const encryptedOutput1 = Buffer.from(extData.encryptedOutput1 as any);
  const encryptedOutput2 = Buffer.from(extData.encryptedOutput2 as any);

  // Define the borsh schema matching the Rust struct
  // SECURITY: Including mintAddress creates cryptographic binding between proof and token type
  const schema = {
    struct: {
      recipient: { array: { type: 'u8', len: 32 } },
      extAmount: 'i64',
      encryptedOutput1: { array: { type: 'u8' } },
      encryptedOutput2: { array: { type: 'u8' } },
      fee: 'u64',
      mintAddress: { array: { type: 'u8', len: 32 } },
    }
  };

  const value = {
    recipient: recipient.toBytes(),
    extAmount: extAmount,  // BN instance - Borsh handles it correctly with i64 type
    encryptedOutput1: encryptedOutput1,
    encryptedOutput2: encryptedOutput2,
    fee: fee,  // BN instance - Borsh handles it correctly with u64 type
    mintAddress: mintAddress.toBytes(),
  };
  
  // Serialize with Borsh
  const serializedData = borsh.serialize(schema, value);
  
  // Calculate the SHA-256 hash
  const hashHex = sha256(serializedData);
  // Convert from hex string to Uint8Array
  return Buffer.from(hashHex.slice(2), 'hex');
} 
