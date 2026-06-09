// Registry of XRPL fungible tokens accepted for token-to-NFT minting.
// SPDX-License-Identifier: Apache-2.0
//
// These are mainnet tokens; minting output is on XRPL testnet + Midnight preview.
// Currency is stored as the raw 40-char hex (XRPL canonical form for >3-char codes).

import type { XrplNetwork } from '@/lib/xrpl';

export interface TokenDef {
  id: string;
  name: string;
  issuer: string;
  currencyHex: string;
  network: XrplNetwork;
  /** Minimum balance required for hold-gated minting. */
  holdThreshold: string;
}

export const TOKENS: TokenDef[] = [
  {
    id: 'gamerxgold',
    name: 'GamerXGold',
    issuer: 'rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2',
    currencyHex: '47616D657258476F6C6400000000000000000000',
    network: 'mainnet',
    holdThreshold: '1',
  },
];

// Canonical XRPL blackhole address used as the burn destination.
export const BLACKHOLE_ADDRESS = 'rrrrrrrrrrrrrrrrrrrrrhoLvTp';

export function getToken(id: string): TokenDef | undefined {
  return TOKENS.find((t) => t.id === id);
}
