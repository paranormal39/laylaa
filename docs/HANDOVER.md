# laylaa — Handover

Cold-start doc so anyone can pick up the project. Refreshed at the end of every completed task.

_Last updated: 2026-06-08 (session 16)._

## What this is
A cross-chain NFT marketplace dApp (**laylaa**) bridging **XRPL** and **Midnight**.
Evolving from a burn-to-mint demo into a full marketplace + mint + token-gated mint app.
Brand: **laylaa — The XRPL Midnight NFT Marketplace**.

## Repo layout (relevant)
- `contracts/midnight/{nft,bridge,marketplace,collection}/` — compiled Compact contracts (toolchain 0.30.0, runtime 0.15.0).
- `packages/web/` — Vite + React + TS + Tailwind dApp (Lace + Xaman). **Primary app.**
- `packages/xaman-backend/` — Express + `xumm-sdk` backend (holds API secret, builds sign payloads).
- `packages/nftmarket-cli/` — CLI (reference for proven Midnight orchestration logic).

## Current state (works)
- dApp shell with 5 tabs: **Market**, **Create**, **My NFTs**, **Bridge**, **Wallets** (`packages/web/src/App.tsx`).
  - **Market** =
    - **Live Auctions** (amber) — timed XRPL NFT auctions created by any seller; public + private bids via Xaman; live countdown; seller cancel; auto-refresh 30 s.
    - **Newly Listed on Layla** (accent) — platform-tracked sell-offer listings confirmed after Xaman signing; auto-refresh 30 s.
    - **Curated List** — 4 hand-picked mainnet collections.
    - **XRPL Collections** — issuer feed.
    - **Your Listed NFTs** — wallet's NFTs with active on-chain sell offers; network switcher (devnet/testnet/mainnet); lowest ask price in XRP.
    - **Trending** (Bithomp with fallback).
    - **Midnight Marketplace Listings** — Midnight preview contract listings with NIGHT prices and off-chain private bids.
  - **Create** = XRPL Testnet/Devnet mint, Midnight preview mint, three token-to-NFT modes (hold-gated, pay-to-treasury, burn) using mainnet tokens, and **Batch Mint** (up to 50 NFTs, XRPL Tickets, per-item image upload, collection registration).
  - **My NFTs** = My Midnight NFTs (images + names from contract `metadataOf`) + **Incoming NFTs** (pending XRPL sell offers to accept via Xaman) + **My XRPL NFTs** (devnet/testnet/mainnet switcher) with three actions per card:
    - **List for XRP** — `NFTokenCreateOffer` sell-side via Xaman, optional private `Destination`.
    - **Place bid** — `NFTokenCreateOffer` buy-side via Xaman, private checkbox (sets `Destination = seller`).
    - **Put up for auction** — creates a timed auction entry on the backend; reserve price, duration, public/private.
  - **Bridge** = XRPL-NFT burn-to-mint (`BurnToMintPanel`, devnet/testnet/mainnet network switcher) + fungible-token burn-to-mint (`TokenBurnToMintPanel`, GamerXGold only).
  - **Wallets** = Lace + Xaman connect + Midnight contract deploy/join for NFT, Bridge, and Marketplace contracts (`WalletPanel`, `ContractsPanel`).
