import mongoose from 'mongoose';
import { app } from './app.ts';
import { config } from './config/env.ts';

async function bootstrap() {
  console.log('🚀 Starting TrustGraph Backend Server...');
  console.log(`📡 Connecting to MongoDB at: ${config.mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);

  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB successfully.');
  } catch (err) {
    console.warn('⚠️ Warning: MongoDB connection failed:', (err as Error).message);
    console.warn('ℹ️ Ensure MongoDB is running locally (e.g., mongod) or provide MONGODB_URI in .env');
  }

  const server = app.listen(config.port, () => {
    console.log(`⚡ TrustGraph API Server listening on port ${config.port}`);
    console.log(`🌐 Health check available at: http://localhost:${config.port}/api/health`);
    console.log(`🔗 Monad Testnet Target: ${config.monadRpcUrl} (Chain ID: ${config.monadChainId})`);
    console.log(`📝 TrustGraphRegistry Address: ${config.trustGraphRegistryAddress}`);
  });

  const shutdown = async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(async () => {
      await mongoose.connection.close();
      console.log('💤 MongoDB connection closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap();
