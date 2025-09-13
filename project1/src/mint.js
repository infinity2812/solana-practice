import { TokenUtils } from './core.js';
import fs from 'fs';

const tokenUtils = new TokenUtils();

async function mintTokens() {
  const mintAddress = process.argv[2];
  const recipientAddress = process.argv[3];
  const amount = parseInt(process.argv[4]);

  if (!mintAddress || !recipientAddress || !amount) {
    console.log('Usage: npm run mint <mint-address> <recipient-address> <amount>');
    process.exit(1);
  }

  const signature = await tokenUtils.mintTokens(mintAddress, recipientAddress, amount);
  console.log(`Tokens minted: ${signature}`);
}

mintTokens().catch(console.error);
