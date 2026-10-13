import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { config } from './config/env.ts';
import authRoutes from './routes/authRoutes.ts';
import submissionRoutes from './routes/submissionRoutes.ts';

export const app = express();

// Trust reverse proxy if in production
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration supporting credentials from frontend origin
const allowedOrigins = [
  config.clientOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) or matched origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for local testnet testing
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'ok',
    service: 'trustgraph-api',
    timestamp: new Date().toISOString(),
    database: dbStatusMap[dbStatus] || 'unknown',
    blockchain: {
      network: 'Monad Testnet',
      chainId: config.monadChainId,
      rpc: config.monadRpcUrl,
      registryAddress: config.trustGraphRegistryAddress,
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Central Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});
