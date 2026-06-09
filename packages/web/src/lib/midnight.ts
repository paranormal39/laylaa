// Midnight integration for the browser dApp via the Lace DApp Connector API.
// SPDX-License-Identifier: Apache-2.0
//
// Connects to the Lace wallet (window.midnight.mnLace), builds midnight-js
// providers, and exposes deploy/join/redeemBurn/mint operations that mirror the
// proven nftmarket-cli logic. ZK assets are fetched at runtime via
// FetchZkConfigProvider from /midnight/<contract>/ (served from public/).

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NFT, witnesses as nftWitnesses } from '@nftmarket/nft-contract';
import { Bridge, witnesses as bridgeWitnesses } from '@nftmarket/bridge-contract';
import { Marketplace, witnesses as marketplaceWitnesses } from '@nftmarket/marketplace-contract';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { toHex, fromHex, parseCoinPublicKeyToHex } from '@midnight-ntwrk/midnight-js-utils';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { Buffer } from 'buffer';

export type Owner = {
  is_left: boolean;
  left: { bytes: Uint8Array };
  right: { bytes: Uint8Array };
};

export interface MidnightConnection {
  walletApi: any;
  providers: any;
  coinPublicKeyHex: string;
  address: string;
  zkConfigFor: (contractName: string) => any;
  proofProviderFor: (contractName: string) => any;
}

const NFT_PRIVATE_STATE_ID = 'nftPrivateState';
const BRIDGE_PRIVATE_STATE_ID = 'bridgePrivateState';
const MARKETPLACE_PRIVATE_STATE_ID = 'marketplacePrivateState';

// Pre-deployed Midnight Preview contract addresses. Auto-joined on connect.
// Override via VITE_NFT_ADDRESS / VITE_BRIDGE_ADDRESS / VITE_MARKETPLACE_ADDRESS
// / VITE_COLLECTION_ADDRESS if you redeploy.
const env = import.meta.env as Record<string, string | undefined>;
export const DEFAULT_CONTRACTS = {
  nft: env.VITE_NFT_ADDRESS ?? 'f16dc538f86275dd36719aa769f704a1d0ec91fe06191079608363a2160bda42',
  bridge: env.VITE_BRIDGE_ADDRESS ?? 'a8a1bf5445d6e3d8e8360d70cad117a294eec23a840ffdf6bb12f3d114201914',
  marketplace: env.VITE_MARKETPLACE_ADDRESS ?? '6846bfed435e85553d09473c394464b98f08d2171abc0fbf929622fb93086921',
  collection: env.VITE_COLLECTION_ADDRESS ?? '75b99eea0b5b4fe4dd6dd89b596f28fffa5545e280c8f30c7ce1b357194da871',
} as const;

// Compiled contracts. ZK assets are loaded by FetchZkConfigProvider, so we only
// need to bind the contract module + witnesses here.
const nftCompiled = CompiledContract.make('nft', NFT.Contract).pipe(
  CompiledContract.withWitnesses(nftWitnesses),
);
const bridgeCompiled = CompiledContract.make('bridge', (Bridge as any).Contract).pipe(
  CompiledContract.withWitnesses(bridgeWitnesses as any),
);
const marketplaceCompiled = CompiledContract.make('marketplace', (Marketplace as any).Contract).pipe(
  CompiledContract.withWitnesses(marketplaceWitnesses as any),
);

// Find an injected Midnight DApp connector (DApp Connector API v4.x). Each
// wallet injects its InitialAPI under its own key in window.midnight (a per-
// wallet UUID, since the API is CAIP-372-compatible). Lace also exposes a
// convenience alias at window.midnight.mnLace. The v4 handshake entrypoint is
// `connect(networkId)`, so we scan for any entry exposing that function.
function findConnector(): any | null {
  const mn = (window as any).midnight;
  if (!mn || typeof mn !== 'object') return null;
  if (mn.mnLace && typeof mn.mnLace.connect === 'function') return mn.mnLace;
  for (const key of Object.keys(mn)) {
    const candidate = mn[key];
    if (candidate && typeof candidate.connect === 'function') return candidate;
  }
  return null;
}

function getConnector(): any {
  const connector = findConnector();
  if (!connector) {
    throw new Error(
      'Lace wallet not found. Install the Midnight Lace extension, unlock it, and reload the page.',
    );
  }
  return connector;
}

export function isLaceAvailable(): boolean {
  return findConnector() != null;
}

