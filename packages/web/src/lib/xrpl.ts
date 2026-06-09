// Network-aware read-only XRPL helpers for the dApp (signing is delegated to
// Xaman). Supports mainnet (listings + tokens) and testnet (mint targets).
// SPDX-License-Identifier: Apache-2.0

import { Client, dropsToXrp } from 'xrpl';
import { Buffer } from 'buffer';

export type XrplNetwork = 'mainnet' | 'testnet' | 'devnet';

export interface XRPLNFT {
  NFTokenID: string;
  URI?: string;
  NFTokenTaxon: number;
  Issuer?: string;
  nft_serial?: number;
}

export interface XRPLSellOffer {
  nft_offer_index: string;
  amount: string; // drops (XRP) or token amount object stringified
  owner: string;
  destination?: string;
}

export interface XRPLTokenLine {
  currency: string; // raw (hex or 3-char)
  currencyName: string; // decoded human-readable
  issuer: string;
  balance: string;
}

// Endpoints are tried in order; the first reachable one wins.
const ENDPOINTS: Record<XrplNetwork, string[]> = {
  mainnet: ['wss://xrplcluster.com', 'wss://s1.ripple.com', 'wss://s2.ripple.com'],
  testnet: ['wss://testnet.xrpl-labs.com', 'wss://s.altnet.rippletest.net:51233'],
  devnet: ['wss://s.devnet.rippletest.net:51233'],
};

// Decode an XRPL currency code: 3-char ISO codes pass through; 40-char hex
// codes are decoded to UTF-8 (trailing zero padding stripped).
export function decodeCurrency(currency: string): string {
  if (!currency) return currency;
  if (currency.length === 3) return currency;
  if (/^[0-9A-Fa-f]{40}$/.test(currency)) {
    const ascii = Buffer.from(currency, 'hex').toString('utf8').replace(/\0+$/, '').trim();
    return ascii || currency;
  }
  return currency;
}

async function withClient<T>(network: XrplNetwork, fn: (c: Client) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const url of ENDPOINTS[network]) {
    const client = new Client(url, { connectionTimeout: 20000 });
    try {
      await client.connect();
      try {
        return await fn(client);
      } finally {
        await client.disconnect().catch(() => {});
      }
    } catch (e) {
      lastError = e;
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
  throw new Error(
    `Could not reach any XRPL ${network} endpoint. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function getBalance(address: string, network: XrplNetwork = 'mainnet'): Promise<string> {
  return withClient(network, async (c) => {
    const res = await c.request({ command: 'account_info', account: address });
    return dropsToXrp(res.result.account_data.Balance).toString();
  });
}

export async function getNFTs(address: string, network: XrplNetwork = 'mainnet'): Promise<XRPLNFT[]> {
  return withClient(network, async (c) => {
    const res = await c.request({ command: 'account_nfts', account: address });
    return (res.result.account_nfts as unknown as XRPLNFT[]).map((n) => ({
      ...n,
      URI: n.URI ? Buffer.from(n.URI, 'hex').toString('utf8') : undefined,
    }));
  });
}

// Fungible-token trustlines held by an account (used for hold-gated minting).
export async function getTokenLines(
  address: string,
  network: XrplNetwork = 'mainnet',
): Promise<XRPLTokenLine[]> {
  return withClient(network, async (c) => {
    const res = await c.request({ command: 'account_lines', account: address });
    return (res.result.lines as Array<{ currency: string; account: string; balance: string }>).map((l) => ({
      currency: l.currency,
      currencyName: decodeCurrency(l.currency),
      issuer: l.account,
      balance: l.balance,
    }));
  });
}

// Balance of one specific token (currency+issuer). Returns '0' if no trustline.
export async function getTokenBalance(
  address: string,
  currency: string,
  issuer: string,
  network: XrplNetwork = 'mainnet',
): Promise<string> {
  const lines = await getTokenLines(address, network);
  const match = lines.find((l) => l.issuer === issuer && (l.currency === currency || l.currencyName === decodeCurrency(currency)));
  return match?.balance ?? '0';
}

export interface IncomingOffer {
  offerId: string;
  nftId: string;
  destination: string;
  network: XrplNetwork;
  metadataUri?: string;
  createdAt: number;
}

// Pending NFT sell offers sent to a specific address by the backend mint wallet.
export async function getIncomingOffers(address: string, network: XrplNetwork = 'devnet'): Promise<IncomingOffer[]> {
  const res = await fetch(`/api/xrpl/incoming-offers/${encodeURIComponent(address)}?network=${network}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { offers: IncomingOffer[] };
  return data.offers ?? [];
}

// Active sell offers for an NFT (so the marketplace can show a price).
export async function getNFTSellOffers(
  nftId: string,
  network: XrplNetwork = 'mainnet',
): Promise<XRPLSellOffer[]> {
  return withClient(network, async (c) => {
    try {
      const res = await c.request({ command: 'nft_sell_offers', nft_id: nftId });
      return (res.result.offers as unknown as XRPLSellOffer[]) ?? [];
    } catch {
      // No offers ledger entry -> not listed.
      return [];
    }
  });
}

