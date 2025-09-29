import { logger } from '../utils/logger';
import * as cron from 'node-cron';

class CipherOwlTokenManager {
  private static instance: CipherOwlTokenManager;
  private currentToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  
  private readonly clientId = process.env.CIPHER_OWL_CLIENT_ID || '';
  private readonly clientSecret = process.env.CIPHER_OWL_CLIENT_SECRET || '';
  
  private constructor() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing CIPHER_OWL_CLIENT_ID or CIPHER_OWL_CLIENT_SECRET');
    }
  }
  
  public static getInstance(): CipherOwlTokenManager {
    if (!CipherOwlTokenManager.instance) {
      CipherOwlTokenManager.instance = new CipherOwlTokenManager();
    }
    return CipherOwlTokenManager.instance;
  }
  
  public getCurrentToken(): string | null {
    if (this.currentToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.currentToken;
    }
    return null;
  }
  
  public getAuthorizationHeader(): string | null {
    const token = this.getCurrentToken();
    return token ? `Bearer ${token}` : null;
  }
  
  public getTokenExpiresAt(): Date | null {
    return this.tokenExpiresAt;
  }
  
  private async fetchToken(): Promise<boolean> {
    try {
      logger.info('Refreshing CipherOwl OAuth token...');
      
      const requestBody = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: 'svc.cipherowl.ai',
        grant_type: 'client_credentials',
        force_refresh: true
      };
      
      const response = await fetch('https://svc.cipherowl.ai/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        logger.error(`Failed to fetch CipherOwl token: ${response.status}`);
        return false;
      }
      
      const tokenData = await response.json();
      this.currentToken = tokenData.access_token;
      
      const expirationMs = (tokenData.expires_in * 1000);
      this.tokenExpiresAt = new Date(Date.now() + expirationMs);
      
      logger.info(`CipherOwl token refreshed successfully`);
      return true;
    } catch (error) {
      logger.error('Error fetching CipherOwl token:', error);
      return false;
    }
  }
  
  public async startTokenRefreshCron(): Promise<void> {
    // Fetch token immediately on startup
    await this.fetchToken();
    
    // Run every 4 hours: '0 */4 * * *' (at minute 0 of every 4th hour)
    cron.schedule('0 */4 * * *', async () => {
      logger.info('Running scheduled CipherOwl token refresh...');
      await this.fetchToken();
    }, {
      timezone: 'UTC'   // Use UTC to avoid timezone issues
    });
    logger.info('CipherOwl token refresh cron started (every 4 hours)');
  }
}

// Export singleton instance
export const cipherOwlTokenManager = CipherOwlTokenManager.getInstance();
