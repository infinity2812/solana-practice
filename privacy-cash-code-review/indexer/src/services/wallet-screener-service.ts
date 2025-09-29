import { logger } from '../utils/logger';
import { cipherOwlTokenManager } from '../cron/refresh-cipher-owl-token';

export enum ScreenResult {
  RISKY = 'RISKY',
  NOT_RISKY = 'NOT_RISKY',
  API_ERROR = 'API_ERROR'
}

export class WalletScreenerService {
  /**
   * Screen a Solana wallet address for risk using CipherOwl API
   * @param address The wallet address to screen
   * @returns Promise<ScreenResult> - RISKY, NOT_RISKY, or API_ERROR
   */
  static async screenAddress(address: string): Promise<ScreenResult> {
    try {
      const authHeader = cipherOwlTokenManager.getAuthorizationHeader();
      
      if (!authHeader) {
        logger.error('No valid CipherOwl token available for wallet screening');
        return ScreenResult.API_ERROR;
      }

      const url = `https://svc.cipherowl.ai/api/screen/v1/chains/solana_mainnet/addresses/${address}`;
      
      logger.info(`Screening wallet address: ${address}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`CipherOwl screening failed: ${response.status} ${response.statusText}`, {
          address,
          error: errorText
        });
        
        return ScreenResult.API_ERROR;
      }

      const result = await response.json();
      
      logger.info(`Wallet screening completed for ${address}`, {
        foundRisk: result.foundRisk,
        config: result.config,
        version: result.version
      });

      return result.foundRisk === true ? ScreenResult.RISKY : ScreenResult.NOT_RISKY;

    } catch (error) {
      logger.error('Error screening wallet address:', error);
      return ScreenResult.API_ERROR;
    }
  }
}
