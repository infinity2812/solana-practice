import { Attribute, Entity } from "@typedorm/common";

@Entity({
  name: 'transaction_stats',
  primaryKey: {
    partitionKey: '{{transactionStatsId}}',
  }
})
export class TransactionStats {
  @Attribute()
  transactionStatsId: string
  @Attribute()
  totalDepositVolume: number
  @Attribute()
  totalWithdrawalVolume: number
  @Attribute()
  totalVolume: number
  @Attribute()
  lastSyncedSlotNumber: number

  constructor(transactionStatsId: string, totalDepositVolume: number, totalWithdrawalVolume: number, totalVolume: number, lastSyncedSlotNumber: number) {
    this.transactionStatsId = transactionStatsId;
    this.totalDepositVolume = totalDepositVolume;
    this.totalWithdrawalVolume = totalWithdrawalVolume;
    this.totalVolume = totalVolume;
    this.lastSyncedSlotNumber = lastSyncedSlotNumber;
  }
}
