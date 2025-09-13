import { TokenUtils } from './core.js';
import fs from 'fs';

const tokenUtils = new TokenUtils();

async function createToken() {
  const name = process.argv[2] || 'MinimalToken';
  const symbol = process.argv[3] || 'MIN';
  const decimals = parseInt(process.argv[4]) || 9;

  const tokenInfo = await tokenUtils.createToken(name, symbol, decimals);
  
  fs.writeFileSync('token.json', JSON.stringify(tokenInfo, null, 2));
  
  console.log(`Token created: ${tokenInfo.mint}`);
  console.log(`Symbol: ${tokenInfo.symbol}`);
  console.log(`Decimals: ${tokenInfo.decimals}`);
}

createToken().catch(console.error);
