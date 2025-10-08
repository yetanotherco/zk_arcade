import { anvil, sepolia, mainnet } from 'viem/chains'

// Reads from .env file, but defaults to devnet if not set
export const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
export const ZK_ARCADE_URL = process.env.ZK_ARCADE_URL || "http://localhost:4005";
export const BATCHER_URL = process.env.BATCHER_URL || "http://localhost:8080";

export const BATCHER_PAYMENT_SERVICE_ADDR = process.env.BATCHER_PAYMENT_SERVICE_ADDR || "0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650";

export const CHAIN_NAME = process.env.CHAIN_NAME || 'anvil';

// Used chain object from viem. Can be sepolia, anvil or mainnet. Defaults to anvil
export const USED_CHAIN = CHAIN_NAME === 'sepolia' ? sepolia : (CHAIN_NAME === 'mainnet' ? mainnet : anvil);
