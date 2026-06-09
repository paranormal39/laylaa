// Xaman (XUMM) frontend client — talks to the @nftmarket/xaman-backend.
// SPDX-License-Identifier: Apache-2.0
//
// The backend holds the API secret and creates sign payloads. Here we kick off
// payloads, open the Xaman deeplink, and poll until the user signs (or cancels).

export interface XamanPayload {
  uuid: string;
  next: { always: string };
  refs: { qr_png: string; websocket_status: string };
  pushed: boolean;
}

export interface PayloadStatus {
  resolved: boolean;
  signed: boolean;
  cancelled: boolean;
  expired: boolean;
  txid: string | null;
  account: string | null;
}

const API = '/api/xaman';

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const createSignIn = () => post<XamanPayload>('/signin');
export const createMint = (uri: string, taxon: number) => post<XamanPayload>('/mint', { uri, taxon });
export const createBurn = (nftId: string, account?: string) =>
  post<XamanPayload>('/burn', { nftId, account });

// Token-to-NFT minting payloads (mainnet tokens, signed via Xaman)
export const createTokenPayment = (tokenId: string, amount: string, destination: string) =>
  post<XamanPayload & { token: string; destination: string }>('/pay-token', { tokenId, amount, destination });
export const createTokenBurn = (tokenId: string, amount: string) =>
  post<XamanPayload & { token: string; destination: string }>('/burn-token', { tokenId, amount });

export async function getStatus(uuid: string): Promise<PayloadStatus> {
  const res = await fetch(`${API}/payload/${uuid}`);
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json() as Promise<PayloadStatus>;
}

// Open the Xaman QR modal + deeplink and poll until the payload resolves.
export async function openAndAwait(
  payload: XamanPayload,
  onTick?: (s: PayloadStatus) => void,
  timeoutMs = 5 * 60 * 1000,
): Promise<PayloadStatus> {
  // Show QR modal (XamanModal listens for this event globally in App.tsx)
  window.dispatchEvent(new CustomEvent('xaman:open', { detail: payload }));
  const start = Date.now();
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((r) => setTimeout(r, 2500));
      const status = await getStatus(payload.uuid);
      onTick?.(status);
      if (status.resolved || status.cancelled || status.expired) return status;
      if (Date.now() - start > timeoutMs) {
        return { ...status, expired: true };
      }
    }
  } finally {
    window.dispatchEvent(new CustomEvent('xaman:close'));
  }
}

// ---------------------------------------------------------------------------
// NEW: Token verification + registry (talks to backend directly, no Xaman)
// ---------------------------------------------------------------------------

const XRPL_API = '/api/xrpl';

export interface TokenLine {
  currency: string;
  currencyName: string;
  issuer: string;
  balance: string;
}

export interface HoldCheck {
  eligible: boolean;
  balance: string;
  threshold: string;
  token: string;
}

export interface TxVerify {
  verified: boolean;
  txType: string;
  destination: string;
  amount: unknown;
  result: boolean;
}

export interface UploadResult {
  storage: 'ipfs' | 'local';
  imageUri: string;
  imageUrl: string;
  metadataUri: string;
  metadataUrl: string;
  metadata: Record<string, unknown>;
}

// Uploads an image + metadata to the backend (pinned to IPFS via Pinata when
// configured). Shared by the Create tab and the token bridge.
export async function uploadNftMetadata(opts: {
  image: File;
  name?: string;
  description?: string;
  attributes?: unknown[];
}): Promise<UploadResult> {
  const form = new FormData();
  form.append('image', opts.image);
  form.append('name', (opts.name ?? '').trim() || 'Untitled');
  form.append('description', (opts.description ?? '').trim());
  form.append('attributes', JSON.stringify(opts.attributes ?? []));
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<UploadResult>;
}

export interface CollectionNFT {
  nftId: string;
  uri?: string;
  image?: string;
}

export interface XrplCollection {
  id: string;
  name: string;
  issuer: string;
  nfts: CollectionNFT[];
}

// Live XRPL mainnet NFT collections (pulled by issuer via the backend).
export async function getCollections(): Promise<XrplCollection[]> {
  const res = await fetch(`${XRPL_API}/collections`);
  if (!res.ok) throw new Error(`getCollections failed: ${res.status}`);
  const data = (await res.json()) as { collections: XrplCollection[] };
  return data.collections;
}

