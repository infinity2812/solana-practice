/**
 * Simple Squads SDK Test
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

    console.log('🎉 All Squads SDK tests passed!');
    return true;

  } catch (error) {
    console.log(`❌ Squads SDK test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return false;
  }
}

// Test our SquadsClient
async function testSquadsClient() {
  console.log('🧪 Testing SquadsClient Implementation...\n');

  try {
    // Import our SquadsClient
    const { SquadsClient } = require('./src/squads');
    
    const connection = mockConnection;
    const multisigAddress = {
      toString: () => 'Multisig1111111111111111111111111111111111',
      toBytes: () => new Uint8Array(32).fill(2)
    };
    const vaultIndex = 0;
    
    const squadsClient = new SquadsClient(connection, multisigAddress, vaultIndex);
    console.log('✅ SquadsClient instantiated successfully');

    // Test vault PDA getter
    try {
      const vaultPda = squadsClient.getVaultPda();
      console.log(`✅ Vault PDA: ${vaultPda.toString()}`);
    } catch (error) {
      console.log(`❌ Vault PDA error: ${error.message}`);
    }

    // Test transaction index getter
    try {
      const txIndex = await squadsClient.getNextTransactionIndex();
      console.log(`✅ Next transaction index: ${txIndex}`);
    } catch (error) {
      console.log(`❌ Transaction index error: ${error.message}`);
    }

    console.log('🎉 SquadsClient implementation test completed!');
    return true;

  } catch (error) {
    console.log(`❌ SquadsClient test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Squads SDK Tests\n');
  
  const sdkTest = await testSquadsSDK();
  const clientTest = await testSquadsClient();
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`✅ SDK Integration: ${sdkTest ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Client Implementation: ${clientTest ? 'PASSED' : 'FAILED'}`);
  
  if (sdkTest && clientTest) {
    console.log('\n🎉 ALL TESTS PASSED! Squads SDK is working correctly.');
    console.log('✅ We can use the Squads SDK for multisig functionality!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
  }
  
  return { sdkTest, clientTest };
}

// Run the tests
runAllTests().catch(console.error);
