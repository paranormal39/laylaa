// Extended Xaman (XUMM) + XRPL backend for the Layla NFT Shop dApp.
// SPDX-License-Identifier: Apache-2.0
//
// Creates XRPL sign payloads (NFTokenMint / NFTokenBurn / Payment) using the Xaman API.
// Also provides server-side XRPL mainnet/testnet reads (token verification, tx lookup)
// and a server-side testnet wallet for NFT minting.
// The API secret lives only here (server-side); never expose to the browser.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import rateLimit from 'express-rate-limit';
import { XummSdk } from 'xumm-sdk';
import { Client, Wallet as XrplWallet } from 'xrpl';

// Register crash handlers FIRST before anything can throw
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const { XUMM_API_KEY, XUMM_API_SECRET } = process.env;
if (!XUMM_API_KEY || !XUMM_API_SECRET) {
  console.error('Missing XUMM_API_KEY / XUMM_API_SECRET. Copy .env.example to .env and fill them in.');
  process.exit(1);
}

const sdk = new XummSdk(XUMM_API_KEY, XUMM_API_SECRET);
const app = express();
app.use(express.json());

const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: origins }));
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT ?? 4000);

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// General API: 200 req / 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later.' },
});
// Xaman payload creation: 30 req / 15 min per IP (each creates an external call)
const xamanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign requests — please slow down.' },
});
app.use('/api', generalLimiter);
app.use('/api/xaman', xamanLimiter);
app.use('/api/auctions', xamanLimiter);

// ---------------------------------------------------------------------------
// Persistence helpers — all registries are written to data/*.json on every
// mutation and reloaded on startup so data survives backend restarts.
// ---------------------------------------------------------------------------
const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadJson<T>(filename: string, fallback: T): T {
  const file = join(DATA_DIR, filename);
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch (e) {
    console.warn(`[persist] Failed to load ${filename}:`, e);
  }
  return fallback;
}

function saveJson(filename: string, data: unknown): void {
  try {
    writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`[persist] Failed to save ${filename}:`, e);
  }
}

// ---------------------------------------------------------------------------
// Token registry (mainnet tokens accepted for token-to-NFT minting)
// ---------------------------------------------------------------------------
interface TokenDef {
  id: string;
  name: string;
  issuer: string;
  currencyHex: string;
  holdThreshold: string;
}

const TOKENS: TokenDef[] = [
  {
    id: 'gamerxgold',
    name: 'GamerXGold',
    issuer: 'rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2',
    currencyHex: '47616D657258476F6C6400000000000000000000',
    holdThreshold: '1',
  },
];

const BLACKHOLE = 'rrrrrrrrrrrrrrrrrrrrrhoLvTp';

