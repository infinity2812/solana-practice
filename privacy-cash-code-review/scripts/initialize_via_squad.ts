import { Connection, PublicKey, SystemProgram, TransactionInstruction, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');
const SQUAD_VAULT_ADDRESS = new PublicKey('AWexibGxNFKTa1b5R5MN4PJr9HWnWRwf8EW9g8cLx3dM');
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const INITIALIZE_IX_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

async function generateSquadInitializeInstruction() {
  console.log('🔧 SQUAD MULTISIG INITIALIZATION GUIDE');
  console.log('='.repeat(50));
  console.log(`Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`Squad Vault: ${SQUAD_VAULT_ADDRESS.toString()}`);
  console.log('');

  // Generate PDAs
  const [treeAccount] = PublicKey.findProgramAddressSync([Buffer.from('merkle_tree')], PROGRAM_ID);
  const [treeTokenAccount] = PublicKey.findProgramAddressSync([Buffer.from('tree_token')], PROGRAM_ID);
  const [globalConfig] = PublicKey.findProgramAddressSync([Buffer.from('global_config')], PROGRAM_ID);

  console.log('📋 SQUAD TRANSACTION ADDRESSES:');
  console.log('');
  console.log('Tree Account:');
  console.log(treeAccount.toString());
  console.log('');
  console.log('Tree Token Account:');
  console.log(treeTokenAccount.toString());
  console.log('');
  console.log('Global Config:');
  console.log(globalConfig.toString());
  console.log('');

  // Create the initialize instruction
  const initializeInstruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: treeAccount, isSigner: false, isWritable: true },
      { pubkey: treeTokenAccount, isSigner: false, isWritable: true },
      { pubkey: globalConfig, isSigner: false, isWritable: true },
      { pubkey: SQUAD_VAULT_ADDRESS, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INITIALIZE_IX_DISCRIMINATOR,
  });

  // Create transaction
  const transaction = new Transaction();
  transaction.add(initializeInstruction);
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = SQUAD_VAULT_ADDRESS;

  // Compile the message (this is what Squad expects)
  const message = transaction.compileMessage();
  
  // Serialize the message
  const messageBytes = message.serialize();
  
  // Encode as base58 (Squad format)
  const base58Message = bs58.encode(messageBytes);

  console.log('🚀 SQUAD MANUAL TRANSACTION SETUP:');
  console.log('');
  console.log('1. Go to https://app.squads.so');
  console.log('2. Select your Squad multisig');
  console.log('3. Create new transaction manually');
  console.log('');
  console.log('Program ID:');
  console.log(PROGRAM_ID.toString());
  console.log('');
  console.log('Instruction Data (hex):');
  console.log(INITIALIZE_IX_DISCRIMINATOR.toString('hex'));
  console.log('');
  console.log('Accounts (in order):');
  console.log('1. ' + treeAccount.toString() + ' (writable)');
  console.log('2. ' + treeTokenAccount.toString() + ' (writable)');
  console.log('3. ' + globalConfig.toString() + ' (writable)');
  console.log('4. ' + SQUAD_VAULT_ADDRESS.toString() + ' (signer, writable)');
  console.log('5. 11111111111111111111111111111111 (readonly)');
  
  // Check account status
  console.log('');
  console.log('🔍 ACCOUNT STATUS:');
  try {
    const checks = await Promise.all([
      connection.getAccountInfo(treeAccount),
      connection.getAccountInfo(treeTokenAccount),
      connection.getAccountInfo(globalConfig)
    ]);
    
    console.log(`Tree Account: ${checks[0] ? '❌ Exists' : '✅ Ready'}`);
    console.log(`Tree Token: ${checks[1] ? '❌ Exists' : '✅ Ready'}`);
    console.log(`Global Config: ${checks[2] ? '❌ Exists' : '✅ Ready'}`);
  } catch (error) {
    console.log('Error checking accounts');
  }
}

generateSquadInitializeInstruction().catch(console.error);
