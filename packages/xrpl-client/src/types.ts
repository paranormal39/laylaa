// XRPL Types
// SPDX-License-Identifier: Apache-2.0

/**
 * XRPL NFT representation
 */
export interface XRPLNFT {
  NFTokenID: string;
  URI?: string;
  taxon: number;
  issuer: string;
  nft_serial: number;
  flags?: number;
  transferFee?: number;
}

/**
 * XRPL NFT offer
 */
export interface XRPLOffer {
  index: string;
  owner: string;
  amount: string;
  nft_id: string;
  flags: number;
  expiration?: number;
}

/**
 * Wallet info
 */
export interface XRPLWalletInfo {
  address: string;
  publicKey: string;
  seed?: string;
  balance: string;
}

/**
 * Transaction result
 */
export interface XRPLTxResult {
  hash: string;
  status: 'success' | 'failed';
  validated: boolean;
  meta?: unknown;
}

/**
 * Burn receipt for bridge
 */
export interface XRPLBurnReceipt {
  transactionHash: string;
  tokenId: string;
  issuer: string;
  taxon: number;
  burnedAt: number;
  ledgerIndex: number;
}

/**
 * Connection config
 */
export interface XRPLConfig {
  server: string;
  faucetUrl?: string;
  network: 'mainnet' | 'testnet' | 'devnet';
}
