import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PrivateCreditClient } from '@arcium/private-credit-sdk';
import { OrchestratorService } from './services/orchestrator';
import { MXEService } from './services/mxe';
import { SquadsService } from './services/squads';
import { SolanaService } from './services/solana';
import { logger } from './utils/logger';
import { DatabaseService } from './services/database';
import { QueueService } from './services/queue';

// Load environment variables
dotenv.config();

const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || 'localhost';

async function main() {
  try {
    // Initialize services
    logger.info('Initializing orchestrator services...');

    // Database service
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    // Queue service
    const queueService = new QueueService();
    await queueService.initialize();

    // Solana connection
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Load program
    const programId = new PublicKey(process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    const program = new Program(
      {} as any, // IDL will be loaded from build artifacts
      programId,
      new AnchorProvider(connection, {} as any, {})
    );

    // Initialize the private credit client (API-only)
    const privateCreditClient = new PrivateCreditClient(
      process.env.ORCHESTRATOR_URL || 'http://localhost:3001'
    );

    // Initialize services
    const mxeService = new MXEService(
      connection,
      process.env.ARCIUM_CLUSTER_URL || 'https://mxe.arcium.com',
      new PublicKey(process.env.ARCIUM_CLUSTER_PUBKEY || ''),
      process.env.ARCIUM_API_KEY || '',
      databaseService
    );
    const squadsService = new SquadsService(connection, databaseService);
    const solanaService = new SolanaService(connection, program, databaseService);
    const orchestratorService = new OrchestratorService(
      mxeService,
      squadsService,
      solanaService,
      queueService,
      databaseService
    );

    // Initialize orchestrator
    await orchestratorService.initialize();

    // Express app
    const app = express();
    app.use(helmet());
    app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API routes
    app.use('/api/v1/pools', orchestratorService.getPoolRoutes());
    app.use('/api/v1/loans', orchestratorService.getLoanRoutes());
    app.use('/api/v1/attestations', orchestratorService.getAttestationRoutes());
    app.use('/api/v1/audits', orchestratorService.getAuditRoutes());

    // WebSocket server
    const server = createServer(app);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      logger.info('New WebSocket connection established');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await orchestratorService.handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });
    });

    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`Orchestrator server running on ${HOST}:${PORT}`);
      logger.info(`WebSocket server running on ws://${HOST}:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down orchestrator...');
      await orchestratorService.shutdown();
      await databaseService.close();
      await queueService.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
