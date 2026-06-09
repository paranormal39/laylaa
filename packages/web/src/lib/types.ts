// Shared marketplace types used across pages and lib modules.
// SPDX-License-Identifier: Apache-2.0

export interface UnifiedNFT {
  id: string;
  source: 'xrpl-mainnet' | 'xrpl-testnet' | 'midnight-preview';
  name: string;
  description?: string;
  imageUrl?: string;
  owner: string;
  price?: string;
  currency?: string;
  issuer?: string;
  collection?: string;
  taxon?: number;
  tokenId?: string;
  metadata?: string;
}
