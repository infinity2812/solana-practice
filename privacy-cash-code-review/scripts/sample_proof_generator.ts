/**
 * Sample Proof Generator
 * 
 * Demonstrates how to use the prover module to generate zero-knowledge proofs
 * with appropriate sample inputs for testing purposes.
 * Based on: https://github.com/tornadocash/tornado-nova
 */

/// <reference path="./types.d.ts" />

import { prove, verify, Proof, parseProofToBytesArray, parseToBytesArray } from './prover/prover';
import BN from 'bn.js';
import * as fs from 'fs';
import * as path from 'path';
import { utils } from 'ffjavascript';
import { MerkleTree } from '../anchor/tests/lib/merkle_tree';
import { Utxo } from './models/utxo';
import { getExtDataHash, mockEncrypt } from './utils/utils';
import { FIELD_SIZE, DEFAULT_TREE_HEIGHT } from './utils/constants';
import { Keypair } from './models/keypair';
import { PublicKey } from '@solana/web3.js';
import { WasmFactory } from '@lightprotocol/hasher.rs';

type Element = string;

/**
 * Generates a sample ZK proof using the main proving method
 * 
 * @param options Optional parameters for the proof generation
 * @returns A promise that resolves to an object containing the proof components and public inputs
 */
async function generateSampleProofForFirstDeposit(): Promise<{
  proof: any;
  publicSignals: any[];
}> {
  // Use provided values or defaults
  const amount1 = '1000000000'; // 1 SOL in lamports
  const amount2 = '100000000';  // 0.5 SOL in lamports
  const blinding1 = new BN('1000000000'); // Use fixed value for consistency
  const blinding2 = new BN('500000000');  // Use fixed value for consistency
  const fee = '100000000'; // Default 0.1 SOL fee
  const recipient = new PublicKey("BxuZn19npE43qkrQycBSb12vgruyD3vLygxwZss7eXLU");

  const lightWasm = await WasmFactory.getInstance();

  // Create the merkle tree with the pre-initialized poseidon hash
  const tree = new MerkleTree(DEFAULT_TREE_HEIGHT, lightWasm, [], {
    zeroElement: 0
  });
  
  // Log the root in decimal
  console.log(`Merkle tree root (decimal): ${tree.root()}`);
  console.log(`Merkle tree root (hex): 0x${BigInt(tree.root()).toString(16)}`);
  
  console.log(`Using amounts: ${amount1}, ${amount2}`);
  console.log(`Using blinding factors: ${blinding1.toString(10).substring(0, 10)}..., ${blinding2.toString(10).substring(0, 10)}...`);

  // Create inputs for the first deposit
  const inputs = [
    new Utxo({ lightWasm }),
    new Utxo({ lightWasm })
  ];

  const pubkeys = await Promise.all(inputs.map(async (x) => await x.keypair.pubkey));
  console.log("!!!!!!pubkeys outside getPubkeyAsync", {pubkeys});

  // Create outputs (UTXOs that are being created)
  const outputAmount = '2900000000'; // Subtract fee
  const outputs = [
    new Utxo({ lightWasm, amount: outputAmount }), // Combined amount minus fee
    new Utxo({ lightWasm, amount: '0' }) // Empty UTXO
  ];

  // Calculate extAmount (amount being deposited or withdrawn)
  // outputs - inputs + fee (same formula as in Tornado Nova)
  const inputsSum = inputs.reduce((sum, x) => sum.add(x.amount), new BN(0))
  const outputsSum = outputs.reduce((sum, x) => sum.add(x.amount), new BN(0))
  const extAmount = new BN(fee)
    .add(outputsSum)
    .sub(inputsSum)
  const publicAmount = new BN(extAmount).sub(new BN(fee)).add(FIELD_SIZE).mod(FIELD_SIZE).toString()

  console.log(`outputsSum: ${outputsSum.toString(10)}, inputsSum: ${inputsSum.toString(10)},
    extAmount: ${extAmount.toString(10)}, publicAmount: ${publicAmount}`);

  // Create mock Merkle path data (normally built from the tree)
  const inputMerklePathIndices = inputs.map((input) => input.index || 0);
  
  // inputMerklePathElements won't be checked for empty utxos. so we need to create a sample full path
  // Create the Merkle paths for each input
  const inputMerklePathElements = inputs.map(() => {
    // Return an array of zero elements as the path for each input
    // Create a copy of the zeroElements array to avoid modifying the original
    return [...new Array(tree.levels).fill(0)];
  });

  // Use the properly calculated Merkle tree root
  const root = tree.root();
  
  // Resolve all async operations before creating the input object
  // Await nullifiers and commitments to get actual values instead of Promise objects
  const inputNullifiers = await Promise.all(inputs.map(x => x.getNullifier()));
  const outputCommitments = await Promise.all(outputs.map(x => x.getCommitment()));
  
  // Create extData structure following Tornado Nova approach
  // See: https://github.com/tornadocash/tornado-nova/blob/f9264eeffe48bf5e04e19d8086ee6ec58cdf0d9e/src/index.js#L61
  const extData = {
    recipient: recipient,
    extAmount: extAmount.toString(10),
    encryptedOutput1: mockEncrypt(outputs[0]),
    encryptedOutput2: mockEncrypt(outputs[1]),
    fee: fee,
    feeRecipient: recipient, // Using recipient as fee recipient for testing
    mintAddress: inputs[0].mintAddress
  };
  
  // Generate extDataHash from the extData structure
  // See: https://github.com/tornadocash/tornado-nova/blob/f9264eeffe48bf5e04e19d8086ee6ec58cdf0d9e/src/index.js#L74
  const extDataHash = await getExtDataHash(extData);
  console.log(`Using extDataHash: ${extDataHash}, with extData: ${JSON.stringify(extData)}`);
  
  // Input structure must match circuit input order exactly
  const input = {
    // Circuit inputs in exact order
    root: root.toString(),
    publicAmount: publicAmount.toString(),
    extDataHash: extDataHash,
    mintAddress: inputs[0].mintAddress,
    
    // Input nullifiers and UTXO data
    inputNullifier: inputNullifiers.map(n => n.toString()),
    inAmount: inputs.map(x => x.amount.toString(10)),
    inPrivateKey: inputs.map(x => typeof x.keypair.privkey === 'string' ? x.keypair.privkey : x.keypair.privkey.toString()),
    inBlinding: inputs.map(x => x.blinding.toString(10)),
    inPathIndices: inputMerklePathIndices.map(idx => idx.toString()),
    inPathElements: inputMerklePathElements.map(path => path.map(el => el.toString())),
    
    // Output commitments and UTXO data
    outputCommitment: outputCommitments.map(c => c.toString()),
    outAmount: outputs.map(x => x.amount.toString(10)),
    outBlinding: outputs.map(x => x.blinding.toString(10)),
    outPubkey: outputs.map(x => typeof x.keypair.pubkey === 'string' ? x.keypair.pubkey : x.keypair.pubkey.toString()),
  };

  // Log the input object structure for debugging after string conversion
  console.log('Input object after string conversion:');
  const stringifiedInput = JSON.stringify(input, null, 2);
  console.log(stringifiedInput);

  // Path to the proving key files (wasm and zkey)
  // Try with both circuits to see which one works
  const keyBasePath = path.resolve(__dirname, '../artifacts/circuits/transaction2');
  
  console.log('Generating proof with inputs structured like Tornado Cash Nova...');
  console.log('Input structure:', Object.keys(input).join(', '));
  
  try {
    // Process the input with our custom preprocessor before passing to the prover
    console.log(`Using circuit files from: ${keyBasePath}`);
    console.log(`Checking files exist: ${fs.existsSync(keyBasePath + '.wasm')}, ${fs.existsSync(keyBasePath + '.zkey')}`);
    
    console.log('Sample input values:');
    console.log('- root:', input.root);
    console.log('- publicAmount:', input.publicAmount);
    console.log('- extDataHash:', input.extDataHash);
    console.log('- inAmount[0]:', input.inAmount[0]);
    console.log('- inPrivateKey[0]:', input.inPrivateKey[0]);
    console.log('- sumIns:', inputs.reduce((sum, x) => sum.add(x.amount), new BN(0)).toString(10));
    console.log('- sumOuts:', outputs.reduce((sum, x) => sum.add(x.amount), new BN(0)).toString(10));
    console.log('- inPathIndices:', input.inPathIndices);
    console.log('- outputCommitment:', input.outputCommitment);
    
    // Use the updated prove function that returns an object with proof components
    const {proof, publicSignals} = await prove(input, keyBasePath);
    
    console.log('Proof generated successfully!');
    console.log('Public signals:');
    publicSignals.forEach((signal, index) => {
      const signalStr = signal.toString();
      let matchedKey = 'unknown';
      
      // Try to identify which input this signal matches
      for (const [key, value] of Object.entries(input)) {
        if (Array.isArray(value)) {
          if (value.some(v => v.toString() === signalStr)) {
            matchedKey = key;
            break;
          }
        } else if (value.toString() === signalStr) {
          matchedKey = key;
          break;
        }
      }
      
      console.log(`[${index}]: ${signal} (${matchedKey})`);
    });
    
    // Try verification with proper field element handling
    const processedPublicSignals = utils.unstringifyBigInts(publicSignals);
    const processedProof = utils.unstringifyBigInts(proof);

    try {
      // First attempt with processed signals
      const res = await verify(path.resolve(__dirname, "../artifacts/circuits/verifyingkey2.json"),
        processedPublicSignals, processedProof);
      console.log('!!!!!!Verification result (with processed signals):', res);

      const proofInBytes = parseProofToBytesArray(proof);
      const inputsInBytes = parseToBytesArray(publicSignals);
      console.log('!!!!!!proofA', {
        proofA: "[" + proofInBytes.proofA.join(', ') + "]",
        proofB: "[" + proofInBytes.proofB.join(', ') + "]",
        proofC: "[" + proofInBytes.proofC.join(', ') + "]",
      });
      console.log('!!!!!!inputsInBytes', inputsInBytes);
      return {proof, publicSignals};
    } catch (error: any) {
      console.error('Verification error:', error.message);
      console.error('This indicates a mismatch between the circuit, prover, and verification key.');
      console.log('You may need to:');
      console.log('1. Recompile the circuit after making changes to transaction2.circom');
      console.log('2. Regenerate the verification key');
      console.log('3. Make sure field element encodings are consistent');
      throw error;
    }
  } catch (error) {
    console.error('Error generating proof:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

async function generateSampleProofForWithdraw(): Promise<{
  proof: any;
  publicSignals: any[];
}> {
  // Use provided values or defaults
  const amount1 = '1000000000'; // 1 SOL in lamports
  const amount2 = '100000000';  // 0.5 SOL in lamports
  const blinding1 = new BN('1000000000'); // Use fixed value for consistency
  const blinding2 = new BN('500000000');  // Use fixed value for consistency
  const fee = '100000000'; // Default 0.1 SOL fee
  const recipient = new PublicKey("BxuZn19npE43qkrQycBSb12vgruyD3vLygxwZss7eXLU"); // Default recipient address
  const lightWasm = await WasmFactory.getInstance();

  // Create the merkle tree with the pre-initialized poseidon hash
  const tree = new MerkleTree(DEFAULT_TREE_HEIGHT, lightWasm, [], {
    zeroElement: 0
  });
  

  // Log the root in decimal
  console.log(`Merkle tree root (decimal): ${tree.root()}`);
  console.log(`Merkle tree root (hex): 0x${BigInt(tree.root()).toString(16)}`);
  
  console.log(`Using amounts: ${amount1}, ${amount2}`);
  console.log(`Using blinding factors: ${blinding1.toString(10).substring(0, 10)}..., ${blinding2.toString(10).substring(0, 10)}...`);

  // Create inputs for the first deposit
  const inputs = [
    new Utxo({ 
      lightWasm,
      amount: new BN(2900000000),
      blinding: new BN(1000000000),
      index: 0,
      keypair: new Keypair("0x0cb0668299bbfc5a53ab4ca18468fd8d2d45b37f5752c5a2291fc66f4f91687a", lightWasm)
    }),
    // second input is empty
    new Utxo({
      lightWasm
    })
  ];

  const inCommitments = [];
  for (const input of inputs) {
    const commitment = await input.getCommitment();
    tree.insert(commitment);
    inCommitments.push(commitment);
  }

  const inputMerklePathIndices = []
  const inputMerklePathElements: Element[][] = []
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    if (input.amount > new BN(0)) {
      const commitment = inCommitments[i]
      input.index = tree.indexOf(commitment)
      if (input.index < 0) {
        throw new Error(`Input commitment ${commitment} was not found`)
      }
      inputMerklePathIndices.push(input.index)
      inputMerklePathElements.push(tree.path(input.index).pathElements)
    } else {
      inputMerklePathIndices.push(0)
      inputMerklePathElements.push(new Array(tree.levels).fill(0))
    }
  }

  const pubkeys = await Promise.all(inputs.map(async (x) => await x.keypair.pubkey));
  console.log("!!!!!!pubkeys outside getPubkeyAsync", {pubkeys});

  // Create outputs (UTXOs that are being created)
  const outputAmount = '1900000000';
  const outputs = [
    new Utxo({ lightWasm, amount: outputAmount }), // Combined amount minus fee
    new Utxo({ lightWasm, amount: '0' }) // Empty UTXO
  ];

  // Calculate extAmount (amount being deposited or withdrawn)
  // outputs - inputs + fee (same formula as in Tornado Nova)
  const inputsSum = inputs.reduce((sum, x) => sum.add(x.amount), new BN(0))
  const outputsSum = outputs.reduce((sum, x) => sum.add(x.amount), new BN(0))
  const extAmount = new BN(fee)
    .add(outputsSum)
    .sub(inputsSum)
  const publicAmount = new BN(extAmount).sub(new BN(fee)).add(FIELD_SIZE).mod(FIELD_SIZE).toString()

  console.log(`outputsSum: ${outputsSum.toString(10)}, inputsSum: ${inputsSum.toString(10)},
    extAmount: ${extAmount.toString(10)}, publicAmount: ${publicAmount}`);

  // Use the properly calculated Merkle tree root
  const root = tree.root();
  
  // Resolve all async operations before creating the input object
  // Await nullifiers and commitments to get actual values instead of Promise objects
  const inputNullifiers = await Promise.all(inputs.map(x => x.getNullifier()));
  const outputCommitments = await Promise.all(outputs.map(x => x.getCommitment()));
  
  // Create extData structure following Tornado Nova approach
  // See: https://github.com/tornadocash/tornado-nova/blob/f9264eeffe48bf5e04e19d8086ee6ec58cdf0d9e/src/index.js#L61
  const extData = {
    recipient: recipient,
    extAmount: extAmount.toString(10),
    encryptedOutput1: mockEncrypt(outputs[0]),
    encryptedOutput2: mockEncrypt(outputs[1]),
    fee: fee,
    feeRecipient: recipient, // Using recipient as fee recipient for testing
    mintAddress: inputs[0].mintAddress
  };
  
  // Generate extDataHash from the extData structure
  // See: https://github.com/tornadocash/tornado-nova/blob/f9264eeffe48bf5e04e19d8086ee6ec58cdf0d9e/src/index.js#L74
  const extDataHash = await getExtDataHash(extData);
  console.log(`Using extDataHash: ${extDataHash}, with extData: ${JSON.stringify(extData)}`);
  
  // Input structure must match circuit input order exactly
  const input = {
    // Circuit inputs in exact order
    root: root.toString(),
    publicAmount: publicAmount.toString(),
    extDataHash: extDataHash,
    mintAddress: inputs[0].mintAddress,
    
    // Input nullifiers and UTXO data
    inputNullifier: inputNullifiers.map(n => n.toString()),
    inAmount: inputs.map(x => x.amount.toString(10)),
    inPrivateKey: inputs.map(x => typeof x.keypair.privkey === 'string' ? x.keypair.privkey : x.keypair.privkey.toString()),
    inBlinding: inputs.map(x => x.blinding.toString(10)),
    inPathIndices: inputMerklePathIndices.map(idx => idx.toString()),
    inPathElements: inputMerklePathElements.map(path => path.map(el => el.toString())),
    
    // Output commitments and UTXO data
    outputCommitment: outputCommitments.map(c => c.toString()),
    outAmount: outputs.map(x => x.amount.toString(10)),
    outBlinding: outputs.map(x => x.blinding.toString(10)),
    outPubkey: outputs.map(x => typeof x.keypair.pubkey === 'string' ? x.keypair.pubkey : x.keypair.pubkey.toString()),
  };

  // Log the input object structure for debugging after string conversion
  console.log('Input object after string conversion:');
  const stringifiedInput = JSON.stringify(input, null, 2);
  console.log(stringifiedInput);

  // Path to the proving key files (wasm and zkey)
  // Try with both circuits to see which one works
  const keyBasePath = path.resolve(__dirname, '../artifacts/circuits/transaction2');
  
  console.log('Generating proof with inputs structured like Tornado Cash Nova...');
  console.log('Input structure:', Object.keys(input).join(', '));
  
  try {
    // Process the input with our custom preprocessor before passing to the prover
    console.log(`Using circuit files from: ${keyBasePath}`);
    console.log(`Checking files exist: ${fs.existsSync(keyBasePath + '.wasm')}, ${fs.existsSync(keyBasePath + '.zkey')}`);
    
    console.log('Sample input values:');
    console.log('- root:', input.root);
    console.log('- publicAmount:', input.publicAmount);
    console.log('- extDataHash:', input.extDataHash);
    console.log('- inAmount[0]:', input.inAmount[0]);
    console.log('- inPrivateKey[0]:', input.inPrivateKey[0]);
    console.log('- sumIns:', inputs.reduce((sum, x) => sum.add(x.amount), new BN(0)).toString(10));
    console.log('- sumOuts:', outputs.reduce((sum, x) => sum.add(x.amount), new BN(0)).toString(10));
    console.log('- inPathIndices:', input.inPathIndices);
    console.log('- outputCommitment:', input.outputCommitment);
    
    // Use the updated prove function that returns an object with proof components
    const {proof, publicSignals} = await prove(input, keyBasePath);
    
    console.log('Proof generated successfully!');
    console.log('Public signals:');
    publicSignals.forEach((signal, index) => {
      const signalStr = signal.toString();
      let matchedKey = 'unknown';
      
      // Try to identify which input this signal matches
      for (const [key, value] of Object.entries(input)) {
        if (Array.isArray(value)) {
          if (value.some(v => v.toString() === signalStr)) {
            matchedKey = key;
            break;
          }
        } else if (value.toString() === signalStr) {
          matchedKey = key;
          break;
        }
      }
      
      console.log(`[${index}]: ${signal} (${matchedKey})`);
    });
    
    // Try verification with proper field element handling
    const processedPublicSignals = utils.unstringifyBigInts(publicSignals);
    const processedProof = utils.unstringifyBigInts(proof);

    try {
      // First attempt with processed signals
      const res = await verify(path.resolve(__dirname, "../artifacts/circuits/verifyingkey2.json"),
        processedPublicSignals, processedProof);
      console.log('!!!!!!Verification result (with processed signals):', res);

      const proofInBytes = parseProofToBytesArray(proof);
      const inputsInBytes = parseToBytesArray(publicSignals);
      console.log('!!!!!!proofA', {
        proofA: "[" + proofInBytes.proofA.join(', ') + "]",
        proofB: "[" + proofInBytes.proofB.join(', ') + "]",
        proofC: "[" + proofInBytes.proofC.join(', ') + "]",
      });
      console.log('!!!!!!inputsInBytes', inputsInBytes);
      return {proof, publicSignals};
    } catch (error: any) {
      console.error('Verification error:', error.message);
      console.error('This indicates a mismatch between the circuit, prover, and verification key.');
      console.log('You may need to:');
      console.log('1. Recompile the circuit after making changes to transaction2.circom');
      console.log('2. Regenerate the verification key');
      console.log('3. Make sure field element encodings are consistent');
      throw error;
    }
  } catch (error) {
    console.error('Error generating proof:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

/**
 * Run the sample proof generator
 */
async function main() {
  try {
    console.log('Starting sample proof generation...');
    // Always use the same values for reproducible proofs
    const options = {
      amount1: '1000000000',
      amount2: '500000000',
      blinding1: '1000000000',
      blinding2: '500000000',
      fee: '100000000',
      recipient: '0x1111111111111111111111111111111111111111',
      relayer: '0x2222222222222222222222222222222222222222'
    };
    console.log('Using fixed inputs for deterministic proofs:', JSON.stringify(options, null, 2));
    
    await generateSampleProofForFirstDeposit();
    await generateSampleProofForWithdraw();
  } catch (error) {
    console.error('Failed to generate proof:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}