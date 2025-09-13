import { TokenUtils } from './core.js';

const tokenUtils = new TokenUtils();

async function main() {
  console.log('Project1 - Minimal Solana Token Utils');
  console.log('Available commands:');
  console.log('  npm run create [name] [symbol] [decimals]');
  console.log('  npm run mint <mint-address> <recipient-address> <amount>');
  console.log('  npm run transfer <mint-address> <from-address> <to-address> <amount>');
  console.log('  npm run balance <mint-address> <wallet-address>');
}

main().catch(console.error);
