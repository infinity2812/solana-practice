import { Connection, Keypair, PublicKey, TransactionInstruction, SystemProgram, ComputeBudgetProgram, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import BN from 'bn.js';
import { readFileSync } from 'fs';
import { Utxo } from './models/utxo';
import { getExtDataHash } from './utils/utils';
import { prove, parseProofToBytesArray, parseToBytesArray } from './utils/prover';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import { MerkleTree } from './utils/merkle_tree';
import { EncryptionService } from './utils/encryption';
import { Keypair as UtxoKeypair } from './models/keypair';
import { getMyUtxos, isUtxoSpent } from './fetch_user_utxos';
import { FIELD_SIZE, FEE_RECIPIENT_ACCOUNT, DEFAULT_TREE_HEIGHT } from './utils/constants';
import { calculateDepositFee } from './utils/utils';
import { useExistingALT } from './utils/address_lookup_table';

dotenv.config();

// Constants
const DEPOSIT_AMOUNT = 80_000_000; // 0.08 SOL in lamports
const FEE_AMOUNT = calculateDepositFee(DEPOSIT_AMOUNT); // Calculate fee based on deposit amount
const TRANSACT_IX_DISCRIMINATOR = Buffer.from([217, 149, 130, 143, 221, 52, 252, 119]);
const CIRCUIT_PATH = path.resolve(__dirname, '../artifacts/circuits/transaction2');

// Indexer API endpoint
const INDEXER_API_URL = 'https://api.privacycash.org/';

// Load user keypair from script_keypair.json
const userKeypairJson = JSON.parse(readFileSync(path.join(__dirname, 'script_keypair.json'), 'utf-8'));
const user = Keypair.fromSecretKey(Uint8Array.from(userKeypairJson));

// Program ID for the zkcash program
const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

// Configure connection to Solana mainnet-beta
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Function to query remote tree state from indexer API
async function queryRemoteTreeState(): Promise<{ root: string, nextIndex: number }> {
  try {
    console.log('Fetching Merkle root and nextIndex from API...');
    const response = await fetch(`${INDEXER_API_URL}/merkle/root`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Merkle root and nextIndex: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { root: string, nextIndex: number };
    console.log(`Fetched root from API: ${data.root}`);
    console.log(`Fetched nextIndex from API: ${data.nextIndex}`);
    return data;
  } catch (error) {
    console.error('Failed to fetch root and nextIndex from API:', error);
    throw error;
  }
}

// Function to fetch Merkle proof from API for a given commitment
async function fetchMerkleProof(commitment: string): Promise<{ pathElements: string[], pathIndices: number[] }> {
  try {
    console.log(`Fetching Merkle proof for commitment: ${commitment}`);
    const response = await fetch(`${INDEXER_API_URL}/merkle/proof/${commitment}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Merkle proof: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { pathElements: string[], pathIndices: number[] };
    console.log(`✓ Fetched Merkle proof with ${data.pathElements.length} elements`);
    return data;
  } catch (error) {
    console.error(`Failed to fetch Merkle proof for commitment ${commitment}:`, error);
    throw error;
  }
}

// Find nullifier PDAs for the given proof
function findNullifierPDAs(proof: any) {
  const [nullifier0PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier0"), Buffer.from(proof.inputNullifiers[0])],
    PROGRAM_ID
  );
  
  const [nullifier1PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier1"), Buffer.from(proof.inputNullifiers[1])],
    PROGRAM_ID
  );
  
  return { nullifier0PDA, nullifier1PDA };
}

// Find commitment PDAs for the given proof
function findCommitmentPDAs(proof: any) {
  const [commitment0PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("commitment0"), Buffer.from(proof.outputCommitments[0])],
    PROGRAM_ID
  );
  
  const [commitment1PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("commitment1"), Buffer.from(proof.outputCommitments[1])],
    PROGRAM_ID
  );
  
  return { commitment0PDA, commitment1PDA };
}

// Function to serialize proof and extData (same as deposit script format)
function serializeProofAndExtData(proof: any, extData: any) {
  // Create the ExtData object for the program call (WITHOUT encrypted outputs)
  const extDataForProgram = {
    recipient: extData.recipient,
    extAmount: extData.extAmount,
    fee: extData.fee,
    feeRecipient: extData.feeRecipient,
    mintAddress: extData.mintAddress
  };

  // Use the same serialization approach as deposit script
  const instructionData = Buffer.concat([
    TRANSACT_IX_DISCRIMINATOR,
    // Serialize proof
    Buffer.from(proof.proofA),
    Buffer.from(proof.proofB),
    Buffer.from(proof.proofC),
    Buffer.from(proof.root),
    Buffer.from(proof.publicAmount),
    Buffer.from(proof.extDataHash),
    Buffer.from(proof.inputNullifiers[0]),
    Buffer.from(proof.inputNullifiers[1]),
    Buffer.from(proof.outputCommitments[0]),
    Buffer.from(proof.outputCommitments[1]),
    // Serialize ExtData (without encrypted outputs)
    extDataForProgram.recipient.toBuffer(),
    Buffer.from(new BN(extDataForProgram.extAmount).toTwos(64).toArray('le', 8)),
    Buffer.from(new BN(extDataForProgram.fee).toArray('le', 8)),
    extDataForProgram.feeRecipient.toBuffer(),
    new PublicKey(extDataForProgram.mintAddress).toBuffer(),
    // Serialize encrypted outputs as separate parameters
    Buffer.from(new BN(extData.encryptedOutput1.length).toArray('le', 4)),
    extData.encryptedOutput1,
    Buffer.from(new BN(extData.encryptedOutput2.length).toArray('le', 4)),
    extData.encryptedOutput2,
  ]);
  
  return instructionData;
}

// Function to relay pre-signed deposit transaction to indexer backend
async function relayDepositToIndexer(signedTransaction: string): Promise<string> {
  try {
    console.log('Relaying pre-signed deposit transaction to indexer backend...');
    
    const params = {
      signedTransaction
    };
    
    const response = await fetch(`${INDEXER_API_URL}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new Error(`Deposit relay failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json() as { signature: string, success: boolean };
    console.log('Pre-signed deposit transaction relayed successfully!');
    console.log('Response:', result);
    
    return result.signature;
  } catch (error) {
    console.error('Failed to relay deposit transaction to indexer:', error);
    throw error;
  }
}

async function main() {
  try {
    // Initialize the light protocol hasher
    const lightWasm = await WasmFactory.getInstance();
    
    // Initialize the encryption service
    const encryptionService = new EncryptionService();
    
    // Generate encryption key from the user keypair
    encryptionService.deriveEncryptionKeyFromWallet(user);
    console.log('Encryption key generated from user keypair');
    console.log(`User wallet: ${user.publicKey.toString()}`);
    console.log(`Deposit amount: ${DEPOSIT_AMOUNT} lamports (${DEPOSIT_AMOUNT / 1e9} SOL)`);
    console.log(`Calculated fee: ${FEE_AMOUNT} lamports (${FEE_AMOUNT / 1e9} SOL)`);
    
    // Check wallet balance
    const balance = await connection.getBalance(user.publicKey);
    console.log(`Wallet balance: ${balance / 1e9} SOL`);

    if (balance < DEPOSIT_AMOUNT + FEE_AMOUNT) {
      console.error(`Insufficient balance: ${balance / 1e9} SOL. Need at least ${(DEPOSIT_AMOUNT + FEE_AMOUNT) / 1e9} SOL.`);
      return;
    }
    
    // Derive PDA (Program Derived Addresses) for the tree account and other required accounts
    const [treeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('merkle_tree')],
      PROGRAM_ID
    );

    const [treeTokenAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('tree_token')],
      PROGRAM_ID
    );

    const [globalConfigAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_config')],
      PROGRAM_ID
    );

    // Fee recipient is now a specific account for receiving fees
    const feeRecipientAccount = FEE_RECIPIENT_ACCOUNT;

    console.log('Using PDAs:');
    console.log(`Tree Account: ${treeAccount.toString()}`);
    console.log(`Tree Token Account: ${treeTokenAccount.toString()}`);
    console.log(`Global Config Account: ${globalConfigAccount.toString()}`);
    console.log(`Fee Recipient Account (regular account): ${feeRecipientAccount.toString()}`);

    // Create the merkle tree with the pre-initialized poseidon hash
    const tree = new MerkleTree(DEFAULT_TREE_HEIGHT, lightWasm);

    // Initialize root and nextIndex variables
    let root: string;
    let currentNextIndex: number;

    try {
      const data = await queryRemoteTreeState();
      root = data.root;
      currentNextIndex = data.nextIndex;
    } catch (error) {
      console.error('Failed to fetch root and nextIndex from API, exiting');
      return; // Return early without a fallback
    }

    console.log(`Using tree root: ${root}`);
    console.log(`New UTXOs will be inserted at indices: ${currentNextIndex} and ${currentNextIndex + 1}`);

    // Generate a deterministic private key derived from the wallet keypair
    const utxoPrivateKey = encryptionService.deriveUtxoPrivateKey();
    
    // Create a UTXO keypair that will be used for all inputs and outputs
    const utxoKeypair = new UtxoKeypair(utxoPrivateKey, lightWasm);
    console.log('Using wallet-derived UTXO keypair for deposit');

    // Fetch existing UTXOs for this user
    console.log('\nFetching existing UTXOs...');
    const allUtxos = await getMyUtxos(user, connection);
    console.log(`Found ${allUtxos.length} total UTXOs`);
    
    // Filter out zero-amount UTXOs (dummy UTXOs that can't be spent)
    const nonZeroUtxos = allUtxos.filter(utxo => utxo.amount.gt(new BN(0)));
    console.log(`Found ${nonZeroUtxos.length} non-zero UTXOs`);
    
    // Check which non-zero UTXOs are unspent (sequentially to avoid rate limiting)
    console.log('Checking which UTXOs are unspent...');
    const utxoSpentStatuses: boolean[] = [];
    for (let i = 0; i < nonZeroUtxos.length; i++) {
      const isSpent = await isUtxoSpent(connection, nonZeroUtxos[i]);
      utxoSpentStatuses.push(isSpent);
      
      // Add a longer delay between checks to prevent rate limiting
      if (i < nonZeroUtxos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    // Filter to only include unspent UTXOs
    const existingUnspentUtxos = nonZeroUtxos.filter((utxo, index) => !utxoSpentStatuses[index]);
    console.log(`Found ${existingUnspentUtxos.length} unspent UTXOs available for spending`);

    // Calculate output amounts and external amount based on scenario
    let extAmount: number;
    let outputAmount: string;
    
    // Create inputs based on whether we have existing UTXOs
    let inputs: Utxo[];
    let inputMerklePathIndices: number[];
    let inputMerklePathElements: string[][];

    if (existingUnspentUtxos.length === 0) {
      // Scenario 1: Fresh deposit with dummy inputs - add new funds to the system
      extAmount = DEPOSIT_AMOUNT;
      outputAmount = new BN(DEPOSIT_AMOUNT).sub(new BN(FEE_AMOUNT)).toString();
      
      console.log(`Fresh deposit scenario (no existing UTXOs):`);
      console.log(`External amount (deposit): ${extAmount}`);
      console.log(`Fee amount: ${FEE_AMOUNT}`);
      console.log(`Output amount: ${outputAmount}`);
      
      // Use two dummy UTXOs as inputs
      inputs = [
        new Utxo({ 
          lightWasm,
          keypair: utxoKeypair
        }),
        new Utxo({ 
          lightWasm,
          keypair: utxoKeypair
        })
      ];
      
      // Both inputs are dummy, so use mock indices and zero-filled Merkle paths
      inputMerklePathIndices = inputs.map((input) => input.index || 0);
      inputMerklePathElements = inputs.map(() => {
        return [...new Array(tree.levels).fill("0")];
      });
    } else {
      // Scenario 2: Deposit that consolidates with existing UTXO(s)
      const firstUtxo = existingUnspentUtxos[0];
      const firstUtxoAmount = firstUtxo.amount;
      const secondUtxoAmount = existingUnspentUtxos.length > 1 ? existingUnspentUtxos[1].amount : new BN(0);
      extAmount = DEPOSIT_AMOUNT; // Still depositing new funds
      
      // Output combines existing UTXO amounts + new deposit amount - fee
      outputAmount = firstUtxoAmount.add(secondUtxoAmount).add(new BN(DEPOSIT_AMOUNT)).sub(new BN(FEE_AMOUNT)).toString();
      
      console.log(`Deposit with consolidation scenario:`);
      console.log(`First existing UTXO amount: ${firstUtxoAmount.toString()}`);
      if (secondUtxoAmount.gt(new BN(0))) {
        console.log(`Second existing UTXO amount: ${secondUtxoAmount.toString()}`);
      }
      console.log(`New deposit amount: ${DEPOSIT_AMOUNT}`);
      console.log(`Fee amount: ${FEE_AMOUNT}`);
      console.log(`Output amount (existing UTXOs + deposit - fee): ${outputAmount}`);
      console.log(`External amount (deposit): ${extAmount}`);
      
      console.log('\nFirst UTXO to be consolidated:');
      await firstUtxo.log();

      // Use first existing UTXO as first input, and either second UTXO or dummy UTXO as second input
      const secondUtxo = existingUnspentUtxos.length > 1 ? existingUnspentUtxos[1] : new Utxo({ 
        lightWasm,
        keypair: utxoKeypair,
        amount: '0'
      });
      
      inputs = [
        firstUtxo, // Use the first existing UTXO
        secondUtxo // Use second UTXO if available, otherwise dummy
      ];

      // Fetch Merkle proofs for real UTXOs
      const firstUtxoCommitment = await firstUtxo.getCommitment();
      const firstUtxoMerkleProof = await fetchMerkleProof(firstUtxoCommitment);
      
      let secondUtxoMerkleProof;
      if (secondUtxo.amount.gt(new BN(0))) {
        // Second UTXO is real, fetch its proof
        const secondUtxoCommitment = await secondUtxo.getCommitment();
        secondUtxoMerkleProof = await fetchMerkleProof(secondUtxoCommitment);
        console.log('\nSecond UTXO to be consolidated:');
        await secondUtxo.log();
      }
      
      // Use the real pathIndices from API for real inputs, mock index for dummy input
      inputMerklePathIndices = [
        firstUtxo.index || 0, // Use the real UTXO's index  
        secondUtxo.amount.gt(new BN(0)) ? (secondUtxo.index || 0) : 0 // Real UTXO index or dummy
      ];
      
      // Create Merkle path elements: real proof for real inputs, zeros for dummy input
      inputMerklePathElements = [
        firstUtxoMerkleProof.pathElements, // Real Merkle proof for first existing UTXO
        secondUtxo.amount.gt(new BN(0)) ? secondUtxoMerkleProof!.pathElements : [...new Array(tree.levels).fill("0")] // Real proof or zero-filled for dummy
      ];
      
      console.log(`Using first UTXO with amount: ${firstUtxo.amount.toString()} and index: ${firstUtxo.index}`);
      console.log(`Using second ${secondUtxo.amount.gt(new BN(0)) ? 'UTXO' : 'dummy UTXO'} with amount: ${secondUtxo.amount.toString()}${secondUtxo.amount.gt(new BN(0)) ? ` and index: ${secondUtxo.index}` : ''}`);
      console.log(`First UTXO Merkle proof path indices from API: [${firstUtxoMerkleProof.pathIndices.join(', ')}]`);
      if (secondUtxo.amount.gt(new BN(0))) {
        console.log(`Second UTXO Merkle proof path indices from API: [${secondUtxoMerkleProof!.pathIndices.join(', ')}]`);
      }
    }
    
    const publicAmountForCircuit = new BN(extAmount).sub(new BN(FEE_AMOUNT)).add(FIELD_SIZE).mod(FIELD_SIZE);
    console.log(`Public amount calculation: (${extAmount} - ${FEE_AMOUNT} + FIELD_SIZE) % FIELD_SIZE = ${publicAmountForCircuit.toString()}`);
    
    // Create outputs for the transaction with the same shared keypair
    const outputs = [
      new Utxo({ 
        lightWasm, 
        amount: outputAmount,
        keypair: utxoKeypair,
        index: currentNextIndex // This UTXO will be inserted at currentNextIndex
      }), // Output with value (either deposit amount minus fee, or input amount minus fee)
      new Utxo({ 
        lightWasm, 
        amount: '0',
        keypair: utxoKeypair,
        index: currentNextIndex + 1 // This UTXO will be inserted at currentNextIndex + 1
      }) // Empty UTXO
    ];
    
    // Verify this matches the circuit balance equation: sumIns + publicAmount = sumOuts
    const sumIns = inputs.reduce((sum, input) => sum.add(input.amount), new BN(0));
    const sumOuts = outputs.reduce((sum, output) => sum.add(output.amount), new BN(0));
    console.log(`Circuit balance check: sumIns(${sumIns.toString()}) + publicAmount(${publicAmountForCircuit.toString()}) should equal sumOuts(${sumOuts.toString()})`);
    
    // Convert to circuit-compatible format
    const publicAmountCircuitResult = sumIns.add(publicAmountForCircuit).mod(FIELD_SIZE);
    console.log(`Balance verification: ${sumIns.toString()} + ${publicAmountForCircuit.toString()} (mod FIELD_SIZE) = ${publicAmountCircuitResult.toString()}`);
    console.log(`Expected sum of outputs: ${sumOuts.toString()}`);
    console.log(`Balance equation satisfied: ${publicAmountCircuitResult.eq(sumOuts)}`);
    
    // Generate nullifiers and commitments
    const inputNullifiers = await Promise.all(inputs.map(x => x.getNullifier()));
    const outputCommitments = await Promise.all(outputs.map(x => x.getCommitment()));

    // Save original commitment and nullifier values for verification
    console.log('\n=== UTXO VALIDATION ===');
    console.log('Output 0 Commitment:', outputCommitments[0]);
    console.log('Output 1 Commitment:', outputCommitments[1]);
    
    // Encrypt the UTXO data using a compact format that includes the keypair
    console.log('\nEncrypting UTXOs with keypair data...');
    const encryptedOutput1 = encryptionService.encryptUtxo(outputs[0]);
    const encryptedOutput2 = encryptionService.encryptUtxo(outputs[1]);

    console.log(`\nOutput[0] (with value):`);
    await outputs[0].log();
    console.log(`\nOutput[1] (empty):`);
    await outputs[1].log();
    
    console.log(`\nEncrypted output 1 size: ${encryptedOutput1.length} bytes`);
    console.log(`Encrypted output 2 size: ${encryptedOutput2.length} bytes`);
    console.log(`Total encrypted outputs size: ${encryptedOutput1.length + encryptedOutput2.length} bytes`);
    
    // Test decryption to verify commitment values match
    console.log('\n=== TESTING DECRYPTION ===');
    console.log('Decrypting output 1 to verify commitment matches...');
    const decryptedUtxo1 = await encryptionService.decryptUtxo(encryptedOutput1, utxoKeypair, lightWasm);
    const decryptedCommitment1 = await decryptedUtxo1.getCommitment();
    console.log('Original commitment:', outputCommitments[0]);
    console.log('Decrypted commitment:', decryptedCommitment1);
    console.log('Commitment matches:', outputCommitments[0] === decryptedCommitment1);

    // Create the deposit ExtData with real encrypted outputs
    const extData = {
      recipient: user.publicKey,
      extAmount: new BN(extAmount),
      encryptedOutput1: encryptedOutput1,
      encryptedOutput2: encryptedOutput2,
      fee: new BN(FEE_AMOUNT),
      feeRecipient: feeRecipientAccount,
      mintAddress: inputs[0].mintAddress
    };

    // Calculate the extDataHash with the encrypted outputs (now includes mintAddress for security)
    const calculatedExtDataHash = getExtDataHash(extData);

    // Create the input for the proof generation (must match circuit input order exactly)
    const input = {
        // Circuit inputs in exact order
        root: root,
        publicAmount: publicAmountForCircuit.toString(),
        extDataHash: calculatedExtDataHash,
        mintAddress: inputs[0].mintAddress,
        
        // Input nullifiers and UTXO data
        inputNullifier: inputNullifiers,
        inAmount: inputs.map(x => x.amount.toString(10)),
        inPrivateKey: inputs.map(x => x.keypair.privkey),
        inBlinding: inputs.map(x => x.blinding.toString(10)),
        inPathIndices: inputMerklePathIndices,
        inPathElements: inputMerklePathElements,
        
        // Output commitments and UTXO data
        outputCommitment: outputCommitments,
        outAmount: outputs.map(x => x.amount.toString(10)),
        outBlinding: outputs.map(x => x.blinding.toString(10)),
        outPubkey: outputs.map(x => x.keypair.pubkey),
    };

    console.log('Generating proof... (this may take a minute)');
    
    // Generate the zero-knowledge proof
    const {proof, publicSignals} = await prove(input, CIRCUIT_PATH);
    
    // Parse the proof and public signals into byte arrays
    const proofInBytes = parseProofToBytesArray(proof);
    const inputsInBytes = parseToBytesArray(publicSignals);
    
    // Create the proof object to submit to the program
    const proofToSubmit = {
      proofA: proofInBytes.proofA,
      proofB: proofInBytes.proofB.flat(),
      proofC: proofInBytes.proofC,
      root: inputsInBytes[0],
      publicAmount: inputsInBytes[1],
      extDataHash: inputsInBytes[2],
      inputNullifiers: [
        inputsInBytes[3],
        inputsInBytes[4]
      ],
      outputCommitments: [
        inputsInBytes[5],
        inputsInBytes[6]
      ],
    };

    // Find PDAs for nullifiers and commitments
    const { nullifier0PDA, nullifier1PDA } = findNullifierPDAs(proofToSubmit);
    const { commitment0PDA, commitment1PDA } = findCommitmentPDAs(proofToSubmit);

    // Address Lookup Table for transaction size optimization
    console.log('Setting up Address Lookup Table...');
    
    const ALT_ADDRESS = new PublicKey('72bpRay17JKp4k8H87p7ieU9C6aRDy5yCqwvtpTN2wuU');
    const lookupTableAccount = await useExistingALT(connection, ALT_ADDRESS);
    
    if (!lookupTableAccount?.value) {
      throw new Error(`
❌ ALT not found at address ${ALT_ADDRESS.toString()}

To fix this:
1. Run: npx ts-node scripts/create_alt.ts
2. Copy the ALT address from the output
3. Update the ALT_ADDRESS constant in this script
      `);
    }

    // Serialize the proof and extData
    const serializedProof = serializeProofAndExtData(proofToSubmit, extData);
    console.log(`Total instruction data size: ${serializedProof.length} bytes`);

    // Create the deposit instruction (user signs, not relayer)
    const depositInstruction = new TransactionInstruction({
      keys: [
        { pubkey: treeAccount, isSigner: false, isWritable: true },
        { pubkey: nullifier0PDA, isSigner: false, isWritable: true },
        { pubkey: nullifier1PDA, isSigner: false, isWritable: true },
        { pubkey: commitment0PDA, isSigner: false, isWritable: true },
        { pubkey: commitment1PDA, isSigner: false, isWritable: true },
        { pubkey: treeTokenAccount, isSigner: false, isWritable: true },
        { pubkey: globalConfigAccount, isSigner: false, isWritable: false },
        // recipient
        { pubkey: user.publicKey, isSigner: false, isWritable: true },
        // fee recipient
        { pubkey: feeRecipientAccount, isSigner: false, isWritable: true },
        // signer (user, not relayer)
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: serializedProof,
    });

    // Set compute budget for the transaction
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
      units: 1_000_000 
    });

    // Create versioned transaction with Address Lookup Table
    const recentBlockhash = await connection.getLatestBlockhash();
    
    const messageV0 = new TransactionMessage({
      payerKey: user.publicKey, // User pays for their own deposit
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [modifyComputeUnits, depositInstruction],
    }).compileToV0Message([lookupTableAccount.value]);

    const versionedTransaction = new VersionedTransaction(messageV0);
    
    // User signs their own transaction
    versionedTransaction.sign([user]);
    
    console.log('Transaction signed by user');
    
    // Serialize the signed transaction for relay
    const serializedTransaction = Buffer.from(versionedTransaction.serialize()).toString('base64');

    console.log('Prepared signed transaction for relay to indexer backend');

    // Relay the pre-signed transaction to indexer backend
    const signature = await relayDepositToIndexer(serializedTransaction);
    console.log('Transaction signature:', signature);
    console.log(`Transaction link: https://explorer.solana.com/tx/${signature}`);
    
    // Wait a moment for the transaction to be confirmed
    console.log('Waiting for transaction confirmation...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check if UTXOs were added to the tree by fetching the tree account again
    try {
      console.log('Fetching updated tree state...');
      const updatedTreeState = await queryRemoteTreeState();
      
      console.log('Tree state after deposit:');
      console.log('- Current tree nextIndex:', updatedTreeState.nextIndex);
      console.log('- Total UTXOs in tree:', updatedTreeState.nextIndex);
      console.log('- New tree root:', updatedTreeState.root);
      
      // Calculate the number of new UTXOs added (should be 2)
      const expectedNextIndex = currentNextIndex + 2;
      const utxosAdded = updatedTreeState.nextIndex - currentNextIndex;
      console.log(`UTXOs added in this deposit: ${utxosAdded} (expected: 2)`);
      
      if (updatedTreeState.nextIndex === expectedNextIndex) {
        console.log('Deposit successful! UTXOs were added to the Merkle tree.');
      } else {
        console.log(`Warning: Expected nextIndex to be ${expectedNextIndex}, but got ${updatedTreeState.nextIndex}`);
      }
    } catch (error) {
      console.error('Failed to fetch tree state after deposit:', error);
    }
  } catch (error: any) {
    console.error('Error during deposit:', error);
  }
}

// Run the deposit function
main();