- **UI theme**: warm cream × deep brown × gold (DM Serif Display + DM Sans). Light/dark toggle (☀️/🌙) in header, persisted to `localStorage` (`laylaa-theme`). All Tailwind colors driven by CSS custom properties in `src/index.css`; no dark-mode flash thanks to pre-paint inline script in `index.html`.
- **Lace integration migrated to DApp Connector API v4** (`packages/web/src/lib/midnight.ts`): `connect(networkId)` handshake, `getConfiguration()`, `getShieldedAddresses()` (Bech32m → hex), in-memory private state, serialized-hex `balanceTx`/`submitTx`. See the v4 memory/notes.
- **Curated List**: backend `GET /api/xrpl/curated` (`CURATED_COLLECTIONS` in `packages/xaman-backend/src/index.ts`) + `getCuratedCollections()` in `packages/web/src/lib/xaman.ts`, rendered as the first Market section.
- **Xaman QR Modal**: every `openAndAwait()` call now fires a `xaman:open` CustomEvent which `<XamanModal>` (mounted in `App.tsx`) catches and renders — showing the Xaman QR code PNG + "Open in Xaman" deeplink button. Works from desktop browser (QR scan on phone) and mobile (deeplink tap). Modal auto-closes on sign/cancel/expire.
- **Incoming NFTs section** in My NFTs tab: backend maintains an in-memory `pendingOffers[]` registry. When devnet mint creates a sell offer for a destination address it is pushed into the registry. `GET /api/xrpl/incoming-offers/:address` returns pending offers; each card shows the NFT image/name (resolved from IPFS metadata) and an "Accept in Xaman" button. Registry entry is removed when `/api/xaman/accept-offer` is called. **Note: registry is in-memory — clears on backend restart.**
- **Midnight NFT images** in My NFTs tab: `fetchMidnight` now calls `getTokenMetadataMap()` in parallel with `getOwnedTokens()`, passing each token's CID to `MidnightNftCard`. Cards fetch metadata JSON from IPFS and display image + NFT name.
- **NFT offer `offer_id` fix**: backend `testnetMint` now correctly extracts the created offer index from `AffectedNodes → CreatedNode (LedgerEntryType: NFTokenOffer) → LedgerIndex` instead of non-existent top-level `offer_id`.
- **Xaman `[no name found]` fix**: `/api/xaman/accept-offer` now includes `custom_meta.instruction: "Accept NFT: <name>"` in the Xaman payload; frontend passes the NFT name from the Create flow.
- Vite configured for WASM + node polyfills; CJS Midnight packages pre-bundled; `ledger-v8` excluded from pre-bundle; sourcemap warnings suppressed.
- Contracts are deployed via the CLI (`npm run dev -w @nftmarket/cli` → Deploy contracts) against a local proof server (`packages/nftmarket-cli/proof-server.yml`).

## How to run (WSL bash, not PowerShell for npm)
```bash
cd ~/CascadeProjects/Windsurf-Porject/counter/example-counter
# 1. build contract packages (needed by web + copy-zk)
npm run compact -w @nftmarket/nft-contract && npm run build -w @nftmarket/nft-contract
npm run compact -w @nftmarket/bridge-contract && npm run build -w @nftmarket/bridge-contract
npm run compact -w @nftmarket/marketplace-contract && npm run build -w @nftmarket/marketplace-contract
# 2. install
npm install
# 3. backend (needs packages/xaman-backend/.env from .env.example)
npm run dev -w @nftmarket/xaman-backend       # http://localhost:4000
# 4. web (separate terminal)
npm run dev -w @nftmarket/web                  # http://localhost:5173
```
Also required for Midnight ops: **Lace (Midnight)** extension + a **proof server** (Lace points to one), Midnight Preview funds via faucet.

## Secrets / env needed
- `packages/xaman-backend/.env`: `XUMM_API_KEY`, `XUMM_API_SECRET` (from apps.xaman.dev), `CORS_ORIGINS`, `PORT`, `TESTNET_MINT_SEED` (generate and fund a testnet wallet), `TREASURY_ADDRESS` (for pay-to-mint), `PINATA_JWT` (IPFS pinning), optional `COLLECTION_ISSUERS` (comma-separated `Name:rIssuer[:taxon]`).
- `packages/web/.env` (optional): `VITE_BITHOMP_API_KEY` (live trending feed), `VITE_TREASURY_ADDRESS` (must match backend treasury), and contract overrides `VITE_NFT_ADDRESS` / `VITE_BRIDGE_ADDRESS` / `VITE_MARKETPLACE_ADDRESS` / `VITE_COLLECTION_ADDRESS`, plus `VITE_PROOF_SERVER` / `VITE_MIDNIGHT_NETWORK` for the Lace flow.

