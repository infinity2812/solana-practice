import { Context } from 'koa';
import { 
  relayDepositTransaction, 
  DepositParams 
} from '../services/deposit-service';
import { logger } from '../utils/logger';
import { WalletScreenerService, ScreenResult } from '../services/wallet-screener-service';
import { VersionedTransaction } from '@solana/web3.js';

// Submit deposit transaction endpoint
export async function handleDeposit(ctx: Context) {
  try {
    // Validate request body
    const params = ctx.request.body as DepositParams;
    
    if (!params) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Request body is required'
      };
      return;
    }

    // Validate required fields
    const requiredFields = [
      'signedTransaction'
    ];
    
    const missingFields = requiredFields.filter(field => {
      const value = params[field as keyof DepositParams];
      return !value;
    });
    
    if (missingFields.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
      return;
    }

    // Validate signedTransaction is a non-empty string
    if (typeof params.signedTransaction !== 'string' || params.signedTransaction.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'signedTransaction must be a non-empty string'
      };
      return;
    }

    const transactionBuffer = Buffer.from(params.signedTransaction, 'base64');
    const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
    const signerPublicKey = versionedTransaction.message.staticAccountKeys[0];

    if (!signerPublicKey) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Invalid transaction'
      };
      return;
    }

    logger.info('Received deposit relay request:', {
      signedTransactionSize: params.signedTransaction.length,
      signer: signerPublicKey.toString(),
    });
    
    const screeningResult = await WalletScreenerService.screenAddress(signerPublicKey.toString());
    
    if (screeningResult === ScreenResult.API_ERROR) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Unable to screen sender address - API error'
      };
      return;
    }
    
    if (screeningResult === ScreenResult.RISKY) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        error: 'Your wallet address is risky. Service rejected.'
      };
      return;
    }

    // Relay the pre-signed deposit transaction
    const signature = await relayDepositTransaction(params);

    ctx.body = {
      success: true,
      signature,
      message: 'Deposit transaction submitted successfully'
    };

  } catch (error) {
    logger.error('Failed to handle deposit request:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Note: For deposits, we don't need relayer info since users sign their own transactions
// Relayer info is only needed for withdrawals where the relayer signs on behalf of users
