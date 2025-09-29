import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram,
  AddressLookupTableProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { FEE_RECIPIENT_ACCOUNT } from './utils/constants';

dotenv.config();

// Load user keypair from script_keypair.json
const anchorDirPath = path.join(__dirname, '..', 'anchor');
const deployKeypairPath = path.join(anchorDirPath, 'deploy-keypair.json');
const keypairJson = JSON.parse(readFileSync(deployKeypairPath, 'utf-8'));
const user = Keypair.fromSecretKey(Uint8Array.from(keypairJson));

// Program ID for the zkcash program
const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

// Configure connection to Solana mainnet-beta
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

/**
 * Create a new address lookup table
 */
async function createALT(
  connection: Connection,
  payer: Keypair,
  addresses: PublicKey[]
): Promise<PublicKey> {
  try {
    console.log('Creating new Address Lookup Table...');
    
    // Create the lookup table with a recent slot
    const recentSlot = await connection.getSlot('confirmed');
    console.log(`Using recent slot: ${recentSlot}`);
    
    let [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
      recentSlot: recentSlot,
    });

    console.log(`New ALT address: ${lookupTableAddress.toString()}`);

    // Create transaction to create the lookup table
    const createALTTx = new Transaction().add(lookupTableInst);
    
    try {
      await sendAndConfirmTransaction(connection, createALTTx, [payer]);
      console.log('ALT created successfully');
    } catch (error: any) {
      // Check for slot too old error in transaction logs
      const isSlotTooOld = error.transactionLogs?.some((log: string) => 
        log.includes('is not a recent slot')
      ) || error.message?.includes('not a recent slot');
      
      if (isSlotTooOld) {
        console.log('Slot too old, retrying with newer slot...');
        
        // Try multiple times with increasingly recent slots
        for (let retryAttempt = 1; retryAttempt <= 3; retryAttempt++) {
          try {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get the most recent slot possible
            const newerSlot = await connection.getSlot('processed');
            console.log(`Retry attempt ${retryAttempt} with slot: ${newerSlot}`);
            
            [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
              authority: payer.publicKey,
              payer: payer.publicKey,
              recentSlot: newerSlot,
            });
            
            console.log(`New ALT address on retry: ${lookupTableAddress.toString()}`);
            const retryCreateALTTx = new Transaction().add(lookupTableInst);
            await sendAndConfirmTransaction(connection, retryCreateALTTx, [payer]);
            console.log('ALT created successfully on retry');
            break; // Success, exit retry loop
          } catch (retryError: any) {
            const isStillSlotTooOld = retryError.transactionLogs?.some((log: string) => 
              log.includes('is not a recent slot')
            ) || retryError.message?.includes('not a recent slot');
            
            if (isStillSlotTooOld && retryAttempt < 3) {
              console.log(`Retry ${retryAttempt} failed with slot too old, trying again...`);
              continue;
            } else {
              throw retryError; // Re-throw if not slot error or max retries reached
            }
          }
        }
      } else {
        throw error;
      }
    }

    // Wait a moment for the ALT to be available
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add addresses to the lookup table in batches (max 30 addresses per instruction)
    const batchSize = 30;
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      console.log(`Adding batch ${Math.floor(i / batchSize) + 1} with ${batch.length} addresses...`);
      
      const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: payer.publicKey,
        authority: payer.publicKey,
        lookupTable: lookupTableAddress,
        addresses: batch,
      });

      const extendTx = new Transaction().add(extendInstruction);
      await sendAndConfirmTransaction(connection, extendTx, [payer]);
      
      // Small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully added ${addresses.length} addresses to ALT`);
    return lookupTableAddress;
  } catch (error) {
    console.error('Error creating ALT:', error);
    throw error;
  }
}

/**
 * Get all required addresses for the privacy cash protocol
 */
function getProtocolAddresses(
  programId: PublicKey,
  authority: PublicKey,
  user: PublicKey,
  nullifier0PDA: PublicKey,
  nullifier1PDA: PublicKey,
  commitment0PDA: PublicKey,
  commitment1PDA: PublicKey,
  feeRecipientAccount: PublicKey,
  recipient?: PublicKey
): PublicKey[] {
  // Derive common PDAs
  const [treeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('merkle_tree')],
    programId
  );

  const [treeTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('tree_token')],
    programId
  );

  const [globalConfigAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('global_config')],
    programId
  );

  const addresses = [
    programId,
    treeAccount,
    nullifier0PDA,
    nullifier1PDA,
    commitment0PDA,
    commitment1PDA,
    treeTokenAccount,
    globalConfigAccount,
    user,
    feeRecipientAccount,
    authority,
    SystemProgram.programId,
    ComputeBudgetProgram.programId
  ];

  // Add recipient if provided (for withdrawals)
  if (recipient) {
    addresses.push(recipient);
  }

  return addresses;
}