## Test data
- Mainnet tokens: **GamerXGold only** (`rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2`, hex `47616D657258476F6C6400000000000000000000`). XRdoge removed.
- Fungible-token burn destination: **issuer address** (`rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2`) — canonical XRPL burn, no trustline required. Blackhole `rrrrrrrrrrrrrrrrrrrrrhoLvTp` is only used for XRPL-NFT burn (`NFTokenBurn` tx type), not for issued-currency payments.

## Backend registries (persisted to `data/*.json`)
| Registry | Variable | File |
|---|---|---|
| Pending XRPL sell offers (incoming NFTs) | `pendingOffers[]` | `data/pendingOffers.json` |
| Recent platform listings | `recentListings[]` | `data/recentListings.json` |
| Auctions + bids | `auctions[]` | `data/auctions.json` |
| Midnight off-chain bids | `midnightBids[]` | `data/midnightBids.json` |
| Platform collections (batch mint) | `collections[]` | `data/collections.json` |

**All registries now persist to `packages/xaman-backend/data/*.json`** — written on every mutation, loaded on boot. The `data/` directory is created automatically; no setup needed.

## Auction system
- **Backend**: `POST /api/auctions` → create; `GET /api/auctions` → list active (auto-expires); `GET /api/auctions/:id?caller=address` → single (seller sees private bids); `POST /api/auctions/:id/bids` → Xaman buy-offer payload + bid entry; `POST /api/auctions/:id/bids/:bidId/confirm` → mark signed + attach bidder address; `POST /api/auctions/:id/cancel`.
- **Bid signing**: `placeAuctionBid()` in `xaman.ts` calls backend to get Xaman payload, opens Xaman QR modal, and on success posts to `/confirm`. The on-chain offer is a real `NFTokenCreateOffer` (buy-side); private bids set `Destination = seller`.
- **Seller acceptance** (not yet automated in UI): seller picks the winning bid's `NFTokenID` and calls `NFTokenAcceptOffer` via Xaman's accept-offer flow.

