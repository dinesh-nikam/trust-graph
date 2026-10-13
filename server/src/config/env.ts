import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root if present
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trustgraph',
  jwtSecret: process.env.JWT_SECRET || 'trustgraph_hackathon_super_secret_jwt_key_2026',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  monadRpcUrl: process.env.MONAD_TESTNET_RPC_URL || process.env.VITE_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz',
  monadChainId: parseInt(process.env.MONAD_CHAIN_ID || '10143', 10),
  trustGraphRegistryAddress: process.env.VITE_TRUST_GRAPH_REGISTRY_ADDRESS || '0x2974750CDBc443f4c2cBe8cDb5A79169dB23654E',
  proofOfWorkRegistryAddress: process.env.VITE_PROOF_OF_WORK_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
};
