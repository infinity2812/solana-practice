import { Table } from "@typedorm/common"
import { EntityManager, createConnection, getEntityManager, getScanManager } from "@typedorm/core"
import { DynamoDB } from "aws-sdk"
import { TransactionStats } from "../entity/transaction-stats"
import { logger } from "../utils/logger"

export const STREAM_MATCH_TABLE_NAME = 'PRIVACY_TRANSACTION'

const CONNECTION_NAME = 'TransactionRepository'

const TRANSACTION_STATS_ID = 'TRANSACTION_STATS_HARDCODED_ID'

export class TransactionStatsRepository {

  private static instance: TransactionStatsRepository

  private static createEntityManager(documentClient: DynamoDB.DocumentClient) {
    const roomTable = new Table({
      name: STREAM_MATCH_TABLE_NAME,
      partitionKey: 'transactionStatsId'
    })

    try {
      return getEntityManager(CONNECTION_NAME)
    } catch (err) {
      createConnection({
        name: CONNECTION_NAME,
        table: roomTable,
        entities: [TransactionStats],
        documentClient
      })
    }

    return getEntityManager(CONNECTION_NAME)
  }

  public static getInstance(documentClient: DynamoDB.DocumentClient) {
    if (this.instance !== undefined) {
      return this.instance
    }

    this.instance = new TransactionStatsRepository(
      this.createEntityManager(documentClient))
    return this.instance
  }

  private constructor(private readonly entityManager: EntityManager) {}

  /**
   * Get the current transaction stats or create a new one if it doesn't exist
   */
  private async getTransactionStats(): Promise<TransactionStats> {
    try {
      const stats = await this.entityManager.findOne(TransactionStats, {
        transactionStatsId: TRANSACTION_STATS_ID
      });
      
      return stats!;
    } catch (error) {
      logger.error('Error getting or creating transaction stats:', error);
      throw error;
    }
  }

  /**
   * Increment deposit volume and update total volume and last synced block
   * @param volume - The volume to add to deposits
   * @param slotNumber - The latest synced slot number
   */
  async incrementDepositVolume(volume: number, slotNumber: number): Promise<void> {
    try {
      const stats = await this.getTransactionStats();
      
      stats.totalDepositVolume += volume;
      stats.totalVolume += volume;
      stats.lastSyncedSlotNumber = slotNumber;
      
      await this.entityManager.update(TransactionStats, {
        transactionStatsId: TRANSACTION_STATS_ID
      }, {
        totalDepositVolume: stats.totalDepositVolume,
        totalVolume: stats.totalVolume,
        lastSyncedSlotNumber: stats.lastSyncedSlotNumber
      });
      
      logger.info(`Incremented deposit volume by ${volume}, new total deposit: ${stats.totalDepositVolume}, new total volume: ${stats.totalVolume}`);
    } catch (error) {
      logger.error('Error incrementing deposit volume:', error);
      throw error;
    }
  }

  /**
   * Increment withdrawal volume and update total volume and last synced block
   * @param volume - The volume to add to withdrawals
   * @param slotNumber - The latest synced slot number
   */
  async incrementWithdrawalVolume(volume: number, slotNumber: number): Promise<void> {
    try {
      const stats = await this.getTransactionStats();
      
      stats.totalWithdrawalVolume += volume;
      stats.totalVolume += volume;
      stats.lastSyncedSlotNumber = slotNumber;
      
      await this.entityManager.update(TransactionStats, {
        transactionStatsId: TRANSACTION_STATS_ID
      }, {
        totalWithdrawalVolume: stats.totalWithdrawalVolume,
        totalVolume: stats.totalVolume,
        lastSyncedSlotNumber: stats.lastSyncedSlotNumber
      });
      
      logger.info(`Incremented withdrawal volume by ${volume}, new total withdrawal: ${stats.totalWithdrawalVolume}, new total volume: ${stats.totalVolume}`);
    } catch (error) {
      logger.error('Error incrementing withdrawal volume:', error);
      throw error;
    }
  }


}