## Session 13 additions (2026-06-08)
- **Batch Mint** (`POST /api/xrpl/testnet/batch-mint`): creates XRPL `TicketCreate` for N tickets, mints each NFT with its own `TicketSequence` (individual failures don't cascade), creates free transfer offers to destination, pushes each to `pendingOffers`. Max 50 per call.
- **Platform Collection Registry**: `GET/POST /api/xrpl/collections/platform`, `GET /api/xrpl/collections/platform/:id`. Batch mint auto-registers a named collection when `collectionName` is provided.
- **`BatchMintPanel`** in `CreatePage` (new Batch Mint mode): collection name/taxon/desc, per-item image upload + name rows, Add/Remove buttons (max 50), live scrolling log, per-item success/fail with NFTokenID.
- Frontend helpers in `xaman.ts`: `batchMint()`, `getPlatformCollections()`, `getPlatformCollection()`.

## Session 12 fixes (2026-06-08)
- **`BurnToMintPanel` network hardcoded to testnet** — fixed. Now has devnet/testnet/mainnet pill switcher (default devnet, where the app mints); auto-clears NFT selection on switch.
- **Fungible-token burn destination was BLACKHOLE** — fixed. `burn-token` endpoint sends to `token.issuer`; `verify-burn` accepts `destination === issuer` or legacy blackhole.
- **XRdoge removed** from backend `TOKENS[]` and frontend `src/lib/tokens.ts`. Only GamerXGold active for current testing.

## Known issues / risks
- **All registries are in-memory** — see table above. Workaround: re-mint / re-list to regenerate.
- **Auction acceptance not yet automated**: seller must manually accept the winning bid's on-chain offer via Xaman. A future "Accept winning bid" button in `AuctionCard` is the clean fix.
- **Bridge verifier-key mismatch — resolved 2026-06-07**: the old baked address (`9458db57…`) had a key mismatch after `bridge.compact` was recompiled. Root cause of the redeploy blocker was two copies of `ledger-v8` (`8.0.3` root vs `8.1.0` nested), fixed by pinning to `8.1.0` in root `dependencies` + `overrides`. Bridge redeployed to `a8a1bf5445d6e3d8e8360d70cad117a294eec23a840ffdf6bb12f3d114201914`; `DEFAULT_CONTRACTS.bridge` updated in `midnight.ts`. The amber `bridgeJoinError` panel in `BridgePage.tsx` can be removed once the new address is confirmed working in production.
- **NFT collection images**: as of 2026-06-07 the backend `fetchCollections` resolves each NFT's display image via `resolveImage()` — it fetches the on-chain URI's metadata JSON and extracts `.image` (ipfs→https), instead of pointing `<img>` at the metadata JSON itself (which rendered blank). Direct-image URIs and image content-types are used as-is; failures fall back to the UI placeholder.
- **Curated List can still return empty**: both `/api/xrpl/curated` and `/api/xrpl/collections` use Clio's `nfts_by_issuer`; the default `COLLECTION_ISSUERS` fall back to the fungible-token issuers (GamerXGold/XRdoge) which have **no NFTs**. Use `CURATED_COLLECTIONS` (real NFT issuers) and ensure the endpoint is Clio-capable (`wss://xrplcluster.com`) and that the addresses are the NFToken `Issuer`.
- Token-to-NFT minting is cross-network (mainnet token condition → testnet/preview NFT output); verification is off-chain via backend.
- npm must be run inside WSL bash; running from Windows/PowerShell over the UNC path corrupts installs.
- Pre-existing TS module-not-found errors for contract packages (IDE only) resolve after `npm install` + contract build; the web build typechecks clean.

## Launch readiness checklist

### Must-have before public launch
- [x] **Task 13 — Persist registries**: ✅ Done.
- [x] **Real curated collections**: ✅ `CURATED_ISSUERS` set in `.env.example` with 4 real mainnet collections (Wandering Souls, Island Ghost, Play Coin, Casino Society).
- [x] **Auction acceptance UI**: ✅ Done. `acceptAuctionBid()` in `xaman.ts`; `AuctionCard` shows "Accept highest bid (X XRP)" button for the seller; stores `xamanOfferId` on bid confirm.
- [x] **Rate limiting**: ✅ Done. `express-rate-limit` added (`generalLimiter` 200 req/15 min on `/api`, `xamanLimiter` 30 req/15 min on `/api/xaman` + `/api/auctions`).
- [x] **Railway / hosting deploy**: ✅ Done. `Dockerfile` (multi-stage: builds web → copies dist to backend `/public`) + `railway.toml` + `.dockerignore` added at repo root. Backend serves frontend static files + SPA fallback in production.
- [x] **Custom domain + HTTPS**: ✅ Handled by Railway — the single service serves both API and frontend on the same port/domain. No reverse proxy needed.

### Nice-to-have / polish
- [ ] **Task 16 — Midnight on-chain bidding**: `placeBid`/`acceptBid` in `marketplace.compact`.
- [ ] **Trending feed**: add `VITE_BITHOMP_API_KEY` for live Bithomp trending data (currently falls back to sample).
- [ ] **Task 15 — Auction UX**: seller highlight for winning/highest bid; countdown styling for last-minute bids.
- [ ] **Collection page**: dedicated route `/collections/:id` showing all NFTs in a platform collection with floor price aggregation.
- [ ] **Mobile responsive pass**: Tailwind breakpoints reviewed for small-screen use.
- [ ] **Error boundary**: wrap page components so one broken section doesn't crash the whole dApp.

## Next up
- **Run `npm install`** in WSL to pull `express-rate-limit` before the next dev session.
- **Full E2E auction test**: My NFTs → Put up for auction → Market tab → Place bid → Xaman sign → bid appears → seller clicks "Accept highest bid" → Xaman sign → auction closes.
- **Railway deploy**: push to GitHub, connect repo to Railway, set all env vars (see Secrets section), deploy. URL will be `https://<service>.up.railway.app`.
- **UI polish pass** — user has a mock UI + logo ready for the next session.