// Network id hint passed to connect(); the wallet reports the active network via
// getConfiguration(). Override with VITE_MIDNIGHT_NETWORK (e.g. 'undeployed').
const NETWORK_HINT = env.VITE_MIDNIGHT_NETWORK ?? 'preview';
// Proof server URL. The browser connector does not expose a prover endpoint, so
// point at a reachable proof server (local docker default). Override via env.
const PROOF_SERVER_URL = env.VITE_PROOF_SERVER ?? 'http://127.0.0.1:6300';

// Browser DApps cannot use LevelDB; keep session-scoped private state in memory.
function inMemoryPrivateStateProvider(): any {
  const states = new Map<string, unknown>();
  const signingKeys = new Map<string, unknown>();
  return {
    setContractAddress: () => {},
    set: async (id: string, state: unknown) => { states.set(id, state); },
    get: async (id: string) => states.get(id) ?? null,
    remove: async (id: string) => { states.delete(id); },
    clear: async () => { states.clear(); },
    setSigningKey: async (address: string, key: unknown) => { signingKeys.set(address, key); },
    getSigningKey: async (address: string) => signingKeys.get(address) ?? null,
    removeSigningKey: async (address: string) => { signingKeys.delete(address); },
    clearSigningKeys: async () => { signingKeys.clear(); },
    exportPrivateStates: async () => { throw new Error('not supported in-memory'); },
    importPrivateStates: async () => { throw new Error('not supported in-memory'); },
    exportSigningKeys: async () => { throw new Error('not supported in-memory'); },
    importSigningKeys: async () => { throw new Error('not supported in-memory'); },
  };
}

// Connect to Lace via the DApp Connector API v4, wire midnight-js providers from
// the ConnectedAPI, and return a ready-to-use connection.
export async function connectLace(): Promise<MidnightConnection> {
  const connector = getConnector();

  // 1. Handshake — triggers the Lace authorization prompt.
  const api = await connector.connect(NETWORK_HINT);

  // 2. Read the wallet's active network + endpoints (respects the user's choice).
  const config = await api.getConfiguration();
  try {
    setNetworkId(config.networkId);
  } catch {
    /* ignore unknown ids */
  }

  // 3. Shielded keys are Bech32m-encoded in v4; decode the coin public key to hex
  // for the contract Owner derivation used by mintNFT.
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey, shieldedAddress } =
    await api.getShieldedAddresses();
  const coinPublicKeyHex = parseCoinPublicKeyToHex(shieldedCoinPublicKey, config.networkId);

  // 4. Build midnight-js providers from the DApp Connector (browser assembly).
  // FetchZkConfigProvider constructs URLs as <baseURL>/keys/<circuit>.verifier so
  // the base must include the contract name: /midnight/<contract>.
  // We create a helper and expose per-contract providers via zkConfigFor().
  const origin = window.location.origin;
  const zkConfigFor = (contractName: string) =>
    new FetchZkConfigProvider(`${origin}/midnight/${contractName}`, fetch.bind(window));
  const zkConfigProvider = zkConfigFor('nft'); // default; overridden per-contract below
  const providers = {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    walletProvider: {
      getCoinPublicKey: () => shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
      // balanceTx: serialize the unbound tx to hex, let Lace select fee inputs
      // and bind it, then deserialize the returned hex into a FinalizedTransaction.
      balanceTx: async (tx: any, _ttl?: Date) => {
        const { tx: balancedHex } = await api.balanceUnsealedTransaction(toHex(tx.serialize()), {});
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balancedHex));
      },
    },
    midnightProvider: {
      // submitTransaction takes a serialized hex string and returns void; recover
      // the tx id from the transaction's identifiers().
      submitTx: async (tx: any) => {
        await api.submitTransaction(toHex(tx.serialize()));
        return tx.identifiers()[0];
      },
    },
  };

  return {
    walletApi: api,
    providers,
    coinPublicKeyHex,
    address: shieldedAddress ?? coinPublicKeyHex,
    zkConfigFor,
    proofProviderFor: (contractName: string) =>
      httpClientProofProvider(PROOF_SERVER_URL, zkConfigFor(contractName)),
  };
}

// ----- Helpers -----

export function ownerFromCoinPublicKeyHex(hex: string): Owner {
  return {
    is_left: true,
    left: { bytes: Uint8Array.from(Buffer.from(hex, 'hex')) },
    right: { bytes: new Uint8Array(32) },
  };
}

