import { Context } from 'koa';
import { DynamoDB } from "aws-sdk"
import { loadHistoricalPDAs } from '../services/pda-service';
import { PROGRAM_ID } from '../config';
import { userUxtosService } from '../services/user-uxtos-service';
import { logger } from '../utils/logger';
import { TransactionStatsRepository } from '../repository/transaction-stats-repository';

// Flag to track if a reload is already in progress
let reloadInProgress = false;
// Flag to indicate if another reload is needed after current one finishes
let reloadRequested = false;

/**
 * Handle Helius webhook payload
 * Documentation: https://docs.helius.dev/webhooks/webhook-payloads
 */
export async function handleWebhook(ctx: Context): Promise<void> {
  try {
    // Log the full request for debugging
    logger.info('--------- WEBHOOK REQUEST ---------', {
      headers: JSON.stringify(ctx.request.headers, null, 2),
      body: JSON.stringify(ctx.request.body, null, 2)
    });
    
    const payload = ctx.request.body;
    
    // Check if this is a valid webhook payload (an array from Helius)
    if (!Array.isArray(payload)) {
      logger.info('Invalid webhook payload format - expected array');
      ctx.status = 400;
      ctx.body = { success: false, error: 'Invalid webhook payload format - expected array' };
      return;
    }
    
    logger.info(`Received webhook with ${payload.length} transactions`);
    
    // Check if any of the transactions involve our program
    let relevantTransactionFound = false;
    
    for (const transaction of payload) {
      if (transaction.instructions) {
        const programInstructions = transaction.instructions.filter(
          (ix: any) => ix.programId === PROGRAM_ID.toString()
        );
        
        if (programInstructions.length > 0) {
          logger.info(`Found ${programInstructions.length} instructions for our program in transaction ${transaction.signature}`);
          relevantTransactionFound = true;
          break;
        }
      }
    }
    
    // If no relevant transactions found, we can skip reloading
    if (!relevantTransactionFound) {
      logger.info('No relevant transactions for our program found, skipping reload');
      ctx.status = 200;
      ctx.body = { success: true, message: 'No relevant transactions found' };
      return;
    }
    
    // Trigger a reload of all PDAs
    reloadCommitmentsAndUxto();

    // Check each transaction for PDA balance changes
    for (const transaction of payload) {
      try {
        await checkPDABalanceChange(transaction);
      } catch (error) {
        logger.error(`Error checking PDA balance change: ${error}`);
      }
    }
    
    // Respond with success
    ctx.status = 200;
    ctx.body = { success: true, message: 'Webhook received, PDA reload triggered' };
  } catch (error) {
    logger.error('Error handling webhook: ' + String(error));
    ctx.status = 500;
    ctx.body = { success: false, error: 'Internal server error' };
  }
}

/**
 * Trigger a reload of all PDAs
 * If a reload is already in progress, set a flag to trigger another reload after it completes
 */
export function reloadCommitmentsAndUxto(): void {
  if (reloadInProgress) {
    logger.info('PDA reload already in progress, queuing another reload for when it completes');
    reloadRequested = true;
    return;
  }
  
  reloadInProgress = true;
  logger.info('Starting PDA reload...');
  
  loadHistoricalPDAs()
    .then(() => {
      logger.info('PDA reload completed successfully');
      
      // Log the current state of encrypted outputs
      const count = userUxtosService.getEncryptedOutputCount();
      logger.info(`---------- ENCRYPTED OUTPUTS STATE ----------`);
      logger.info(`Total encrypted outputs: ${count}`);
      
      if (count > 0) {
        // Show last 10 outputs
        const outputs = userUxtosService.getAllEncryptedOutputs();
        // const lastOutputs = outputs.slice(0, 10);
        // logger.log(`Last ${lastOutputs.length} encrypted outputs:`);
        outputs.forEach((output, i) => {
          const index = outputs.length - i;
          logger.info(`  [${index}] ${output}`);
        });
        
        if (count > 10) {
          logger.info(`... and ${count - 10} more at the beginning`);
        }
      }
      logger.info(`----------- ENCRYPTED OUTPUTS FINISHED PROCESSING -------------`);
      
      reloadInProgress = false;
      
      // If another reload was requested while this one was running, trigger it now
      if (reloadRequested) {
        logger.info('Processing queued PDA reload request');
        reloadRequested = false;
        reloadCommitmentsAndUxto();
      }
    })
    .catch(error => {
      logger.error('Error during PDA reload:', error);
      reloadInProgress = false;
      
      // If another reload was requested, still try it despite the error
      if (reloadRequested) {
        logger.info('Processing queued PDA reload request after error');
        reloadRequested = false;
        reloadCommitmentsAndUxto();
      }
    });
}

/**
 * Check if a transaction contains balance changes for the tree_token_account PDA
 * Logs whether it's a deposit or withdrawal and the amount
 */
async function checkPDABalanceChange(transaction: any): Promise<void> {
  const { PublicKey } = require('@solana/web3.js');
  
  // Derive the tree_token_account PDA
  const [TREE_TOKEN_ACCOUNT] = PublicKey.findProgramAddressSync(
    [Buffer.from('tree_token')],
    PROGRAM_ID
  );
  
  const treeTokenAccountStr = TREE_TOKEN_ACCOUNT.toString();
  let balanceChange: number | null = null;
  
  // Method 1: Check accountData (Enhanced webhooks)
  if (transaction.accountData) {
    for (const accountData of transaction.accountData) {
      if (accountData.account === treeTokenAccountStr && accountData.nativeBalanceChange !== 0) {
        balanceChange = accountData.nativeBalanceChange;
        break;
      }
    }
  }
  
  // Method 2: Check preBalances vs postBalances (Raw webhooks)
  if (balanceChange === null && transaction.meta?.preBalances && transaction.meta?.postBalances && transaction.transaction?.message?.accountKeys) {
    const accountKeys = transaction.transaction.message.accountKeys;
    const treeTokenIndex = accountKeys.findIndex((key: string) => key === treeTokenAccountStr);
    
    if (treeTokenIndex !== -1) {
      const preBalance = transaction.meta.preBalances[treeTokenIndex];
      const postBalance = transaction.meta.postBalances[treeTokenIndex];
      
      if (preBalance !== undefined && postBalance !== undefined) {
        const change = postBalance - preBalance;
        if (change !== 0) {
          balanceChange = change;
        }
      }
    }
  }
  
  // Log the result
  if (balanceChange !== null) {
    const amountSOL = Math.abs(balanceChange) / 1e9;
    const signature = transaction.signature || 'unknown';
    
    const ddb = new DynamoDB.DocumentClient()
    let transactionStats
    if (balanceChange > 0) {
      logger.info(`checkPDABalanceChange DEPOSIT: ${amountSOL} SOL in transaction ${signature}`);
      transactionStats = await TransactionStatsRepository.getInstance(ddb).incrementDepositVolume(amountSOL, transaction.slot);
    } else {
      logger.info(`checkPDABalanceChange WITHDRAWAL: ${amountSOL} SOL in transaction ${signature}`);
      transactionStats = await TransactionStatsRepository.getInstance(ddb).incrementWithdrawalVolume(amountSOL, transaction.slot);
    }
    
    logger.info(`checkPDABalanceChange transactionStats: ${JSON.stringify(transactionStats)}`);
  }
} 