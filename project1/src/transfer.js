import { TokenUtils } from './core.js';

const tokenUtils = new TokenUtils();

async function transferTokens() {
  const mintAddress = process.argv[2];
  const fromAddress = process.argv[3];
  const toAddress = process.argv[4];
  const amount = parseInt(process.argv[5]);

  if (!mintAddress || !fromAddress || !toAddress || !amount) {
    console.log('Usage: npm run transfer <mint-address> <from-address> <to-address> <amount>');
    process.exit(1);
  }

  const signature = await tokenUtils.transferTokens(mintAddress, fromAddress, toAddress, amount);
  console.log(`Transfer completed: ${signature}`);
}

transferTokens().catch(console.error);