async function main() {
  try {
    console.log('🚀 Creating Address Lookup Table for Privacy Cash Protocol...\n');
    
    // Squad vault (authority) public key
    const squadVault = new PublicKey('AWexibGxNFKTa1b5R5MN4PJr9HWnWRwf8EW9g8cLx3dM');
    console.log(`Squad Vault (Authority): ${squadVault.toString()}`);
    console.log(`Payer: ${user.publicKey.toString()}`);
    
    // Check wallet balance
    const balance = await connection.getBalance(user.publicKey);
    console.log(`Wallet balance: ${balance / 1e9} SOL`);

    if (balance < 0.01 * 1e9) { // Need at least 0.01 SOL for ALT creation
      console.error('❌ Insufficient balance. Need at least 0.01 SOL for ALT creation.');
      return;
    }
    
    // Derive common PDAs that will always be used
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

    // Create dummy nullifier and commitment PDAs for ALT creation
    const dummyBytes = new Array(32).fill(0);
    
    const [nullifier0PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier0"), Buffer.from(dummyBytes)],
      PROGRAM_ID
    );
    
    const [nullifier1PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier1"), Buffer.from(dummyBytes)],
      PROGRAM_ID
    );
    
    const [commitment0PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("commitment0"), Buffer.from(dummyBytes)],
      PROGRAM_ID
    );
    
    const [commitment1PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("commitment1"), Buffer.from(dummyBytes)],
      PROGRAM_ID
    );

    console.log('\n📋 Protocol addresses to include in ALT:');
    console.log(`- Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`- Tree Account: ${treeAccount.toString()}`);
    console.log(`- Tree Token Account: ${treeTokenAccount.toString()}`);
    console.log(`- Global Config Account: ${globalConfigAccount.toString()}`);
    console.log(`- Fee Recipient: ${FEE_RECIPIENT_ACCOUNT.toString()}`);
    console.log(`- Squad Vault (Authority): ${squadVault.toString()}`);
    console.log(`- Payer: ${user.publicKey.toString()}`);
    console.log(`- System Program: 11111111111111111111111111111111`);
    console.log(`- Compute Budget Program: ComputeBudget111111111111111111111111111111`);
    console.log(`- Example Nullifier PDAs: ${nullifier0PDA.toString()}, ${nullifier1PDA.toString()}`);
    console.log(`- Example Commitment PDAs: ${commitment0PDA.toString()}, ${commitment1PDA.toString()}`);

    // Create comprehensive address list for the protocol
    const protocolAddresses = getProtocolAddresses(
      PROGRAM_ID,
      squadVault, // Squad vault as authority
      user.publicKey,
      nullifier0PDA, // Dummy PDAs for ALT creation
      nullifier1PDA,
      commitment0PDA,
      commitment1PDA,
      FEE_RECIPIENT_ACCOUNT
    );

    console.log(`\n📦 Creating ALT with ${protocolAddresses.length} addresses...`);
    
    // Create the ALT
    const lookupTableAddress = await createALT(connection, user, protocolAddresses);
    
    console.log('\n✅ ALT Creation Complete!');
    console.log('='.repeat(80));
    console.log(`🎯 ALT Address: ${lookupTableAddress.toString()}`);
    console.log('='.repeat(80));
    
    console.log('\n📝 Next Steps:');
    console.log('1. Copy the ALT address above');
    console.log('2. Add it to your scripts as a constant:');
    console.log(`   const ALT_ADDRESS = new PublicKey('${lookupTableAddress.toString()}');`);
    console.log('3. Use this ALT in your deposit/withdraw scripts');
    console.log('');
    console.log('⚠️  IMPORTANT: This ALT was created with deploy keypair as payer/authority.');
    console.log('   For production use with Squad multisig, you may want to:');
    console.log('   - Transfer ALT authority to Squad vault if needed');
    console.log('   - Or create ALT through Squad multisig transaction');
    
    console.log('\n💡 Code snippet for your scripts:');
    console.log('```typescript');
    console.log(`// Hardcoded ALT address (created once)`);
    console.log(`const ALT_ADDRESS = new PublicKey('${lookupTableAddress.toString()}');`);
    console.log('');
    console.log('// Use existing ALT instead of creating new one');
    console.log('const lookupTableAccount = await connection.getAddressLookupTable(ALT_ADDRESS);');
    console.log('if (!lookupTableAccount.value) {');
    console.log('  throw new Error("ALT not found. Run create_alt.ts first");');
    console.log('}');
    console.log('```');
    
    // Verify the ALT works
    console.log('\n🔍 Verifying ALT...');
    const altAccount = await connection.getAddressLookupTable(lookupTableAddress);
    if (altAccount.value) {
      console.log(`✅ ALT verified with ${altAccount.value.state.addresses.length} addresses`);
      console.log('📊 ALT is ready to use!');
    } else {
      console.log('❌ ALT verification failed');
    }
    
  } catch (error: any) {
    console.error('❌ Error creating ALT:', error);
  }
}

console.log('Privacy Cash Protocol - ALT Creator (Squad Integration)');
console.log('====================================================\n');

// Run the ALT creation
main(); 