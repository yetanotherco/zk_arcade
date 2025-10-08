import { anvil, sepolia, mainnet } from 'viem/chains'

// Reads from .env file, but defaults to devnet if not set
export const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
export const ZK_ARCADE_URL = process.env.ZK_ARCADE_URL || "https://test.zkarcade.com";
export const BATCHER_URL = process.env.BATCHER_URL || "wss://sepolia.batcher.alignedlayer.com";

export const BATCHER_PAYMENT_SERVICE_ADDR = process.env.BATCHER_PAYMENT_SERVICE_ADDR || "0x403dE630751e148bD71BFFcE762E5667C0825399";

export const CHAIN_NAME = process.env.CHAIN_NAME || 'sepolia';

// Used chain object from viem. Can be sepolia, anvil or mainnet. Defaults to anvil
export const USED_CHAIN = CHAIN_NAME === 'sepolia' ? sepolia : (CHAIN_NAME === 'mainnet' ? mainnet : anvil);
