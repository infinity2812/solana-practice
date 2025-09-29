import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

export const FIELD_SIZE = new BN('21888242871839275222246405745257275088548364400416034343698204186575808495617')

// Fee recipient account for all transactions
export const FEE_RECIPIENT_ACCOUNT = new PublicKey('EjusM5jooQkcfGFWrZPmzw9GeoxFpJKjdsSmHLQe3GYx');

// Fee rates in basis points (1 basis point = 0.01%, 10000 = 100%)
export const DEPOSIT_FEE_RATE = 0; // 0% - Free deposits
export const WITHDRAW_FEE_RATE = 25; // 0.25% - Fee on withdrawals
export const FEE_ERROR_MARGIN = 500; // 5% tolerance (minimum fee = 95% of expected)

// Tree configuration constants
export const DEFAULT_TREE_HEIGHT = 26; // Default Merkle tree height (supports 2^26 = ~67M leaves)
export const DEFAULT_ROOT_HISTORY_SIZE = 100; // Default root history size