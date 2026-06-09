// NFT Marketplace Shared Types
// SPDX-License-Identifier: Apache-2.0

/**
 * NFT Metadata structure following ERC-721/ERC-1155 standards
 * adapted for cross-chain compatibility
 */
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: NFTAttribute[];
  properties?: Record<string, unknown>;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date' | string;
}

/**
 * Collection Metadata
 */
export interface CollectionMetadata {
  name: string;
  description: string;
  image: string;
  banner_image?: string;
  external_link?: string;
  seller_fee_basis_points: number;
  fee_recipient: string;
  primary_asset_contracts?: string[];
  traits?: Record<string, { value: string; count: number }[]>;
}

/**
 * Supported blockchain networks
 */
export enum Network {
  XRPL_TESTNET = 'xrpl-testnet',
  XRPL_MAINNET = 'xrpl-mainnet',
  MIDNIGHT_PREVIEW = 'midnight-preview',
  MIDNIGHT_PREPROD = 'midnight-preprod',
  MIDNIGHT_MAINNET = 'midnight-mainnet',
}

/**
 * NFT source chain type
 */
export enum SourceChain {
  XRPL = 'xrpl',
  MIDNIGHT = 'midnight',
}

/**
 * NFT standard types
 */
export enum NFTStandard {
  XLS20 = 'XLS20',        // XRPL NFT standard
  MIDNIGHT_NFT = 'MidnightNFT',  // Midnight native NFT
}

/**
 * Unified NFT type representing NFTs from both chains
 */
export interface UnifiedNFT {
  id: string;
  tokenId: string;
  contractAddress?: string;
  issuer?: string;
  name: string;
  description: string;
  image: string;
  metadataUri: string;
  sourceChain: SourceChain;
  network: Network;
  standard: NFTStandard;
  owner: string;
  collection?: {
    id: string;
    name: string;
    slug: string;
  };
  attributes: NFTAttribute[];
  
  // XRPL specific
  taxon?: number;
  transferFee?: number;
  flags?: number;
  sequence?: number;
  
  // Midnight specific
  isMigrated?: boolean;
  migrationProof?: MigrationProof;
  
  // Marketplace
  listing?: Listing;
}

/**
 * Migration proof for Burn-To-Mint bridge
 */
export interface MigrationProof {
  sourceChain: SourceChain;
  sourceIssuer: string;
  sourceTokenId: string;
  sourceTransactionHash: string;
  migrationTimestamp: number;
  burnReceipt: BurnReceipt;
}

/**
 * Burn receipt from XRPL
 */
export interface BurnReceipt {
  transactionHash: string;
  burnedTokenId: string;
  issuer: string;
  taxon: number;
  burnedAt: number;
  verified: boolean;
  verifiedAt?: number;
  verifiedBy: string; // Evernode service address
}

/**
 * Marketplace listing
 */
export interface Listing {
  id: string;
  nftId: string;
  seller: string;
  price: string; // In base units (drops for XRPL, wei/litoshis equivalent)
  priceFormatted: string;
  currency: string;
  createdAt: number;
  expiresAt?: number;
  status: ListingStatus;
  sourceChain: SourceChain;
  
  // For XRPL
  xrplOfferIndex?: string;
}

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Collection type
 */
export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  bannerImage?: string;
  creator: string;
  contractAddress?: string;
  issuer?: string;
  taxon?: number; // XRPL specific
  sourceChain: SourceChain;
  network: Network;
  totalSupply: number;
  floorPrice?: string;
  volumeTraded?: string;
  createdAt: number;
  isVerified: boolean;
  isApprovedForMigration: boolean;
}

/**
 * User profile
 */
export interface UserProfile {
  address: string;
  sourceChain: SourceChain;
  displayName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  twitter?: string;
  createdAt: number;
}

/**
 * Marketplace activity/event
 */
export interface MarketplaceActivity {
  id: string;
  type: ActivityType;
  nftId: string;
  nftName: string;
  nftImage: string;
  collectionName?: string;
  from: string;
  to?: string;
  price?: string;
  currency: string;
  transactionHash: string;
  timestamp: number;
  sourceChain: SourceChain;
}

export enum ActivityType {
  MINT = 'mint',
  LIST = 'list',
  SALE = 'sale',
  CANCEL = 'cancel',
  TRANSFER = 'transfer',
  BURN = 'burn',
  MIGRATION = 'migration',
  BID = 'bid',
}

/**
 * Wallet connection state
 */
export interface WalletState {
  isConnected: boolean;
  address?: string;
  network?: Network;
  sourceChain?: SourceChain;
  balance?: string;
  publicKey?: string;
}

/**
 * Bridge operation status
 */
export interface BridgeOperation {
  id: string;
  type: 'burn_to_mint';
  status: BridgeStatus;
  sourceChain: SourceChain;
  targetChain: SourceChain;
  sourceNft: UnifiedNFT;
  burnTransactionHash?: string;
  mintTransactionHash?: string;
  receipt?: BurnReceipt;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export enum BridgeStatus {
  PENDING_BURN = 'pending_burn',
  BURN_CONFIRMED = 'burn_confirmed',
  VERIFYING = 'verifying',
  PENDING_MINT = 'pending_mint',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * IPFS upload result
 */
export interface IPFSUploadResult {
  cid: string;
  uri: string;
  size: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Contract configuration
 */
export interface ContractConfig {
  nftContractAddress?: string;
  collectionContractAddress?: string;
  marketplaceContractAddress?: string;
  bridgeContractAddress?: string;
  network: Network;
  proofServerUrl: string;
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
}
