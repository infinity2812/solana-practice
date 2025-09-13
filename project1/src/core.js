import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

export class TokenUtils {
  constructor() {
    this.connection = new Connection(RPC_URL, 'confirmed');
    this.payer = this.loadPayer();
  }

  loadPayer() {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment');
    }
    const privateKeyArray = JSON.parse(process.env.PRIVATE_KEY);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }

  async createToken(name, symbol, decimals = 9) {
    const mintAuthority = Keypair.generate();
    const freezeAuthority = Keypair.generate();
    
    const mint = await createMint(
      this.connection,
      this.payer,
      mintAuthority.publicKey,
      freezeAuthority.publicKey,
      decimals,
      TOKEN_PROGRAM_ID
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.payer,
      mint,
      this.payer.publicKey
    );

    return {
      mint: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      mintAuthority: {
        publicKey: mintAuthority.publicKey.toString(),
        secretKey: Array.from(mintAuthority.secretKey)
      },
      freezeAuthority: {
        publicKey: freezeAuthority.publicKey.toString(),
        secretKey: Array.from(freezeAuthority.secretKey)
      },
      decimals,
      symbol,
      name
    };
  }

  async mintTokens(mintAddress, recipientAddress, amount) {
    const mint = new PublicKey(mintAddress);
    const recipient = new PublicKey(recipientAddress);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.payer,
      mint,
      recipient
    );

    const signature = await mintTo(
      this.connection,
      this.payer,
      mint,
      tokenAccount.address,
      this.payer,
      amount
    );

    return signature;
  }

  async transferTokens(mintAddress, fromAddress, toAddress, amount) {
    const mint = new PublicKey(mintAddress);
    const from = new PublicKey(fromAddress);
    const to = new PublicKey(toAddress);

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.payer,
      mint,
      from
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.payer,
      mint,
      to
    );

    const transferInstruction = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      from,
      amount
    );

    const transaction = new Transaction().add(transferInstruction);
    const signature = await this.connection.sendTransaction(transaction, [this.payer]);

    return signature;
  }

  async getBalance(mintAddress, walletAddress) {
    const mint = new PublicKey(mintAddress);
    const wallet = new PublicKey(walletAddress);
    
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.payer,
      mint,
      wallet
    );

    const accountInfo = await getAccount(this.connection, tokenAccount.address);
    return Number(accountInfo.amount);
  }

  async getSolBalance(walletAddress) {
    const wallet = new PublicKey(walletAddress);
    const balance = await this.connection.getBalance(wallet);
    return balance / 1000000000;
  }
}