function getToken(id: string): TokenDef | undefined {
  return TOKENS.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// XRPL client helpers
// ---------------------------------------------------------------------------
const MAINNET_ENDPOINTS = ['wss://s2.ripple.com', 'wss://s1.ripple.com', 'wss://xrplcluster.com'];
const TESTNET_ENDPOINTS = ['wss://testnet.xrpl-labs.com', 'wss://s.altnet.rippletest.net:51233'];
const DEVNET_ENDPOINTS = ['wss://s.devnet.rippletest.net:51233'];

type Network = 'mainnet' | 'testnet' | 'devnet';

async function withXrplClient<T>(network: Network, fn: (c: Client) => Promise<T>): Promise<T> {
  const urls = network === 'mainnet' ? MAINNET_ENDPOINTS : network === 'devnet' ? DEVNET_ENDPOINTS : TESTNET_ENDPOINTS;
  let lastError: unknown;
  for (const url of urls) {
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
  throw new Error(`No reachable XRPL ${network} endpoint. Last: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// Decode 40-char hex currency to ASCII.
function decodeCurrency(hex: string): string {
  if (!hex) return hex;
  if (hex.length === 3) return hex;
  if (/^[0-9A-Fa-f]{40}$/.test(hex)) {
    return Buffer.from(hex, 'hex').toString('utf8').replace(/\0+$/, '').trim() || hex;
  }
  return hex;
}

// ---------------------------------------------------------------------------
// Encode helpers
// ---------------------------------------------------------------------------
function toHexURI(uri: string): string {
  return Buffer.from(uri, 'utf8').toString('hex').toUpperCase();
}

// ---------------------------------------------------------------------------
// Existing endpoints (kept backward-compatible)
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/xaman/signin', async (_req, res) => {
  try {
    const payload = await sdk.payload.create({ txjson: { TransactionType: 'SignIn' } });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/xaman/mint', async (req, res) => {
  try {
    const { uri, taxon } = req.body as { uri?: string; taxon?: number };
    const txjson: Record<string, unknown> = {
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: Number(taxon ?? 0),
      Flags: 8, // tfTransferable
    };
    if (uri) txjson.URI = toHexURI(uri);
    const payload = await sdk.payload.create({ txjson });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/xaman/burn', async (req, res) => {
  try {
    const { nftId, account } = req.body as { nftId?: string; account?: string };
    if (!nftId) {
      res.status(400).json({ error: 'nftId is required' });
      return;
    }
    const txjson: Record<string, unknown> = {
      TransactionType: 'NFTokenBurn',
      NFTokenID: nftId,
    };
    if (account) txjson.Account = account;
    const payload = await sdk.payload.create({ txjson });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/api/xaman/payload/:uuid', async (req, res) => {
  try {
    const payload = await sdk.payload.get(req.params.uuid);
    if (!payload) {
      res.status(404).json({ error: 'payload not found' });
      return;
    }
    res.json({
      resolved: payload.meta.resolved,
      signed: payload.meta.signed,
      cancelled: payload.meta.cancelled,
      expired: payload.meta.expired,
      txid: payload.response?.txid ?? null,
      account: payload.response?.account ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Token registry
// ---------------------------------------------------------------------------
app.get('/api/tokens', (_req, res) => {
  res.json({ tokens: TOKENS });
});

app.get('/api/tokens/:id', (req, res) => {
  const token = getToken(req.params.id);
  if (!token) {
    res.status(404).json({ error: 'token not found' });
    return;
  }
  res.json(token);
});

// ---------------------------------------------------------------------------
// NEW: XRPL mainnet token reads (server-side, no Xaman needed)
// ---------------------------------------------------------------------------

// List all trustlines (token balances) for an address on mainnet.
app.get('/api/xrpl/tokens/:address', async (req, res) => {
  try {
    const lines = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'account_lines', account: req.params.address });
      return (r.result.lines as Array<{ currency: string; account: string; balance: string }>).map((l) => ({
        currency: l.currency,
        currencyName: decodeCurrency(l.currency),
        issuer: l.account,
        balance: l.balance,
      }));
    });
    res.json({ address: req.params.address, lines });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Verify a user holds at least the threshold amount of a registered token.
app.get('/api/xrpl/verify-hold', async (req, res) => {
  try {
    const { address, tokenId } = req.query as { address?: string; tokenId?: string };
    if (!address || !tokenId) {
      res.status(400).json({ error: 'address and tokenId are required' });
      return;
    }
    const token = getToken(tokenId);
    if (!token) {
      res.status(404).json({ error: 'unknown token' });
      return;
    }
    const lines = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'account_lines', account: address });
      return r.result.lines as Array<{ currency: string; account: string; balance: string }>;
    });
    const match = lines.find((l) => l.account === token.issuer && l.currency === token.currencyHex);
    const balance = match ? parseFloat(match.balance) : 0;
    const threshold = parseFloat(token.holdThreshold);
    const eligible = balance >= threshold && balance > 0;
    res.json({
      eligible,
      balance: match?.balance ?? '0',
      threshold: token.holdThreshold,
      token: token.name,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Curated XRPL NFT collections (pulled live from mainnet via Clio)
// ---------------------------------------------------------------------------
interface CollectionDef {
  id: string;
  name: string;
  issuer: string;
  taxon?: number;
}

// Issuers to surface as collections. These are the real, registered token
// issuers (grounded in the registry). Add more issuer addresses here as needed;
// Clio's nfts_by_issuer returns whatever NFTs they have minted on mainnet.
// Optionally override with a comma-separated COLLECTION_ISSUERS env list of
// "name:issuer[:taxon]" entries.
const COLLECTIONS: CollectionDef[] = (() => {
  const fromEnv = (process.env.COLLECTION_ISSUERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const [name, issuer, taxon] = entry.split(':');
      return { id: `env-${i}`, name: name || issuer, issuer, taxon: taxon ? Number(taxon) : undefined };
    })
    .filter((c) => c.issuer);
  if (fromEnv.length > 0) return fromEnv;
  return TOKENS.map((t) => ({ id: t.id, name: t.name, issuer: t.issuer }));
})();

function decodeUri(hex?: string): string | undefined {
  if (!hex) return undefined;
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return undefined;
  }
}

// Pinata credentials — declared here so ipfsToHttp and resolveImage can use them.
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = (process.env.PINATA_GATEWAY ?? 'https://gateway.pinata.cloud').replace(/\/+$/, '');

// Convert ipfs:// (or bare CID) to an https gateway URL for display.
function ipfsToHttp(uri?: string): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith('ipfs://')) return `${PINATA_GATEWAY}/ipfs/${uri.slice('ipfs://'.length)}`;
  if (/^Qm[1-9A-Za-z]{44}/.test(uri) || /^bafy/.test(uri)) return `${PINATA_GATEWAY}/ipfs/${uri}`;
  return uri;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;

// Resolve an NFT's displayable image URL from its on-chain URI. Most XRPL NFT
// URIs point at a metadata JSON (ipfs://.../metadata.json) whose `image` field
// holds the actual asset; pointing an <img> at the JSON renders nothing. So we
// fetch the metadata and extract `image` (falling back to the URI itself when
// it already looks like an image). Network/parse failures resolve to undefined
// so the UI shows its placeholder instead of a broken image.
async function resolveImage(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  const httpUri = ipfsToHttp(uri);
  if (!httpUri) return undefined;
  // Already a direct image — use as-is.
  if (IMAGE_EXT.test(httpUri)) return httpUri;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(httpUri, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return undefined;
    const contentType = r.headers.get('content-type') ?? '';
    // The URI itself is an image (no extension but image content-type).
    if (contentType.startsWith('image/')) return httpUri;
    if (!contentType.includes('json')) return undefined;
    const meta = (await r.json()) as Record<string, unknown>;
    const img = (meta.image ?? meta.image_url ?? (meta as any).imageUrl) as string | undefined;
    return ipfsToHttp(img);
  } catch {
    return undefined;
  }
}

// Hand-picked collections featured at the top of the marketplace. Pulled live
// from XRPL mainnet by issuer via Clio's nfts_by_issuer.
// Override curated list via CURATED_ISSUERS env var (same format as COLLECTION_ISSUERS).
const CURATED_COLLECTIONS: CollectionDef[] = (() => {
  const fromEnv = (process.env.CURATED_ISSUERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry, i) => {
      const [name, issuer, taxon] = entry.split(':');
      return { id: `curated-${i}`, name: name || issuer, issuer, taxon: taxon ? Number(taxon) : undefined };
    })
    .filter((c) => c.issuer);
  if (fromEnv.length > 0) return fromEnv;
  // Default: set CURATED_ISSUERS in .env to feature your own collections.
  // Format: "Name:rIssuerAddress[:taxon]" comma-separated.
  // Example: CURATED_ISSUERS=My Collection:rIssuerAddressHere
  return [];
})();

// Resolve a set of collection defs to their on-chain NFTs (image + uri).
// Uses account_nfts (universally supported) instead of nfts_by_issuer (Clio-only).
async function fetchCollections(defs: CollectionDef[]) {
  return withXrplClient('mainnet', async (c) => {
    const out: Array<{
      id: string;
      name: string;
      issuer: string;
      nfts: Array<{ nftId: string; uri?: string; image?: string }>;
    }> = [];
    for (const col of defs) {
      try {
        const r: any = await c.request({
          command: 'account_nfts',
          account: col.issuer,
          limit: 8,
        } as any);
        let rawNfts: Array<Record<string, any>> = r.result?.account_nfts ?? [];
        if (col.taxon != null) rawNfts = rawNfts.filter((n: any) => n.NFTokenTaxon === col.taxon);
        const nfts = await Promise.all(
          rawNfts.slice(0, 8).map(async (n: any) => {
            const uri = decodeUri(n.URI ?? n.uri);
            return { nftId: n.NFTokenID ?? n.nft_id, uri, image: await resolveImage(uri) };
          }),
        );
        if (nfts.length > 0) out.push({ id: col.id, name: col.name, issuer: col.issuer, nfts });
      } catch {
        /* skip collections the server can't resolve */
      }
    }
    return out;
  });
}

app.get('/api/xrpl/collections', async (_req, res) => {
  try {
    res.json({ collections: await fetchCollections(COLLECTIONS) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/api/xrpl/curated', async (_req, res) => {
  try {
    res.json({ collections: await fetchCollections(CURATED_COLLECTIONS) });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Token price / converter — how many tokens equal 1 XRP (DEX order book)
// ---------------------------------------------------------------------------
async function tokensPerXrp(token: TokenDef): Promise<number> {
  return withXrplClient('mainnet', async (c) => {
    // Order book: we PAY XRP (taker_pays = XRP drops) and GET the token
    // (taker_gets = {currency, issuer}). The best offer's quality gives us the
    // exchange rate. tokensPerXrp = TakerGets(token) / dropsToXrp(TakerPays).
    const r = await c.request({
      command: 'book_offers',
      taker_gets: { currency: token.currencyHex, issuer: token.issuer },
      taker_pays: { currency: 'XRP' },
      limit: 10,
    });
    const offers = (r.result.offers ?? []) as unknown as Array<Record<string, unknown>>;
    if (offers.length === 0) throw new Error('No XRP/token order book offers found');

    // Aggregate the best offer. TakerGets is the token (string value or object),
    // TakerPays is XRP in drops (string).
    const best = offers[0];
    const getsRaw = best.TakerGets as { value?: string } | string;
    const paysDrops = best.TakerPays as string;
    const tokenAmount = parseFloat(typeof getsRaw === 'string' ? getsRaw : getsRaw.value ?? '0');
    const xrpAmount = Number(paysDrops) / 1_000_000;
    if (xrpAmount <= 0 || tokenAmount <= 0) throw new Error('Invalid order book pricing');
    return tokenAmount / xrpAmount;
  });
}

app.get('/api/xrpl/token-price/:id', async (req, res) => {
  try {
    const token = getToken(req.params.id);
    if (!token) {
      res.status(404).json({ error: 'unknown token' });
      return;
    }
    const xrpTarget = parseFloat((req.query.xrp as string) ?? '1');
    const perXrp = await tokensPerXrp(token);
    // Round up to whole tokens for a safe payment amount.
    const amount = Math.ceil(perXrp * xrpTarget);
    res.json({
      token: token.name,
      tokenId: token.id,
      xrp: xrpTarget,
      tokensPerXrp: perXrp,
      xrpPerToken: 1 / perXrp,
      amount: String(amount),
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Token Payment (pay-to-treasury) payload builder via Xaman
// ---------------------------------------------------------------------------
app.post('/api/xaman/pay-token', async (req, res) => {
  try {
    const { tokenId, amount, destination } = req.body as {
      tokenId?: string;
      amount?: string;
      destination?: string;
    };
    if (!tokenId || !amount || !destination) {
      res.status(400).json({ error: 'tokenId, amount, and destination are required' });
      return;
    }
    const token = getToken(tokenId);
    if (!token) {
      res.status(404).json({ error: 'unknown token' });
      return;
    }
    const txjson: Record<string, unknown> = {
      TransactionType: 'Payment',
      Destination: destination,
      Amount: {
        currency: token.currencyHex,
        issuer: token.issuer,
        value: amount,
      },
    };
    const payload = await sdk.payload.create({ txjson });
    res.json({ ...payload, token: token.name, destination });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Token Burn (pay-to-blackhole) payload builder via Xaman
// ---------------------------------------------------------------------------
app.post('/api/xaman/burn-token', async (req, res) => {
  try {
    const { tokenId, amount } = req.body as { tokenId?: string; amount?: string };
    if (!tokenId || !amount) {
      res.status(400).json({ error: 'tokenId and amount are required' });
      return;
    }
    const token = getToken(tokenId);
    if (!token) {
      res.status(404).json({ error: 'unknown token' });
      return;
    }
    // Send tokens back to their issuer — this is the correct XRPL burn mechanism.
    // The issuer has no obligation to hold its own currency, so the supply is destroyed.
    // Sending to the blackhole fails because that account has no trustline.
    const burnDestination = token.issuer;
    const txjson: Record<string, unknown> = {
      TransactionType: 'Payment',
      Destination: burnDestination,
      Amount: {
        currency: token.currencyHex,
        issuer: token.issuer,
        value: amount,
      },
    };
    const payload = await sdk.payload.create({ txjson });
    res.json({ ...payload, token: token.name, destination: burnDestination });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Transaction verification (mainnet)
// ---------------------------------------------------------------------------

// Look up a tx hash on mainnet and return meta (for payment/burn verification).
app.get('/api/xrpl/tx/:txid', async (req, res) => {
  try {
    const tx = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'tx', transaction: req.params.txid });
      return r.result;
    });
    res.json({ found: true, tx });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('not found') || msg.includes('Transaction not found')) {
      res.json({ found: false });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

// Verify a specific Payment was made to a destination with the expected token+amount.
app.get('/api/xrpl/verify-payment', async (req, res) => {
  try {
    const { txid, destination, tokenId, expectedAmount } = req.query as {
      txid?: string;
      destination?: string;
      tokenId?: string;
      expectedAmount?: string;
    };
    if (!txid) {
      res.status(400).json({ error: 'txid is required' });
      return;
    }
    const token = tokenId ? getToken(tokenId) : undefined;
    const result = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'tx', transaction: txid });
      return r.result as Record<string, unknown>;
    });

    const txType = (result.TransactionType as string) ?? '';
    const txDestination = (result.Destination as string) ?? '';
    const delivered = (result.meta as Record<string, unknown>)?.delivered_amount;
    const amount = (result.Amount as Record<string, unknown>) ?? delivered;

    let valid = txType === 'Payment';
    if (destination) valid = valid && txDestination === destination;
    if (token && amount && typeof amount === 'object') {
      const amt = amount as { currency?: string; issuer?: string; value?: string };
      valid = valid && amt.currency === token.currencyHex && amt.issuer === token.issuer;
      if (expectedAmount) valid = valid && amt.value === expectedAmount;
    }

    res.json({
      verified: valid,
      txType,
      destination: txDestination,
      amount,
      result: 'tesSUCCESS' === (result.meta as Record<string, unknown>)?.TransactionResult,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Verify a specific token burn (Payment to blackhole).
app.get('/api/xrpl/verify-burn', async (req, res) => {
  try {
    const { txid, tokenId, expectedAmount } = req.query as {
      txid?: string;
      tokenId?: string;
      expectedAmount?: string;
    };
    if (!txid) {
      res.status(400).json({ error: 'txid is required' });
      return;
    }
    const token = tokenId ? getToken(tokenId) : undefined;
    const result = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'tx', transaction: txid });
      return r.result as Record<string, unknown>;
    });

    const txType = (result.TransactionType as string) ?? '';
    const txDestination = (result.Destination as string) ?? '';
    const delivered = (result.meta as Record<string, unknown>)?.delivered_amount;
    const amount = (result.Amount as Record<string, unknown>) ?? delivered;

    // Accept burn to issuer (canonical XRPL burn) or legacy blackhole
    const expectedDest = token ? token.issuer : BLACKHOLE;
    let valid = txType === 'Payment' && (txDestination === expectedDest || txDestination === BLACKHOLE);
    if (token && amount && typeof amount === 'object') {
      const amt = amount as { currency?: string; issuer?: string; value?: string };
      valid = valid && amt.currency === token.currencyHex && amt.issuer === token.issuer;
      if (expectedAmount) valid = valid && amt.value === expectedAmount;
    }

    res.json({
      verified: valid,
      txType,
      destination: txDestination,
      amount,
      result: 'tesSUCCESS' === (result.meta as Record<string, unknown>)?.TransactionResult,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NEW: Server-side XRPL testnet NFT mint (faucet-funded wallet)
// ---------------------------------------------------------------------------
const TESTNET_MINT_SEED = process.env.TESTNET_MINT_SEED;

app.post('/api/xrpl/testnet/mint', async (req, res) => {
  try {
    if (!TESTNET_MINT_SEED) {
      res.status(503).json({ error: 'TESTNET_MINT_SEED not configured on backend' });
      return;
    }
    const { uri, taxon, destination } = req.body as {
      uri?: string;
      taxon?: number;
      destination?: string;
    };

    const wallet = XrplWallet.fromSeed(TESTNET_MINT_SEED);
    const result = await withXrplClient('devnet', async (c) => {
      // Fund wallet on devnet if needed (idempotent)
      try { await c.fundWallet(wallet); } catch { /* already funded */ }
      const txjson: Record<string, unknown> = {
        TransactionType: 'NFTokenMint',
        Account: wallet.address,
        NFTokenTaxon: Number(taxon ?? 0),
        Flags: 8, // tfTransferable
      };
      if (uri) txjson.URI = toHexURI(uri);
      // If destination given, use NFTokenMint + immediate transfer offer so NFT lands in user wallet
      if (destination) {
        const prepared = await c.autofill(txjson);
        const signed = wallet.sign(prepared);
        const mintResult = await c.submitAndWait(signed.tx_blob);
        const mintMeta = mintResult.result.meta as Record<string, unknown>;
        const nftId = mintMeta?.nftoken_id as string | undefined;
        if (nftId) {
          // Create a free sell offer directly to the destination
          const offerTx = {
            TransactionType: 'NFTokenCreateOffer',
            Account: wallet.address,
            NFTokenID: nftId,
            Amount: '0',
            Flags: 1, // tfSellNFToken
            Destination: destination,
          };
          const prepOffer = await c.autofill(offerTx);
          const signedOffer = wallet.sign(prepOffer);
          const offerResult = await c.submitAndWait(signedOffer.tx_blob);
          const offerMeta = offerResult.result.meta as Record<string, unknown>;
          // offer_id is NOT a top-level meta field — extract from AffectedNodes
          const affectedNodes = (offerMeta?.AffectedNodes as Array<Record<string, unknown>>) ?? [];
          const createdOfferNode = affectedNodes.find(
            (n) => (n.CreatedNode as Record<string, unknown>)?.LedgerEntryType === 'NFTokenOffer',
          );
          const offerId: string | null =
            ((createdOfferNode?.CreatedNode as Record<string, unknown>)?.LedgerIndex as string) ?? null;
          if (offerId) {
            // Track in pending registry so the frontend "Incoming NFTs" section can surface it
            pendingOffers.push({
              offerId,
              nftId,
              destination,
              network: 'devnet',
              metadataUri: uri,
              createdAt: Date.now(),
            });
            saveJson('pendingOffers.json', pendingOffers);
            // Auto-accept the offer on behalf of the destination wallet is not possible server-side
            // Return the offer ID so the frontend can prompt user to accept via Xaman
            return { ...mintResult, _offerId: offerId, _nftId: nftId };
          }
        }
        return mintResult;
      }
      const prepared = await c.autofill(txjson);
      const signed = wallet.sign(prepared);
      return c.submitAndWait(signed.tx_blob);
    });

    const meta = result.result.meta as Record<string, unknown>;
    const nfTokenId = ((result as any)._nftId ?? meta?.nftoken_id ?? null) as string | null;
    const offerId = (result as any)._offerId ?? null;
    res.json({
      ok: true,
      txid: result.result.hash,
      nftoken_id: nfTokenId,
      offer_id: offerId,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Batch mint — uses XRPL Ticket mechanism so individual failures don't block
// the rest. Each NFT gets its own TicketSequence; Sequence is 0 per item.
// Optional collectionId registers results under a named collection.
// ---------------------------------------------------------------------------
interface BatchMintItem {
  uri?: string;
  taxon?: number;
  name?: string;
}

interface BatchMintResult {
  index: number;
  nftId: string | null;
  txid: string;
  offerId: string | null;
  ok: boolean;
  error?: string;
}

interface CollectionEntry {
  id: string;
  name: string;
  description?: string;
  taxon: number;
  network: 'devnet' | 'testnet' | 'mainnet';
  issuer: string;
  items: Array<{ nftId: string; txid: string; name?: string; uri?: string; offerId?: string | null }>;
  createdAt: number;
}

const collections: CollectionEntry[] = loadJson<CollectionEntry[]>('collections.json', []);

app.post('/api/xrpl/testnet/batch-mint', async (req, res) => {
  try {
    if (!TESTNET_MINT_SEED) {
      res.status(503).json({ error: 'TESTNET_MINT_SEED not configured on backend' });
      return;
    }
    const { items, destination, collectionId, collectionName, collectionDescription } = req.body as {
      items?: BatchMintItem[];
      destination?: string;
      collectionId?: string;
      collectionName?: string;
      collectionDescription?: string;
    };
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty' });
      return;
    }
    if (items.length > 50) {
      res.status(400).json({ error: 'Maximum 50 NFTs per batch' });
      return;
    }

    const wallet = XrplWallet.fromSeed(TESTNET_MINT_SEED);
    const results: BatchMintResult[] = [];

    await withXrplClient('devnet', async (c) => {
      // Fund if needed
      try { await c.fundWallet(wallet); } catch { /* already funded */ }

      // 1. Get current sequence
      const accountInfo = await c.request({ command: 'account_info', account: wallet.address });
      const mySequence = accountInfo.result.account_data.Sequence;

      // 2. Create tickets for the whole batch
      const ticketTx = await c.autofill({
        TransactionType: 'TicketCreate',
        Account: wallet.address,
        TicketCount: items.length,
        Sequence: mySequence,
      } as any);
      const signedTicketTx = wallet.sign(ticketTx as any);
      const ticketResult = await c.submitAndWait(signedTicketTx.tx_blob);
      if ((ticketResult.result.meta as any)?.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`TicketCreate failed: ${(ticketResult.result.meta as any)?.TransactionResult}`);
      }

      // 3. Retrieve ticket sequences
      const ticketObjs = await c.request({
        command: 'account_objects',
        account: wallet.address,
        type: 'ticket',
      } as any);
      const tickets: number[] = ((ticketObjs.result as any).account_objects as any[])
        .map((t: any) => t.TicketSequence)
        .filter(Boolean)
        .sort((a: number, b: number) => a - b)
        .slice(0, items.length);

      // 4. Mint each NFT using its ticket
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const ticket = tickets[i];
        if (ticket == null) {
          results.push({ index: i, nftId: null, txid: '', offerId: null, ok: false, error: 'No ticket available' });
          continue;
        }
        try {
          const txjson: Record<string, unknown> = {
            TransactionType: 'NFTokenMint',
            Account: wallet.address,
            NFTokenTaxon: Number(item.taxon ?? 0),
            Flags: 8, // tfTransferable
            Sequence: 0,
            TicketSequence: ticket,
            LastLedgerSequence: null,
          };
          if (item.uri) txjson.URI = toHexURI(item.uri);

          const mintTx = await c.submitAndWait(txjson as any, { wallet });
          const mintMeta = mintTx.result.meta as Record<string, unknown>;
          const nftId = (mintMeta?.nftoken_id ?? null) as string | null;
          let offerId: string | null = null;

          if (nftId && destination) {
            try {
              const offerTx = {
                TransactionType: 'NFTokenCreateOffer',
                Account: wallet.address,
                NFTokenID: nftId,
                Amount: '0',
                Flags: 1, // tfSellNFToken
                Destination: destination,
              };
              const prepOffer = await c.autofill(offerTx);
              const signedOffer = wallet.sign(prepOffer as any);
              const offerResult = await c.submitAndWait(signedOffer.tx_blob);
              const offerMeta = offerResult.result.meta as Record<string, unknown>;
              const affectedNodes = (offerMeta?.AffectedNodes as Array<Record<string, unknown>>) ?? [];
              const createdOfferNode = affectedNodes.find(
                (n) => (n.CreatedNode as Record<string, unknown>)?.LedgerEntryType === 'NFTokenOffer',
              );
              offerId = ((createdOfferNode?.CreatedNode as Record<string, unknown>)?.LedgerIndex as string) ?? null;
              if (offerId) {
                pendingOffers.push({
                  offerId,
                  nftId,
                  destination,
                  network: 'devnet',
                  metadataUri: item.uri,
                  createdAt: Date.now(),
                });
                saveJson('pendingOffers.json', pendingOffers);
              }
            } catch { /* offer creation failure doesn't fail the mint */ }
          }

          results.push({ index: i, nftId, txid: mintTx.result.hash, offerId, ok: true });

          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (e) {
          results.push({ index: i, nftId: null, txid: '', offerId: null, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    });

    // 5. Register collection if requested
    if (collectionName) {
      const id = collectionId ?? `col-${Date.now()}`;
      const existing = collections.find((c) => c.id === id);
      const successItems = results
        .filter((r) => r.ok && r.nftId)
        .map((r) => ({
          nftId: r.nftId!,
          txid: r.txid,
          name: items[r.index]?.name,
          uri: items[r.index]?.uri,
          offerId: r.offerId,
        }));
      if (existing) {
        existing.items.push(...successItems);
      } else {
        collections.push({
          id,
          name: collectionName,
          description: collectionDescription,
          taxon: Number(items[0]?.taxon ?? 0),
          network: 'devnet',
          issuer: XrplWallet.fromSeed(TESTNET_MINT_SEED!).address,
          items: successItems,
          createdAt: Date.now(),
        });
      }
      saveJson('collections.json', collections);
    }

    const successCount = results.filter((r) => r.ok).length;
    res.json({ ok: true, attempted: items.length, minted: successCount, results });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Collection registry — stores named collections of minted NFTs.
// ---------------------------------------------------------------------------
app.get('/api/xrpl/collections/platform', (_req, res) => {
  res.json({ collections: collections.map((c) => ({ ...c, itemCount: c.items.length })) });
});

app.get('/api/xrpl/collections/platform/:id', (req, res) => {
  const col = collections.find((c) => c.id === req.params.id);
  if (!col) { res.status(404).json({ error: 'Collection not found' }); return; }
  res.json(col);
});

app.post('/api/xrpl/collections/platform', (req, res) => {
  const { name, description, taxon, network } = req.body as {
    name?: string;
    description?: string;
    taxon?: number;
    network?: string;
  };
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  if (!TESTNET_MINT_SEED) { res.status(503).json({ error: 'TESTNET_MINT_SEED not configured' }); return; }
  const id = `col-${Date.now()}`;
  const entry: CollectionEntry = {
    id,
    name,
    description,
    taxon: Number(taxon ?? 0),
    network: (network as CollectionEntry['network']) ?? 'devnet',
    issuer: XrplWallet.fromSeed(TESTNET_MINT_SEED).address,
    items: [],
    createdAt: Date.now(),
  };
  collections.push(entry);
  saveJson('collections.json', collections);
  res.json(entry);
});

// ---------------------------------------------------------------------------
// Pending offer registry — tracks offers created by testnet/devnet mint so the
// frontend can show an "Incoming NFTs" section without needing Clio ledger scans.
// ---------------------------------------------------------------------------
interface PendingOffer {
  offerId: string;
  nftId: string;
  destination: string;
  network: 'devnet' | 'testnet' | 'mainnet';
  metadataUri?: string;
  createdAt: number;
}

const pendingOffers: PendingOffer[] = loadJson<PendingOffer[]>('pendingOffers.json', []);

function removePendingOffer(offerId: string) {
  const idx = pendingOffers.findIndex((o) => o.offerId === offerId);
  if (idx !== -1) { pendingOffers.splice(idx, 1); saveJson('pendingOffers.json', pendingOffers); }
}

app.get('/api/xrpl/incoming-offers/:address', (req, res) => {
  const address = req.params.address;
  const network = (req.query.network as string) ?? 'devnet';
  const offers = pendingOffers.filter(
    (o) => o.destination === address && o.network === network,
  );
  res.json({ offers });
});

app.delete('/api/xrpl/incoming-offers/:offerId', (req, res) => {
  removePendingOffer(req.params.offerId);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Accept NFT offer via Xaman — user signs NFTokenAcceptOffer in their wallet
// ---------------------------------------------------------------------------
app.post('/api/xaman/accept-offer', async (req, res) => {
  try {
    const { offerId, nftName } = req.body as { offerId?: string; nftName?: string };
    if (!offerId) { res.status(400).json({ error: 'offerId required' }); return; }
    removePendingOffer(offerId);
    const label = nftName ? `Accept NFT: ${nftName}` : 'Accept NFT transfer';
    const payload = await sdk.payload.create({
      txjson: {
        TransactionType: 'NFTokenAcceptOffer',
        NFTokenSellOffer: offerId,
      } as any,
      custom_meta: {
        instruction: label,
        blob: { id: offerId },
      },
    } as any);
    if (!payload) { res.status(500).json({ error: 'Failed to create Xaman payload' }); return; }
    res.json({ uuid: payload.uuid, next: payload.next, refs: payload.refs, pushed: payload.pushed });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Recent XRPL listings registry — tracks NFTs listed on this platform.
// Entries are created when create-sell-offer fires and confirmed by the frontend
// after Xaman signs. GET /api/xrpl/recent-listings returns the 50 newest.
// ---------------------------------------------------------------------------
interface RecentListing {
  id: string;           // uuid (= Xaman payload uuid)
  nftId: string;
  priceXrp: string;
  network: string;
  nftName?: string;
  metadataUri?: string;
  imageUrl?: string;
  seller?: string;      // XRPL address — filled on confirm
  isPrivate: boolean;
  confirmed: boolean;
  listedAt: number;
}

const recentListings: RecentListing[] = loadJson<RecentListing[]>('recentListings.json', []);
const MAX_RECENT = 50;

function upsertRecentListing(entry: RecentListing) {
  const idx = recentListings.findIndex((l) => l.id === entry.id);
  if (idx !== -1) {
    recentListings[idx] = { ...recentListings[idx], ...entry };
  } else {
    recentListings.unshift(entry);
    if (recentListings.length > MAX_RECENT) recentListings.length = MAX_RECENT;
  }
  saveJson('recentListings.json', recentListings);
}

app.get('/api/xrpl/recent-listings', (_req, res) => {
  res.json({ listings: recentListings.filter((l) => l.confirmed) });
});

// Called by the frontend after Xaman signing resolves to confirm + attach seller address.
app.post('/api/xrpl/confirm-listing', (req, res) => {
  const { uuid, seller, imageUrl } = req.body as { uuid?: string; seller?: string; imageUrl?: string };
  if (!uuid) { res.status(400).json({ error: 'uuid required' }); return; }
  const listing = recentListings.find((l) => l.id === uuid);
  if (!listing) { res.status(404).json({ error: 'listing not found' }); return; }
  listing.confirmed = true;
  if (seller) listing.seller = seller;
  if (imageUrl) listing.imageUrl = imageUrl;
  res.json({ ok: true, listing });
});

// ---------------------------------------------------------------------------
// Create XRPL sell offer — user signs NFTokenCreateOffer in their wallet via Xaman.
// Price is in XRP (e.g. "5.5"). If `destination` is set, the offer is private
// (only that address can accept it).
// ---------------------------------------------------------------------------
app.post('/api/xaman/create-sell-offer', async (req, res) => {
  try {
    const { nftId, priceXrp, destination, nftName, metadataUri, network = 'devnet' } = req.body as {
      nftId?: string;
      priceXrp?: string | number;
      destination?: string;
      nftName?: string;
      metadataUri?: string;
      network?: string;
    };
    if (!nftId) { res.status(400).json({ error: 'nftId required' }); return; }
    if (priceXrp === undefined || priceXrp === null) { res.status(400).json({ error: 'priceXrp required' }); return; }

    const drops = String(Math.round(Number(priceXrp) * 1_000_000)); // XRP → drops
    const tx: Record<string, unknown> = {
      TransactionType: 'NFTokenCreateOffer',
      NFTokenID: nftId,
      Amount: drops,
      Flags: 1, // tfSellNFToken
    };
    if (destination) tx.Destination = destination;

    const isPrivate = Boolean(destination);
    const label = isPrivate
      ? `List "${nftName ?? nftId.slice(0, 8)}" privately to ${destination!.slice(0, 8)}… for ${priceXrp} XRP`
      : `List "${nftName ?? nftId.slice(0, 8)}" for ${priceXrp} XRP on ${network}`;

    const payload = await sdk.payload.create({
      txjson: tx as any,
      custom_meta: { instruction: label, blob: { nftId, priceXrp: String(priceXrp), network } },
    } as any);
    if (!payload) { res.status(500).json({ error: 'Failed to create Xaman payload' }); return; }

    // Register in recent listings (unconfirmed until frontend calls confirm-listing)
    upsertRecentListing({
      id: payload.uuid,
      nftId,
      priceXrp: String(priceXrp),
      network,
      nftName,
      metadataUri,
      isPrivate,
      confirmed: false,
      listedAt: Date.now(),
    });

    res.json({ uuid: payload.uuid, next: payload.next, refs: payload.refs, pushed: payload.pushed });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Create XRPL buy offer — buyer places a bid via NFTokenCreateOffer (buy side).
// `ownerAddress` is required (the current NFT owner). If `destination` is set
// to the seller's address the bid is private (only seller can see / accept it).
// Price is in XRP.
// ---------------------------------------------------------------------------
app.post('/api/xaman/create-buy-offer', async (req, res) => {
  try {
    const { nftId, priceXrp, ownerAddress, destination, nftName, network = 'devnet' } = req.body as {
      nftId?: string;
      priceXrp?: string | number;
      ownerAddress?: string;
      destination?: string;
      nftName?: string;
      network?: string;
    };
    if (!nftId) { res.status(400).json({ error: 'nftId required' }); return; }
    if (!ownerAddress) { res.status(400).json({ error: 'ownerAddress required' }); return; }
    if (priceXrp === undefined || priceXrp === null) { res.status(400).json({ error: 'priceXrp required' }); return; }

    const drops = String(Math.round(Number(priceXrp) * 1_000_000));
    const tx: Record<string, unknown> = {
      TransactionType: 'NFTokenCreateOffer',
      NFTokenID: nftId,
      Amount: drops,
      Owner: ownerAddress,
      // No Flags = buy offer (flag 0 / omitted means buy side)
    };
    if (destination) tx.Destination = destination; // private: only seller can accept

    const isPrivate = Boolean(destination);
    const label = isPrivate
      ? `Private bid on "${nftName ?? nftId.slice(0, 8)}" — ${priceXrp} XRP (to ${destination?.slice(0, 8)}…)`
      : `Bid on "${nftName ?? nftId.slice(0, 8)}" — ${priceXrp} XRP`;

    const payload = await sdk.payload.create({
      txjson: tx as any,
      custom_meta: { instruction: label, blob: { nftId, priceXrp: String(priceXrp), isPrivate, network } },
    } as any);
    if (!payload) { res.status(500).json({ error: 'Failed to create Xaman payload' }); return; }
    res.json({ uuid: payload.uuid, next: payload.next, refs: payload.refs, pushed: payload.pushed });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Midnight private bid registry — off-chain bid book for Midnight listings.
// Bids are stored here; the seller accepts by calling buyListing on-chain.
// ---------------------------------------------------------------------------
interface MidnightBid {
  id: string;           // uuid
  listingId: string;    // Midnight listing hex id
  bidderAddress: string; // Midnight shielded address or coin pubkey hex
  priceNight: string;   // price in NIGHT (human units)
  message?: string;     // optional note from bidder
  createdAt: number;
}

const midnightBids: MidnightBid[] = loadJson<MidnightBid[]>('midnightBids.json', []);

app.post('/api/midnight/bids', (req, res) => {
  const { listingId, bidderAddress, priceNight, message } = req.body as {
    listingId?: string;
    bidderAddress?: string;
    priceNight?: string;
    message?: string;
  };
  if (!listingId || !bidderAddress || !priceNight) {
    res.status(400).json({ error: 'listingId, bidderAddress, priceNight required' });
    return;
  }
  const bid: MidnightBid = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listingId,
    bidderAddress,
    priceNight,
    message,
    createdAt: Date.now(),
  };
  midnightBids.push(bid);
  saveJson('midnightBids.json', midnightBids);
  res.json({ ok: true, bid });
});

app.get('/api/midnight/bids/:listingId', (req, res) => {
  const bids = midnightBids.filter((b) => b.listingId === req.params.listingId);
  res.json({ bids });
});

app.delete('/api/midnight/bids/:bidId', (req, res) => {
  const idx = midnightBids.findIndex((b) => b.id === req.params.bidId);
  if (idx !== -1) { midnightBids.splice(idx, 1); saveJson('midnightBids.json', midnightBids); }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GXG-gated mainnet mint: verify GXG hold then mint directly to user wallet
// ---------------------------------------------------------------------------
const GXG_TOKEN_ID = '47616D657258476F6C6400000000000000000000';
const GXG_ISSUER = 'rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2';
const GXG_HOLD_THRESHOLD = 1;
const MAINNET_MINT_SEED = process.env.MAINNET_MINT_SEED;

app.post('/api/xrpl/gxg-mint', async (req, res) => {
  try {
    if (!MAINNET_MINT_SEED) {
      res.status(503).json({ error: 'MAINNET_MINT_SEED not configured on backend' });
      return;
    }
    const { uri, taxon, destination } = req.body as {
      uri?: string;
      taxon?: number;
      destination?: string;
    };
    if (!destination) {
      res.status(400).json({ error: 'destination (user wallet address) is required' });
      return;
    }

    // 1. Verify GXG hold on mainnet
    const lines = await withXrplClient('mainnet', async (c) => {
      const r = await c.request({ command: 'account_lines', account: destination });
      return r.result.lines as Array<{ currency: string; account: string; balance: string }>;
    });
    const match = lines.find((l) => l.account === GXG_ISSUER && l.currency === GXG_TOKEN_ID);
    const balance = match ? parseFloat(match.balance) : 0;
    if (balance < GXG_HOLD_THRESHOLD) {
      res.status(403).json({
        error: `GXG hold requirement not met. You hold ${balance} GXG, need at least ${GXG_HOLD_THRESHOLD}.`,
        balance,
        required: GXG_HOLD_THRESHOLD,
      });
      return;
    }

    // 2. Mint directly to user wallet on mainnet using Issuer field
    const wallet = XrplWallet.fromSeed(MAINNET_MINT_SEED);
    const result = await withXrplClient('mainnet', async (c) => {
      const txjson: Record<string, unknown> = {
        TransactionType: 'NFTokenMint',
        Account: wallet.address,
        NFTokenTaxon: Number(taxon ?? 0),
        Flags: 8, // tfTransferable
        Issuer: destination,
      };
      if (uri) txjson.URI = toHexURI(uri);
      const prepared = await c.autofill(txjson);
      const signed = wallet.sign(prepared);
      return c.submitAndWait(signed.tx_blob);
    });

    const meta = result.result.meta as Record<string, unknown>;
    const nfTokenId = (meta?.nftoken_id as string) ?? null;
    res.json({ ok: true, txid: result.result.hash, nftoken_id: nfTokenId, gxgBalance: balance });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// NFT metadata + image upload — pins to IPFS via Pinata (with local fallback)
// ---------------------------------------------------------------------------
const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static('uploads'));

async function pinFileToIPFS(filePath: string, fileName: string, mime: string): Promise<string> {
  const buf = readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime || 'application/octet-stream' }), fileName);
  form.append('pinataMetadata', JSON.stringify({ name: fileName }));
  const r = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });
  if (!r.ok) throw new Error(`Pinata file pin failed: ${r.status} ${await r.text()}`);
  const data = (await r.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

async function pinJSONToIPFS(json: unknown, name: string): Promise<string> {
  const r = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinataContent: json, pinataMetadata: { name } }),
  });
  if (!r.ok) throw new Error(`Pinata JSON pin failed: ${r.status} ${await r.text()}`);
  const data = (await r.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image uploaded' });
    return;
  }
  const { name = '', description = '', attributes = '[]' } = req.body;
  let attrs: unknown[] = [];
  try {
    attrs = JSON.parse(String(attributes)) || [];
  } catch {
    attrs = [];
  }

  try {
    if (PINATA_JWT) {
      // 1. Pin the image, 2. build metadata pointing at the image's ipfs:// URI,
      // 3. pin the metadata JSON. Everything is content-addressed and persists
      // independently of this backend.
      const imageCid = await pinFileToIPFS(req.file.path, req.file.originalname || 'image', req.file.mimetype);
      const imageUri = `ipfs://${imageCid}`;
      const imageUrl = `${PINATA_GATEWAY}/ipfs/${imageCid}`;
      const metadata = {
        name: String(name).trim() || 'Untitled',
        description: String(description).trim() || '',
        image: imageUri,
        attributes: attrs,
      };
      const metaCid = await pinJSONToIPFS(metadata, `${metadata.name}.json`);
      const metadataUri = `ipfs://${metaCid}`;
      const metadataUrl = `${PINATA_GATEWAY}/ipfs/${metaCid}`;
      try { unlinkSync(req.file.path); } catch { /* best-effort cleanup */ }
      res.json({ storage: 'ipfs', imageUri, imageUrl, metadataUri, metadataUrl, metadata });
      return;
    }

    // Fallback: serve locally (not durable; configure PINATA_JWT for IPFS).
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const metadata = {
      name: String(name).trim() || 'Untitled',
      description: String(description).trim() || '',
      image: imageUrl,
      attributes: attrs,
    };
    const metaFileName = `${req.file.filename}.json`;
    writeFileSync(`uploads/${metaFileName}`, JSON.stringify(metadata, null, 2));
    const metadataUrl = `${req.protocol}://${req.get('host')}/uploads/${metaFileName}`;
    res.json({ storage: 'local', imageUri: imageUrl, imageUrl, metadataUri: metadataUrl, metadataUrl, metadata });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------------------------------------------------------------------------
// Auction registry — time-limited auctions with public + private bids.
// All storage is in-memory; persists until backend restarts.
// ---------------------------------------------------------------------------
interface AuctionBid {
  id: string;
  bidder: string;       // XRPL address of bidder (set on confirm) or label
  amountXrp: string;    // human XRP amount
  isPrivate: boolean;   // if true, bid is hidden from public; seller sees all
  message?: string;
  placedAt: number;
  confirmed: boolean;   // true after Xaman sign completes
  xamanUuid?: string;
  xamanOfferId?: string; // LedgerIndex of the on-chain NFTokenCreateOffer (set on confirm)
}

interface Auction {
  id: string;           // uuid
  nftId: string;
  network: string;
  seller: string;       // XRPL address of seller
  nftName?: string;
  imageUrl?: string;
  metadataUri?: string;
  reserveXrp: string;   // minimum bid
  endsAt: number;       // unix ms
  isPublic: boolean;    // if false, only invited bidders can see it (future: invite list)
  status: 'active' | 'ended' | 'cancelled';
  bids: AuctionBid[];
  createdAt: number;
}

const auctions: Auction[] = loadJson<Auction[]>('auctions.json', []);

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Create auction
app.post('/api/auctions', (req, res) => {
  const {
    nftId, network = 'devnet', seller, nftName, imageUrl, metadataUri,
    reserveXrp = '0', durationHours = 24, isPublic = true,
  } = req.body as {
    nftId?: string; network?: string; seller?: string; nftName?: string;
    imageUrl?: string; metadataUri?: string; reserveXrp?: string;
    durationHours?: number; isPublic?: boolean;
  };
  if (!nftId || !seller) { res.status(400).json({ error: 'nftId and seller required' }); return; }
  const auction: Auction = {
    id: makeId(),
    nftId, network, seller, nftName, imageUrl, metadataUri,
    reserveXrp: String(reserveXrp),
    endsAt: Date.now() + Number(durationHours) * 3_600_000,
    isPublic: Boolean(isPublic),
    status: 'active',
    bids: [],
    createdAt: Date.now(),
  };
  auctions.unshift(auction);
  saveJson('auctions.json', auctions);
  res.json({ ok: true, auction });
});

// List all active auctions (public ones always shown; private ones shown to all for now)
app.get('/api/auctions', (_req, res) => {
  const now = Date.now();
  // Auto-expire
  auctions.forEach((a) => { if (a.status === 'active' && a.endsAt < now) a.status = 'ended'; });
  res.json({ auctions: auctions.filter((a) => a.status === 'active') });
});

// Get single auction (with all bids for seller; public bids only for others)
app.get('/api/auctions/:id', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) { res.status(404).json({ error: 'Auction not found' }); return; }
  const caller = req.query.caller as string | undefined;
  const bids = auction.bids.filter(
    (b) => b.confirmed && (!b.isPrivate || caller === auction.seller),
  );
  res.json({ auction: { ...auction, bids } });
});

// Place a bid — creates a Xaman NFTokenCreateOffer (buy-side) payload
app.post('/api/auctions/:id/bids', async (req, res) => {
  try {
    const auction = auctions.find((a) => a.id === req.params.id);
    if (!auction) { res.status(404).json({ error: 'Auction not found' }); return; }
    if (auction.status !== 'active') { res.status(400).json({ error: 'Auction is not active' }); return; }
    if (Date.now() > auction.endsAt) { auction.status = 'ended'; res.status(400).json({ error: 'Auction has ended' }); return; }

    const { amountXrp, isPrivate = false, message, bidderLabel } = req.body as {
      amountXrp?: string; isPrivate?: boolean; message?: string; bidderLabel?: string;
    };
    if (!amountXrp) { res.status(400).json({ error: 'amountXrp required' }); return; }

    const drops = String(Math.round(Number(amountXrp) * 1_000_000));
    const tx: Record<string, unknown> = {
      TransactionType: 'NFTokenCreateOffer',
      NFTokenID: auction.nftId,
      Amount: drops,
      Owner: auction.seller,
    };
    // Private bid: Destination = seller so only they can accept
    if (isPrivate) tx.Destination = auction.seller;

    const privLabel = isPrivate ? ' (private)' : '';
    const label = `Bid on "${auction.nftName ?? auction.nftId.slice(0, 8)}" — ${amountXrp} XRP${privLabel}`;

    const payload = await sdk.payload.create({
      txjson: tx as any,
      custom_meta: {
        instruction: label,
        blob: { auctionId: auction.id, amountXrp, isPrivate },
      },
    } as any);
    if (!payload) { res.status(500).json({ error: 'Failed to create Xaman payload' }); return; }

    const bid: AuctionBid = {
      id: makeId(),
      bidder: bidderLabel ?? 'unknown',
      amountXrp,
      isPrivate: Boolean(isPrivate),
      message,
      placedAt: Date.now(),
      confirmed: false,
      xamanUuid: payload.uuid,
    };
    auction.bids.push(bid);
    saveJson('auctions.json', auctions);

    res.json({ bidId: bid.id, uuid: payload.uuid, next: payload.next, refs: payload.refs });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Confirm bid after Xaman signs (frontend calls this)
app.post('/api/auctions/:id/bids/:bidId/confirm', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) { res.status(404).json({ error: 'Auction not found' }); return; }
  const bid = auction.bids.find((b) => b.id === req.params.bidId);
  if (!bid) { res.status(404).json({ error: 'Bid not found' }); return; }
  const { bidder } = req.body as { bidder?: string };
  bid.confirmed = true;
  if (bidder) bid.bidder = bidder as string;
  const { offerId } = req.body as { offerId?: string };
  if (offerId) bid.xamanOfferId = offerId;
  saveJson('auctions.json', auctions);
  res.json({ ok: true, bid });
});

// Cancel / close auction (seller only)
app.post('/api/auctions/:id/cancel', (req, res) => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) { res.status(404).json({ error: 'Auction not found' }); return; }
  const { seller } = req.body as { seller?: string };
  if (seller && seller !== auction.seller) { res.status(403).json({ error: 'Not the seller' }); return; }
  auction.status = 'cancelled';
  saveJson('auctions.json', auctions);
  res.json({ ok: true });
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

// ---------------------------------------------------------------------------
// Serve built frontend static files (production / Docker build)
// The Dockerfile copies packages/web/dist → packages/xaman-backend/public
// ---------------------------------------------------------------------------
const STATIC_DIR = join(process.cwd(), 'public');
if (existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  // SPA fallback — any non-API route serves index.html
  app.get('*', (_req, res) => {
    const indexPath = join(STATIC_DIR, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not found');
    }
  });
  console.log(`[static] Serving frontend from ${STATIC_DIR}`);
}

app.listen(PORT, () => {
  console.log(`Layla backend listening on http://localhost:${PORT} (CORS: ${origins.join(', ')})`);
});