// Hand-picked featured collections (pulled live from mainnet via the backend).
export async function getCuratedCollections(): Promise<XrplCollection[]> {
  const res = await fetch(`${XRPL_API}/curated`);
  if (!res.ok) throw new Error(`getCuratedCollections failed: ${res.status}`);
  const data = (await res.json()) as { collections: XrplCollection[] };
  return data.collections;
}

export async function getTokenLines(address: string): Promise<TokenLine[]> {
  const res = await fetch(`${XRPL_API}/tokens/${address}`);
  if (!res.ok) throw new Error(`tokenLines failed: ${res.status}`);
  const data = (await res.json()) as { lines: TokenLine[] };
  return data.lines;
}

export interface TokenPrice {
  token: string;
  tokenId: string;
  xrp: number;
  tokensPerXrp: number;
  xrpPerToken: number;
  amount: string;
}

// How many tokens equal `xrp` XRP (default 1), via the XRPL DEX order book.
export async function getTokenPrice(tokenId: string, xrp = 1): Promise<TokenPrice> {
  const res = await fetch(`${XRPL_API}/token-price/${encodeURIComponent(tokenId)}?xrp=${xrp}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `getTokenPrice failed: ${res.status}`);
  return res.json() as Promise<TokenPrice>;
}

export async function verifyHold(address: string, tokenId: string): Promise<HoldCheck> {
  const res = await fetch(`${XRPL_API}/verify-hold?address=${encodeURIComponent(address)}&tokenId=${encodeURIComponent(tokenId)}`);
  if (!res.ok) throw new Error(`verifyHold failed: ${res.status}`);
  return res.json() as Promise<HoldCheck>;
}

export async function verifyPayment(txid: string, destination?: string, tokenId?: string, expectedAmount?: string): Promise<TxVerify> {
  const params = new URLSearchParams({ txid });
  if (destination) params.set('destination', destination);
  if (tokenId) params.set('tokenId', tokenId);
  if (expectedAmount) params.set('expectedAmount', expectedAmount);
  const res = await fetch(`${XRPL_API}/verify-payment?${params.toString()}`);
  if (!res.ok) throw new Error(`verifyPayment failed: ${res.status}`);
  return res.json() as Promise<TxVerify>;
}

export async function verifyBurn(txid: string, tokenId?: string, expectedAmount?: string): Promise<TxVerify> {
  const params = new URLSearchParams({ txid });
  if (tokenId) params.set('tokenId', tokenId);
  if (expectedAmount) params.set('expectedAmount', expectedAmount);
  const res = await fetch(`${XRPL_API}/verify-burn?${params.toString()}`);
  if (!res.ok) throw new Error(`verifyBurn failed: ${res.status}`);
  return res.json() as Promise<TxVerify>;
}

// ---------------------------------------------------------------------------
// NEW: Server-side XRPL testnet NFT mint
// ---------------------------------------------------------------------------
export interface TestnetMintResult {
  ok: boolean;
  txid: string;
  nftoken_id: string | null;
}

export async function testnetMint(uri: string, taxon: number, destination?: string): Promise<TestnetMintResult> {
  const res = await fetch('/api/xrpl/testnet/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri, taxon, destination }),
  });
  if (!res.ok) throw new Error(`testnetMint failed: ${res.status}`);
  return res.json() as Promise<TestnetMintResult>;
}

export async function acceptNftOffer(offerId: string, nftName?: string): Promise<PayloadStatus> {
  const payload = await post<XamanPayload>('/accept-offer', { offerId, nftName });
  return openAndAwait(payload);
}

// List an XRPL NFT for sale at an XRP price (public or private to a destination address).
export async function createXrplSellOffer(
  nftId: string,
  priceXrp: number,
  network: string,
  opts?: { destination?: string; nftName?: string; metadataUri?: string; imageUrl?: string },
): Promise<PayloadStatus> {
  const payload = await post<XamanPayload>('/create-sell-offer', {
    nftId,
    priceXrp,
    network,
    destination: opts?.destination,
    nftName: opts?.nftName,
    metadataUri: opts?.metadataUri,
  });
  const status = await openAndAwait(payload);
  // Confirm in the recent-listings registry after the user signs
  if (status.signed) {
    void fetch('/api/xrpl/confirm-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: payload.uuid,
        seller: status.account,
        imageUrl: opts?.imageUrl,
      }),
    }).catch(() => {});
  }
  return status;
}

// Place a bid (buy offer) on an XRPL NFT. Set destination=ownerAddress for a private bid.
export async function createXrplBuyOffer(
  nftId: string,
  priceXrp: number,
  ownerAddress: string,
  network: string,
  opts?: { destination?: string; nftName?: string; isPrivate?: boolean },
): Promise<PayloadStatus> {
  const payload = await post<XamanPayload>('/create-buy-offer', {
    nftId,
    priceXrp,
    ownerAddress,
    network,
    destination: opts?.isPrivate ? ownerAddress : opts?.destination,
    nftName: opts?.nftName,
  });
  return openAndAwait(payload);
}

// ---------------------------------------------------------------------------
// Recent XRPL listings — NFTs listed on this platform via create-sell-offer
// ---------------------------------------------------------------------------
export interface RecentListing {
  id: string;
  nftId: string;
  priceXrp: string;
  network: string;
  nftName?: string;
  metadataUri?: string;
  imageUrl?: string;
  seller?: string;
  isPrivate: boolean;
  listedAt: number;
}

export async function getRecentXrplListings(): Promise<RecentListing[]> {
  const res = await fetch('/api/xrpl/recent-listings');
  if (!res.ok) return [];
  const data = await res.json() as { listings: RecentListing[] };
  return data.listings ?? [];
}

// ---------------------------------------------------------------------------
// Midnight private bid registry (off-chain, backend in-memory store)
// ---------------------------------------------------------------------------
export interface MidnightBid {
  id: string;
  listingId: string;
  bidderAddress: string;
  priceNight: string;
  message?: string;
  createdAt: number;
}

export async function placeMidnightBid(
  listingId: string,
  bidderAddress: string,
  priceNight: string,
  message?: string,
): Promise<MidnightBid> {
  const res = await fetch('/api/midnight/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ listingId, bidderAddress, priceNight, message }),
  });
  if (!res.ok) throw new Error(`placeBid failed: ${res.status}`);
  const data = await res.json() as { bid: MidnightBid };
  return data.bid;
}

export async function getMidnightBids(listingId: string): Promise<MidnightBid[]> {
  const res = await fetch(`/api/midnight/bids/${encodeURIComponent(listingId)}`);
  if (!res.ok) return [];
  const data = await res.json() as { bids: MidnightBid[] };
  return data.bids ?? [];
}

export async function deleteMidnightBid(bidId: string): Promise<void> {
  await fetch(`/api/midnight/bids/${encodeURIComponent(bidId)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Auction registry — time-limited auctions with public + private bids
// ---------------------------------------------------------------------------
export interface AuctionBid {
  id: string;
  bidder: string;
  amountXrp: string;
  isPrivate: boolean;
  message?: string;
  placedAt: number;
  confirmed: boolean;
  xamanOfferId?: string;
}

export interface Auction {
  id: string;
  nftId: string;
  network: string;
  seller: string;
  nftName?: string;
  imageUrl?: string;
  metadataUri?: string;
  reserveXrp: string;
  endsAt: number;
  isPublic: boolean;
  status: 'active' | 'ended' | 'cancelled';
  bids: AuctionBid[];
  createdAt: number;
}

export async function createAuction(params: {
  nftId: string;
  network: string;
  seller: string;
  nftName?: string;
  imageUrl?: string;
  metadataUri?: string;
  reserveXrp?: string;
  durationHours?: number;
  isPublic?: boolean;
}): Promise<Auction> {
  const res = await fetch('/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `createAuction failed: ${res.status}`);
  const data = await res.json() as { auction: Auction };
  return data.auction;
}

export async function getAuctions(): Promise<Auction[]> {
  const res = await fetch('/api/auctions');
  if (!res.ok) return [];
  const data = await res.json() as { auctions: Auction[] };
  return data.auctions ?? [];
}

export async function getAuction(id: string, caller?: string): Promise<Auction | null> {
  const qs = caller ? `?caller=${encodeURIComponent(caller)}` : '';
  const res = await fetch(`/api/auctions/${encodeURIComponent(id)}${qs}`);
  if (!res.ok) return null;
  const data = await res.json() as { auction: Auction };
  return data.auction;
}

// Place a bid on an auction — opens Xaman to sign the NFTokenCreateOffer
export async function placeAuctionBid(
  auctionId: string,
  amountXrp: string,
  opts?: { isPrivate?: boolean; message?: string; bidderLabel?: string },
): Promise<PayloadStatus & { bidId: string }> {
  const res = await fetch(`/api/auctions/${encodeURIComponent(auctionId)}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountXrp,
      isPrivate: opts?.isPrivate ?? false,
      message: opts?.message,
      bidderLabel: opts?.bidderLabel,
    }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `placeBid failed: ${res.status}`);
  const data = await res.json() as { bidId: string; uuid: string; next: { always: string }; refs: { qr_png: string; websocket_status: string }; pushed: boolean };
  const payload: XamanPayload = { uuid: data.uuid, next: data.next, refs: data.refs, pushed: data.pushed };
  const status = await openAndAwait(payload);
  // Confirm bid on backend after signing
  if (status.signed) {
    void fetch(`/api/auctions/${encodeURIComponent(auctionId)}/bids/${encodeURIComponent(data.bidId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bidder: status.account, offerId: status.txid }),
    }).catch(() => {});
  }
  return { ...status, bidId: data.bidId };
}

// Seller accepts a specific bid's on-chain NFTokenCreateOffer, closing the auction.
// offerId is the NFTokenCreateOffer LedgerIndex from the bid's on-chain tx.
export async function acceptAuctionBid(
  auctionId: string,
  offerId: string,
  nftName?: string,
): Promise<PayloadStatus> {
  // Mark auction closed on backend first
  const payload = await post<XamanPayload>('/accept-offer', { offerId, nftName });
  const status = await openAndAwait(payload);
  if (status.signed) {
    // Mark the auction as ended
    void fetch(`/api/auctions/${encodeURIComponent(auctionId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller: status.account }),
    }).catch(() => {});
  }
  return status;
}

export async function cancelAuction(auctionId: string, seller: string): Promise<void> {
  await fetch(`/api/auctions/${encodeURIComponent(auctionId)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller }),
  });
}

export interface GxgMintResult {
  ok: boolean;
  txid: string;
  nftoken_id: string | null;
  gxgBalance: number;
}

export async function gxgMint(uri: string, taxon: number, destination: string): Promise<GxgMintResult> {
  const res = await fetch('/api/xrpl/gxg-mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uri, taxon, destination }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `gxgMint failed: ${res.status}`);
  }
  return res.json() as Promise<GxgMintResult>;
}

// ---------------------------------------------------------------------------
// Batch mint + platform collection helpers
// ---------------------------------------------------------------------------
export interface BatchMintItem {
  uri?: string;
  taxon?: number;
  name?: string;
}

export interface BatchMintResultItem {
  index: number;
  nftId: string | null;
  txid: string;
  offerId: string | null;
  ok: boolean;
  error?: string;
}

export interface BatchMintResponse {
  ok: boolean;
  attempted: number;
  minted: number;
  results: BatchMintResultItem[];
}

export async function batchMint(
  items: BatchMintItem[],
  opts?: {
    destination?: string;
    collectionName?: string;
    collectionDescription?: string;
    collectionId?: string;
  },
): Promise<BatchMintResponse> {
  const res = await fetch('/api/xrpl/testnet/batch-mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, ...opts }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `batchMint failed: ${res.status}`);
  }
  return res.json() as Promise<BatchMintResponse>;
}

export interface PlatformCollection {
  id: string;
  name: string;
  description?: string;
  taxon: number;
  network: string;
  issuer: string;
  itemCount?: number;
  items?: Array<{ nftId: string; txid: string; name?: string; uri?: string; offerId?: string | null }>;
  createdAt: number;
}

export async function createPlatformCollection(params: {
  name: string;
  description?: string;
  taxon?: number;
  network?: string;
}): Promise<PlatformCollection> {
  const res = await fetch('/api/xrpl/collections/platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `createCollection failed: ${res.status}`);
  return res.json() as Promise<PlatformCollection>;
}

export async function getPlatformCollections(): Promise<PlatformCollection[]> {
  const res = await fetch('/api/xrpl/collections/platform');
  if (!res.ok) throw new Error(`getPlatformCollections failed: ${res.status}`);
  const data = await res.json() as { collections: PlatformCollection[] };
  return data.collections;
}

export async function getPlatformCollection(id: string): Promise<PlatformCollection> {
  const res = await fetch(`/api/xrpl/collections/platform/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getPlatformCollection failed: ${res.status}`);
  return res.json() as Promise<PlatformCollection>;
}
