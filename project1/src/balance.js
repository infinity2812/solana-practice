import { TokenUtils } from './core.js';

const tokenUtils = new TokenUtils();

async function getBalance() {
  const mintAddress = process.argv[2];
  const walletAddress = process.argv[3];

  if (!mintAddress || !walletAddress) {
    console.log('Usage: npm run balance <mint-address> <wallet-address>');
    process.exit(1);
  }

  const tokenBalance = await tokenUtils.getBalance(mintAddress, walletAddress);
  const solBalance = await tokenUtils.getSolBalance(walletAddress);

  console.log(`Token Balance: ${tokenBalance}`);
  console.log(`SOL Balance: ${solBalance}`);
}

getBalance().catch(console.error);
