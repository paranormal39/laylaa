// Trending / aggregator client for XRPL mainnet NFTs.
// Tries Bithomp API first (requires an API key from apps.bithomp.com).
// Falls back to a curated sample list so the UI never breaks.
// SPDX-License-Identifier: Apache-2.0

import type { UnifiedNFT } from '@/lib/types';

const BITHOMP_API_KEY = import.meta.env.VITE_BITHOMP_API_KEY as string | undefined;

export interface AggregatorResult {
  nfts: UnifiedNFT[];
  source: 'bithomp' | 'fallback';
}

const FALLBACK_NFTS: UnifiedNFT[] = [
  {
    id: 'xrpl-nft-001',
    source: 'xrpl-mainnet',
    name: 'GamerXGold Genesis',
    description: 'First-edition GamerXGold community NFT. Hold 1 GamerXGold to mint.',
    owner: 'rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2',
    collection: 'GamerXGold',
    taxon: 0,
    tokenId: '000100001C32529B7EE41BE6A5E5BC3E0A86B9D9C2F6E3A5B4C7D8E9F0A1B2C3',
    price: '10',
    currency: 'XRP',
    metadata: 'ipfs://QmGenesis',
  },
  {
    id: 'xrpl-nft-002',
    source: 'xrpl-mainnet',
    name: 'XRdoge Pioneer',
    description: 'XRdoge pioneer badge. Burn 1 XRdoge to claim.',
    owner: 'rLqUC2eCPohYvJCEBJ77eCCqVL2uEiczjA',
    collection: 'XRdoge',
    taxon: 1,
    tokenId: '000200002D4363AC8FF52CF7B6F6CD4F1B97C0EAD3G7F4B6C5D8E9F0A1B2C3D4',
    price: '5',
    currency: 'XRP',
    metadata: 'ipfs://QmPioneer',
  },
];

async function bithompFetch(): Promise<UnifiedNFT[]> {
  if (!BITHOMP_API_KEY) throw new Error('No BITHOMP_API_KEY configured');

  const res = await fetch('https://api.bithomp.com/v4/nfts?limit=20&order=trending', {
    headers: { 'x-bithomp-api-key': BITHOMP_API_KEY },
  });

  if (!res.ok) throw new Error(`Bithomp ${res.status}`);
  const data = (await res.json()) as {
    nfts?: Array<{
      nfTokenID?: string;
      issuer?: string;
      uri?: string;
      taxon?: number;
      price?: string;
    }>;
  };

  return (data.nfts ?? []).map((n, i) => ({
    id: n.nfTokenID ?? `bithomp-${i}`,
    source: 'xrpl-mainnet' as const,
    name: n.nfTokenID ? `XRPL NFT ${n.nfTokenID.slice(-6)}` : `XRPL NFT #${i}`,
    owner: n.issuer ?? 'unknown',
    tokenId: n.nfTokenID,
    taxon: n.taxon ?? 0,
    price: n.price,
    currency: 'XRP',
    metadata: n.uri,
  }));
}

export async function getTrendingNFTs(): Promise<AggregatorResult> {
  try {
    const nfts = await bithompFetch();
    return { nfts, source: 'bithomp' };
  } catch {
    return { nfts: FALLBACK_NFTS, source: 'fallback' };
  }
}
