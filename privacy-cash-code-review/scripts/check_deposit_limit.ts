import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Program ID for the zkcash program
const PROGRAM_ID = new PublicKey('9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD');

// Configure connection to Solana mainnet-beta
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Deployer (authority) public key - this must match the one used during Initialize
const deployer = new PublicKey('97rSMQUukMDjA7PYErccyx7ZxbHvSDaeXp2ig5BwSrTf');

async function checkDepositLimit() {
  try {
    console.log('📊 Reading deposit limit from MerkleTreeAccount...\n');
    
    // Derive the tree account PDA
    const [treeAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('merkle_tree')],
      PROGRAM_ID
    );

    console.log(`Tree Account PDA: ${treeAccount.toString()}`);
    console.log(`Authority (Deployer): ${deployer.toString()}`);
    
    // Fetch the account data
    const accountInfo = await connection.getAccountInfo(treeAccount);
    
    if (!accountInfo) {
      console.error('❌ Tree account not found. Make sure the program is initialized.');
      return;
    }

    console.log(`Account data size: ${accountInfo.data.length} bytes`);
    
    // Parse the MerkleTreeAccount structure
    // Layout (after 8-byte anchor discriminator):
    // authority: Pubkey (32 bytes) - offset 8
    // next_index: u64 (8 bytes) - offset 40  
    // subtrees: [[u8; 32]; 32] (32 * 32 = 1024 bytes) - offset 48
    // root: [u8; 32] (32 bytes) - offset 880
    // root_history: [[u8; 32]; 100] (100 * 32 = 3200 bytes) - offset 912
    // root_index: u64 (8 bytes) - offset 4112
    // max_deposit_amount: u64 (8 bytes) - offset 4120
    // bump: u8 (1 byte) - offset 4128
    // _padding: [u8; 7] (7 bytes) - offset 4129
    
    const authority = new PublicKey(accountInfo.data.slice(8, 40));
    const nextIndex = new BN(accountInfo.data.slice(40, 48), 'le');
    const rootIndex = new BN(accountInfo.data.slice(4112, 4120), 'le');
    const maxDepositAmount = new BN(accountInfo.data.slice(4120, 4128), 'le');
    const bump = accountInfo.data[4128];
    
    console.log('\n📋 MerkleTreeAccount Details:');
    console.log(`┌─ Authority: ${authority.toString()}`);
    console.log(`├─ Next Index: ${nextIndex.toString()}`);
    console.log(`├─ Root Index: ${rootIndex.toString()}`);
    console.log(`├─ Max Deposit Amount: ${maxDepositAmount.toString()} lamports`);
    
    // Convert to SOL using BN division to handle large numbers
    const lamportsPerSol = new BN(1_000_000_000);
    const maxDepositSol = maxDepositAmount.div(lamportsPerSol);
    const remainder = maxDepositAmount.mod(lamportsPerSol);
    
    // Format the SOL amount with decimals
    let solFormatted;
    if (remainder.eq(new BN(0))) {
      solFormatted = maxDepositSol.toString();
    } else {
      // Handle fractional SOL by converting remainder to decimal
      const fractional = remainder.toNumber() / 1e9;
      solFormatted = `${maxDepositSol.toString()}${fractional.toFixed(9).substring(1)}`;
    }
    
    console.log(`├─ Max Deposit Amount: ${solFormatted} SOL`);
    console.log(`└─ Bump: ${bump}`);
    
    // Verify authority matches deployer
    if (authority.equals(deployer)) {
      console.log('\n✅ Authority verification: PASSED');
    } else {
      console.log('\n❌ Authority verification: FAILED');
      console.log(`Expected: ${deployer.toString()}`);
      console.log(`Found: ${authority.toString()}`);
    }
    
    // Show deposit limit status
    console.log('\n💰 Deposit Limit Status:');
    const defaultLimit = new BN(1_000_000_000); // 1 SOL in lamports
    
    if (maxDepositAmount.eq(defaultLimit)) {
      console.log('├─ Status: Default limit (1 SOL)');
    } else if (maxDepositAmount.gt(defaultLimit)) {
      console.log('├─ Status: Increased limit');
    } else {
      console.log('├─ Status: Reduced limit');
    }
    
    console.log(`└─ Current limit: ${solFormatted} SOL per deposit`);
    
    // Additional info about the large value
    console.log('\n🔍 Additional Info:');
    console.log(`├─ Value in scientific notation: ${maxDepositAmount.toString()} lamports`);
    console.log(`├─ Approximate value: ~${maxDepositAmount.div(new BN(1e9)).toString()} billion lamports`);
    console.log(`└─ This appears to be an unusually large value - may indicate data parsing issue`);
    
  } catch (error) {
    console.error('❌ Error reading deposit limit:', error);
  }
}

// Run the check
checkDepositLimit(); 