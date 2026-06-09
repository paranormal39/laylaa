// Network Constants
// SPDX-License-Identifier: Apache-2.0

import { Network, SourceChain } from '../types/nft.js';

/**
 * Network configurations
 */
export const NETWORKS: Record<Network, {
  name: string;
  chain: SourceChain;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl?: string;
  isTestnet: boolean;
}> = {
  [Network.XRPL_TESTNET]: {
    name: 'XRPL Testnet',
    chain: SourceChain.XRPL,
    rpcUrl: 'wss://s.altnet.rippletest.net:51233',
    explorerUrl: 'https://testnet.xrpl.org',
    faucetUrl: 'https://faucet.altnet.rippletest.net',
    isTestnet: true,
  },
  [Network.XRPL_MAINNET]: {
    name: 'XRPL Mainnet',
    chain: SourceChain.XRPL,
    rpcUrl: 'wss://xrplcluster.com',
    explorerUrl: 'https://livenet.xrpl.org',
    isTestnet: false,
  },
  [Network.MIDNIGHT_PREVIEW]: {
    name: 'Midnight Preview',
    chain: SourceChain.MIDNIGHT,
    rpcUrl: 'https://indexer.preview.midnight.network',
    explorerUrl: 'https://explorer.preview.midnight.network',
    faucetUrl: 'https://faucet.preview.midnight.network',
    isTestnet: true,
  },
  [Network.MIDNIGHT_PREPROD]: {
    name: 'Midnight Preprod',
    chain: SourceChain.MIDNIGHT,
    rpcUrl: 'https://indexer.preprod.midnight.network',
    explorerUrl: 'https://explorer.preprod.midnight.network',
    faucetUrl: 'https://faucet.preprod.midnight.network',
    isTestnet: true,
  },
  [Network.MIDNIGHT_MAINNET]: {
    name: 'Midnight Mainnet',
    chain: SourceChain.MIDNIGHT,
    rpcUrl: 'https://indexer.midnight.network',
    explorerUrl: 'https://explorer.midnight.network',
    isTestnet: false,
  },
};

/**
 * Default networks for development
 */
export const DEFAULT_XRPL_NETWORK = Network.XRPL_TESTNET;
export const DEFAULT_MIDNIGHT_NETWORK = Network.MIDNIGHT_PREVIEW;

/**
 * Currency constants
 */
export const CURRENCIES = {
  XRP: 'XRP',
  NIGHT: 'NIGHT',
  DUST: 'DUST',
} as const;

/**
 * XRPL specific constants
 */
export const XRPL_CONSTANTS = {
  // NFT offer create transaction type
  OFFER_CREATE: 'NFTokenCreateOffer',
  // NFT offer accept transaction type
  OFFER_ACCEPT: 'NFTokenAcceptOffer',
  // NFT mint transaction type
  NFT_MINT: 'NFTokenMint',
  // NFT burn transaction type
  NFT_BURN: 'NFTokenBurn',
  // Base fee in drops (1 XRP = 1,000,000 drops)
  BASE_FEE: '12',
  // Transaction validity in seconds
  TX_VALIDITY: 300,
  // Maximum NFT transfer fee (50% in basis points)
  MAX_TRANSFER_FEE: 5000,
  // Maximum URI length
  MAX_URI_LENGTH: 256,
  // NFTokenMint flags
  FLAGS: {
    BURNABLE: 0x00000001,
    ONLY_XRP: 0x00000002,
    TRANSFERABLE: 0x00000008,
    MINTABLE: 0x00000010,
  },
} as const;

/**
 * Midnight specific constants
 */
export const MIDNIGHT_CONSTANTS = {
  // Maximum metadata CID length
  MAX_CID_LENGTH: 64,
  // Dust for transaction fees
  DEFAULT_DUST_FEE: 1000000000000000n,
  // Contract deployment fee
  CONTRACT_DEPLOYMENT_FEE: 5000000000000000n,
  // NFT minting fee
  NFT_MINT_FEE: 1000000000000000n,
} as const;

/**
 * IPFS constants
 */
export const IPFS_CONSTANTS = {
  GATEWAYS: [
    'https://ipfs.io/ipfs',
    'https://gateway.pinata.cloud/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://ipfs.filebase.io/ipfs',
  ],
  PINATA_API_URL: 'https://api.pinata.cloud',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
} as const;

/**
 * Marketplace constants
 */
export const MARKETPLACE_CONSTANTS = {
  // Platform fee in basis points (2.5%)
  PLATFORM_FEE_BPS: 250,
  // Minimum listing price (in base units)
  MIN_LISTING_PRICE: '1000000', // 1 XRP / equivalent
  // Maximum listing duration in days
  MAX_LISTING_DURATION_DAYS: 90,
  // Default page size for pagination
  DEFAULT_PAGE_SIZE: 20,
  // Maximum page size
  MAX_PAGE_SIZE: 100,
  // Royalty basis points for creators
  DEFAULT_ROYALTY_BPS: 500, // 5%
} as const;

/**
 * Bridge constants
 */
export const BRIDGE_CONSTANTS = {
  // Verification timeout in minutes
  VERIFICATION_TIMEOUT_MINUTES: 30,
  // Required confirmations for XRPL burn
  REQUIRED_CONFIRMATIONS: 1,
  // Maximum time to wait for burn confirmation
  BURN_CONFIRMATION_TIMEOUT: 600000, // 10 minutes
  // Replay protection window (24 hours)
  REPLAY_PROTECTION_WINDOW: 24 * 60 * 60 * 1000,
} as const;