export function padCID(cid: string): Uint8Array {
  const out = new Uint8Array(64);
  out.set(Buffer.from(cid, 'utf8').subarray(0, 64));
  return out;
}

export function hexHashToBytes32(hash: string): Uint8Array {
  const clean = hash.trim().replace(/^0x/i, '');
  if (clean.length !== 64) {
    throw new Error(`Expected a 64-char hex hash (32 bytes), got ${clean.length} chars`);
  }
  return Uint8Array.from(Buffer.from(clean, 'hex'));
}

// Pads/normalizes any hex string to a 32-byte token id (left-padded with zeros).
export function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').padStart(64, '0');
  if (clean.length !== 64) throw new Error('Expected 64-char hex');
  return Uint8Array.from(Buffer.from(clean, 'hex'));
}

// Generates a random 32-byte hex string (used for fresh Midnight token ids).
export function randomHex32(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ----- NFT contract -----

export async function deployNFT(conn: MidnightConnection): Promise<string> {
  const deployed = await deployContract(conn.providers, {
    compiledContract: nftCompiled,
    privateStateId: NFT_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
  return deployed.deployTxData.public.contractAddress;
}

export async function joinNFT(conn: MidnightConnection, contractAddress: string): Promise<any> {
  const nftProviders = { ...conn.providers, zkConfigProvider: conn.zkConfigFor('nft'), proofProvider: conn.proofProviderFor('nft') };
  return findDeployedContract(nftProviders, {
    contractAddress,
    compiledContract: nftCompiled,
    privateStateId: NFT_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
}

export async function mintNFT(
  nft: any,
  tokenId: Uint8Array,
  to: Owner,
  metadataCID: Uint8Array,
): Promise<string> {
  const finalized = await nft.callTx.mint(tokenId as any, to as any, metadataCID as any);
  return finalized.public.txId ?? '(submitted)';
}

export async function getOwnedTokens(
  conn: MidnightConnection,
  contractAddress: string,
  coinPublicKeyHex: string,
): Promise<string[]> {
  const state = await conn.providers.publicDataProvider.queryContractState(contractAddress);
  if (state == null) return [];
  const data: any = NFT.ledger(state.data);
  const owned: string[] = [];
  try {
    for (const [tokenId, owner] of data.ownerOf) {
      const ownerHex = Buffer.from(owner.left.bytes).toString('hex');
      if (owner.is_left && ownerHex === coinPublicKeyHex) {
        owned.push(Buffer.from(tokenId).toString('hex'));
      }
    }
  } catch {
    /* best-effort */
  }
  return owned;
}

// ----- Bridge contract -----

export async function deployBridge(conn: MidnightConnection): Promise<string> {
  const deployed = await deployContract(conn.providers, {
    compiledContract: bridgeCompiled,
    privateStateId: BRIDGE_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
  return deployed.deployTxData.public.contractAddress;
}

export async function joinBridge(conn: MidnightConnection, contractAddress: string): Promise<any> {
  const bridgeProviders = { ...conn.providers, zkConfigProvider: conn.zkConfigFor('bridge'), proofProvider: conn.proofProviderFor('bridge') };
  return findDeployedContract(bridgeProviders, {
    contractAddress,
    compiledContract: bridgeCompiled,
    privateStateId: BRIDGE_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
}

export async function redeemBurn(
  bridge: any,
  burnTxHash: Uint8Array,
  metadataCID: Uint8Array,
): Promise<string> {
  const finalized = await bridge.callTx.redeemBurn(burnTxHash as any, metadataCID as any);
  return finalized.public.txId ?? '(submitted)';
}

// ----- Marketplace contract -----

export async function deployMarketplace(conn: MidnightConnection): Promise<string> {
  const deployed = await deployContract(conn.providers, {
    compiledContract: marketplaceCompiled,
    privateStateId: MARKETPLACE_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
  return deployed.deployTxData.public.contractAddress;
}

export async function joinMarketplace(conn: MidnightConnection, contractAddress: string): Promise<any> {
  const mpProviders = { ...conn.providers, zkConfigProvider: conn.zkConfigFor('marketplace'), proofProvider: conn.proofProviderFor('marketplace') };
  return findDeployedContract(mpProviders, {
    contractAddress,
    compiledContract: marketplaceCompiled,
    privateStateId: MARKETPLACE_PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as any);
}

export async function initializeMarketplace(
  marketplace: any,
  feeBps: number,
): Promise<string> {
  const finalized = await marketplace.callTx.initialize(feeBps as any);
  return finalized.public.txId ?? '(submitted)';
}

export async function createListing(
  marketplace: any,
  listingId: Uint8Array,
  nftContractAddr: Uint8Array,
  tokenId: Uint8Array,
  price: bigint,
  currency: Uint8Array,
): Promise<string> {
  const finalized = await marketplace.callTx.createListing(
    listingId as any,
    nftContractAddr as any,
    tokenId as any,
    price as any,
    currency as any,
  );
  return finalized.public.txId ?? '(submitted)';
}

export async function buyListing(marketplace: any, listingId: Uint8Array): Promise<string> {
  const finalized = await marketplace.callTx.buyListing(listingId as any);
  return finalized.public.txId ?? '(submitted)';
}

export interface MidnightListing {
  id: string;
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  currency: string;
  status: 'active' | 'sold' | 'cancelled';
  buyer?: string;
  metadataUri?: string;
  imageUrl?: string;
}

// Read metadataOf map from the NFT contract: tokenId hex -> metadata CID string
export async function getTokenMetadataMap(
  conn: MidnightConnection,
  nftContractAddress: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const state = await conn.providers.publicDataProvider.queryContractState(nftContractAddress);
    if (state == null) return out;
    const data: any = NFT.ledger(state.data);
    for (const [tokenId, metaBytes] of data.metadataOf) {
      const tokenHex = Buffer.from(tokenId).toString('hex');
      const cid = Buffer.from(metaBytes).toString('utf8').replace(/\0+$/, '');
      if (cid) out.set(tokenHex, cid);
    }
  } catch { /* best-effort */ }
  return out;
}

function cidToHttpUrl(cid: string): string {
  if (!cid) return '';
  if (cid.startsWith('http://') || cid.startsWith('https://')) return cid;
  if (cid.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${cid.slice(7)}`;
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

// Resolve a metadata CID to an image URL by fetching the JSON metadata.
async function resolveImageFromCid(cid: string): Promise<string | undefined> {
  try {
    const url = cidToHttpUrl(cid);
    if (!url) return undefined;
    // If it looks like a direct image, return as-is
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url)) return url;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.startsWith('image/')) return url;
    if (!ct.includes('json')) return undefined;
    const meta = await res.json() as Record<string, unknown>;
    const img = (meta.image ?? meta.image_url) as string | undefined;
    if (!img) return undefined;
    if (img.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${img.slice(7)}`;
    return img;
  } catch {
    return undefined;
  }
}

export async function getMarketplaceListings(
  conn: MidnightConnection,
  contractAddress: string,
  nftContractAddress?: string,
): Promise<MidnightListing[]> {
  const state = await conn.providers.publicDataProvider.queryContractState(contractAddress);
  if (state == null) return [];
  const data: any = Marketplace.ledger(state.data);
  const listings: MidnightListing[] = [];
  // Pre-fetch NFT metadata map if nft contract address provided
  const metaMap = nftContractAddress
    ? await getTokenMetadataMap(conn, nftContractAddress)
    : new Map<string, string>();
  try {
    for (const [id, listing] of data.listings) {
      const idHex = Buffer.from(id).toString('hex');
      const seller = listing.seller.is_left
        ? Buffer.from(listing.seller.left.bytes).toString('hex')
        : Buffer.from(listing.seller.right.bytes).toString('hex');
      const buyer = listing.buyer.is_some
        ? (listing.buyer.value.is_left
            ? Buffer.from(listing.buyer.value.left.bytes).toString('hex')
            : Buffer.from(listing.buyer.value.right.bytes).toString('hex'))
        : undefined;
      const tokenId = Buffer.from(listing.tokenId).toString('hex');
      const metadataUri = metaMap.get(tokenId);
      listings.push({
        id: idHex,
        seller,
        nftContract: Buffer.from(listing.nftContract).toString('hex'),
        tokenId,
        price: String(listing.price),
        currency: Buffer.from(listing.currency).toString('utf8').replace(/\0+$/, ''),
        status: String(listing.status) as MidnightListing['status'],
        buyer,
        metadataUri,
      });
    }
  } catch {
    /* best-effort */
  }
  // Resolve images in parallel (best-effort, non-blocking)
  await Promise.all(
    listings.map(async (l) => {
      if (l.metadataUri) l.imageUrl = await resolveImageFromCid(l.metadataUri);
    }),
  );
  return listings;
}
