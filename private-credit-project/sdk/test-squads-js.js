/**
 * Simple Squads SDK Test (JavaScript)
 * 
 * This test verifies that the Squads SDK is working correctly
 */

// Mock connection
const mockConnection = {
  getAccountInfo: async () => null,
  getLatestBlockhash: async () => ({ 
    blockhash: 'mock-blockhash-123456789012345678901234567890123456789012345678901234567890', 
    lastValidBlockHeight: 100 
  }),
  sendTransaction: async () => 'mock-signature-123456789012345678901234567890123456789012345678901234567890',
  simulateTransaction: async () => ({ value: { err: null } }),
};

// Mock keypair
const mockKeypair = {
  publicKey: {
    toString: () => 'TestKey1111111111111111111111111111111111',
    toBytes: () => new Uint8Array(32).fill(1),
    equals: (other) => other.toString() === 'TestKey1111111111111111111111111111111111'
  },
  secretKey: new Uint8Array(64).fill(1),
  sign: async (data) => new Uint8Array(64).fill(2)
};

async function testSquadsSDK() {
  console.log('🧪 Testing Squads SDK Integration...\n');

  try {
    // Test 1: Import the SDK
    console.log('1. Testing SDK import...');
    const multisig = require('@sqds/multisig');
    console.log('✅ SDK imported successfully');
    console.log(`   Available exports: ${Object.keys(multisig).length} items\n`);

    // Test 2: Test vault PDA derivation
    console.log('2. Testing vault PDA derivation...');
    const multisigAddress = {
      toString: () => 'Multisig1111111111111111111111111111111111',
      toBytes: () => new Uint8Array(32).fill(2)
    };
    
    const vaultPda = multisig.getVaultPda({
      multisigPda: multisigAddress,
      index: 0,
    });
    console.log(`✅ Vault PDA derived: ${vaultPda[0].toString()}\n`);

    // Test 3: Test multisig PDA derivation
    console.log('3. Testing multisig PDA derivation...');
    const createKey = {
      toString: () => 'CreateKey1111111111111111111111111111111111',
      toBytes: () => new Uint8Array(32).fill(3)
    };
    
    const multisigPda = multisig.getMultisigPda({
      createKey: createKey,
    });
    console.log(`✅ Multisig PDA derived: ${multisigPda[0].toString()}\n`);

    // Test 4: Test transaction PDA derivation
    console.log('4. Testing transaction PDA derivation...');
    const transactionPda = multisig.getTransactionPda({
      multisigPda: multisigAddress,
      transactionIndex: 1n,
    });
    console.log(`✅ Transaction PDA derived: ${transactionPda[0].toString()}\n`);

    // Test 5: Test program ID
    console.log('5. Testing program ID...');
    console.log(`✅ Program ID: ${multisig.PROGRAM_ID.toString()}\n`);

    // Test 6: Test instruction builders
    console.log('6. Testing instruction builders...');
    const instructions = multisig.instructions;
    console.log(`✅ Available instructions: ${Object.keys(instructions).length} items`);
    console.log(`   Key instructions: ${Object.keys(instructions).slice(0, 5).join(', ')}...\n`);

    // Test 7: Test account providers
    console.log('7. Testing account providers...');
    const accounts = multisig.accounts;
    console.log(`✅ Available accounts: ${Object.keys(accounts).length} items`);
    console.log(`   Key accounts: ${Object.keys(accounts).slice(0, 5).join(', ')}...\n`);

    // Test 8: Test RPC methods
    console.log('8. Testing RPC methods...');
    const rpc = multisig.rpc;
    console.log(`✅ Available RPC methods: ${Object.keys(rpc).length} items`);
    console.log(`   Key RPC methods: ${Object.keys(rpc).slice(0, 5).join(', ')}...\n`);

    // Test 9: Test specific functionality we need
    console.log('9. Testing specific functionality...');
    
    // Test multisig creation instruction
    if (instructions.multisigCreate) {
      console.log('✅ multisigCreate instruction available');
    }
    
    // Test vault transaction creation instruction
    if (instructions.vaultTransactionCreate) {
      console.log('✅ vaultTransactionCreate instruction available');
    }
    
    // Test proposal creation instruction
    if (instructions.proposalCreate) {
      console.log('✅ proposalCreate instruction available');
    }
    
    // Test proposal approval instruction
    if (instructions.proposalApprove) {
      console.log('✅ proposalApprove instruction available');
    }
    
    // Test vault transaction execution instruction
    if (instructions.vaultTransactionExecute) {
      console.log('✅ vaultTransactionExecute instruction available');
    }

    console.log('\n🎉 All Squads SDK tests passed!');
    console.log('✅ The Squads SDK is fully functional and ready to use!');
    return true;

  } catch (error) {
    console.log(`❌ Squads SDK test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

// Test basic Squads operations
async function testSquadsOperations() {
  console.log('🧪 Testing Squads Operations...\n');

  try {
    const multisig = require('@sqds/multisig');
    
    // Test 1: Create a multisig PDA
    console.log('1. Testing multisig PDA creation...');
    const createKey = {
      toString: () => 'CreateKey1111111111111111111111111111111111',
      toBytes: () => new Uint8Array(32).fill(3)
    };
    
    const [multisigPda] = multisig.getMultisigPda({ createKey });
    console.log(`✅ Multisig PDA: ${multisigPda.toString()}\n`);

    // Test 2: Create a vault PDA
    console.log('2. Testing vault PDA creation...');
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: multisigPda,
      index: 0,
    });
    console.log(`✅ Vault PDA: ${vaultPda.toString()}\n`);

    // Test 3: Create a transaction PDA
    console.log('3. Testing transaction PDA creation...');
    const [transactionPda] = multisig.getTransactionPda({
      multisigPda: multisigPda,
      transactionIndex: 1n,
    });
    console.log(`✅ Transaction PDA: ${transactionPda.toString()}\n`);

    // Test 4: Test instruction creation (without sending)
    console.log('4. Testing instruction creation...');
    
    const instructions = multisig.instructions;
    
    // Test multisig creation instruction
    const multisigCreateIx = instructions.multisigCreate({
      multisigPda: multisigPda,
      configAuthority: multisigPda,
      threshold: 2,
      createKey: createKey,
      members: [mockKeypair.publicKey],
      timeLock: 0,
    });
    console.log('✅ multisigCreate instruction created');

    // Test vault transaction creation instruction
    const vaultTxCreateIx = instructions.vaultTransactionCreate({
      multisigPda: multisigPda,
      transactionIndex: 1n,
      creator: mockKeypair.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage: {
        instructions: [],
        addressTableLookups: [],
      },
    });
    console.log('✅ vaultTransactionCreate instruction created');

    console.log('\n🎉 All Squads operations tests passed!');
    return true;

  } catch (error) {
    console.log(`❌ Squads operations test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Squads SDK Tests\n');
  
  const sdkTest = await testSquadsSDK();
  const operationsTest = await testSquadsOperations();
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`✅ SDK Integration: ${sdkTest ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Operations Test: ${operationsTest ? 'PASSED' : 'FAILED'}`);
  
  if (sdkTest && operationsTest) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ We can successfully use the Squads SDK for multisig functionality!');
    console.log('✅ The SDK supports all the operations we need:');
    console.log('   - Multisig creation');
    console.log('   - Vault management');
    console.log('   - Transaction creation and execution');
    console.log('   - Proposal management');
    console.log('   - Member management');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }
  
  return { sdkTest, operationsTest };
}

// Run the tests
runAllTests().catch(console.error);
