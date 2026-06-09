# laylaa — Living Plan

Authoritative, continuously-updated task plan for turning the burn-to-mint demo into a full
cross-chain NFT marketplace. Updated as each task completes (status, decisions, deviations).

> See `docs/HANDOVER.md` for cold-start run instructions and current state.

## Confirmed decisions
- **Brand**: **laylaa** — The XRPL Midnight NFT Marketplace.
- **Listings (read)**: XRPL **mainnet** (connected wallet + trending feed) + Midnight **preview** (marketplace contract + nft holdings).
- **Create / mint**: XRPL **testnet** + Midnight **preview** (collection = taxon).
- **Token-to-NFT**: tokens on XRPL **mainnet**, signed via Xaman mainnet account; modes: hold-gated, pay-to-treasury, burn.
- **Burn-to-mint**: existing XRPL-NFT burn + new fungible-token burn variant; mint output on testnet/preview.

### Test tokens (mainnet)
| Name | Issuer | Currency (hex) |
| --- | --- | --- |
| GamerXGold | `rMczrvMki7DuXsuMf3zGUrqAmWvLKZNnt2` | `47616D657258476F6C6400000000000000000000` |

### Defaults chosen
- Trending feed source: TBD (Bithomp recommended) — start with connected-wallet + on-ledger sell-offer reads.
- Burn destination: **token issuer** (canonical XRPL burn — tokens sent back to issuer cancel the issuer's liability). Blackhole `rrrrrrrrrrrrrrrrrrrrrhoLvTp` is NOT used for fungible tokens (no trustline).
- XRPL testnet mint: server-side faucet-funded wallet in backend.

## Task status
- [x] **1. Rebrand + tabbed nav shell** (Market / Create / Bridge / Wallets) — `App.tsx`, page wrappers, title.
- [x] **2. Network-aware XRPL layer** (mainnet + testnet) + trending aggregator client.
- [x] **3. Backend**: token Payment (pay/burn) builders, NFT mint, verify endpoints, token registry, mainnet/testnet clients.
- [x] **4. Midnight marketplace wiring** (deploy/join/list/buy) + NFT holdings reads.
- [x] **5. Aggregated Marketplace page**.
- [x] **6. Create / Mint page** (XRPL testnet + Midnight preview, collection/taxon).
- [x] **7. Token-to-NFT mint panel** (hold-gated, pay-to-treasury, burn).
- [x] **8. Extend Bridge** with fungible-token burn → mint.
- [x] **9. Config/.env.example/README + docs upkeep**.
- [x] **10. My NFTs tab — Incoming NFTs + Xaman QR Modal + Midnight NFT images**.
- [x] **11. XRPL native listing (XRP), private bidding, auction system, marketplace improvements**.
  - XRPL NFTs listed via `NFTokenCreateOffer` (sell-side) in XRP through Xaman — no longer wired to Midnight contract.
  - Private sell offer: optional `Destination` field locks offer to one recipient.
  - Private buy offer (bid): buyer-side `NFTokenCreateOffer` with `Destination = seller`.
  - **Auction system**: seller puts NFT up for timed auction (reserve, duration, public/private). Bidders sign `NFTokenCreateOffer` via Xaman. Public and private bids. Live countdown timer. Seller can cancel.
  - **Newly Listed on laylaa**: homepage section tracks every confirmed sell-offer created on this platform, auto-refreshes every 30 s.
  - **Your Listed NFTs**: replaced mainnet-only NFT grid with network-aware section showing only NFTs with active sell offers (devnet/testnet/mainnet switcher).
  - Midnight listings price display fixed (divides raw price by 1 000 000 → NIGHT).
  - Midnight off-chain bid registry for private bids on Midnight listings.
- [x] **12. Batch Mint + Platform Collections** — XRPL Ticket-based batch minting (up to 50 NFTs per call), platform collection registry, `BatchMintPanel` in Create page.
- [x] **13. Persist registries to disk** — all five registries write to `packages/xaman-backend/data/*.json` on every mutation; loaded on boot via `loadJson`. `data/` dir auto-created; survives backend restart.
- [x] **14. UI rebrand to laylaa** — warm cream × deep brown × gold palette (DM Serif Display + DM Sans fonts), light/dark toggle persisted to `localStorage`, laylaa logo in header, CSS variable–based theme.
- [ ] **15. Launch hardening** — move to mainnet/testnet networks, real CURATED_ISSUERS, Railway deploy, custom domain, rate limiting.
- [ ] **16. Auction UX polish** — "Accept winning bid" button in `AuctionCard`; seller sees winning bid highlighted.
- [ ] **17. Midnight auction / bid on-chain circuit** (optional: add `placeBid` to `marketplace.compact`).

## Change log
- **2026-06-06** — Task 1 done. Added tab navigation in `App.tsx` (Market/Create/Bridge/Wallets), rebranded to "Layla NFT Shop", added header connection chips, created `components/pages/{MarketplacePage,CreatePage,BridgePage,WalletsPage}.tsx` (Market/Create are placeholders to be filled in tasks 5–7). Updated `index.html` title. Created this living plan + `docs/HANDOVER.md`.
- **2026-06-06** — Task 2 done. Rewrote `src/lib/xrpl.ts` into network-aware layer (`mainnet`/`testnet`, endpoint failover, `decodeCurrency`, `getTokenLines`, `getTokenBalance`, `getNFTSellOffers`). Created `src/lib/tokens.ts` (GamerXGold + XRdoge registry with hold thresholds). Created `src/lib/aggregator.ts` (Bithomp trending client with graceful fallback to sample listings). Created `src/lib/types.ts` (`UnifiedNFT`). Updated `MarketplacePage` to show connected-wallet mainnet NFTs + sell-offer counts + trending feed. Updated `BurnToMintPanel` to explicitly pass `'testnet'` to `getNFTs`.
- **2026-06-06** — Task 3 done. Extended `packages/xaman-backend/src/index.ts` with: token registry (`/api/tokens`), token hold verification (`/api/xrpl/verify-hold`), token payment builder (`/api/xaman/pay-token`), token burn builder (`/api/xaman/burn-token`), tx lookup (`/api/xrpl/tx/:txid`), payment verification (`/api/xrpl/verify-payment`), burn verification (`/api/xrpl/verify-burn`), server-side testnet NFT mint (`/api/xrpl/testnet/mint`). Added `TESTNET_MINT_SEED` and `TREASURY_ADDRESS` to `.env.example`. Extended frontend `src/lib/xaman.ts` with corresponding client helpers (`createTokenPayment`, `createTokenBurn`, `verifyHold`, `verifyPayment`, `verifyBurn`, `testnetMint`).
- **2026-06-06** — Task 4 done. Added marketplace contract support to `src/lib/midnight.ts` (`deployMarketplace`, `joinMarketplace`, `initializeMarketplace`, `createListing`, `buyListing`, `getMarketplaceListings`). Added `@nftmarket/marketplace-contract` to web dependencies, updated `copy-zk.mjs`, added marketplace state to `AppContext`, added marketplace row to `ContractsPanel`.
- **2026-06-06** — Task 5 done. Added Midnight preview listings section to `MarketplacePage` using `getMarketplaceListings` from deployed marketplace contract. Shows active/sold/cancelled listings with price and token info.
- **2026-06-06** — Task 6 done. Rewrote `CreatePage` with full minting UI: XRPL Testnet mint (via backend `testnetMint`), Midnight preview mint (via Lace `mintNFT`), both with URI/taxon inputs. Added `hexToBytes32` and `randomHex32` helpers to `midnight.ts`.
- **2026-06-06** — Task 7 done. Implemented three token-to-NFT modes in `CreatePage`: hold-gated (`verifyHold` → mint), pay-to-treasury (`createTokenPayment` → `verifyPayment` → mint), burn (`createTokenBurn` → `verifyBurn` → mint). Token selector dropdown with GamerXGold/XRdoge. All modes mint on XRPL Testnet after token condition satisfied.
- **2026-06-06** — Task 8 done. Created `TokenBurnToMintPanel` component and added to `BridgePage`. Flow: Xaman token burn → mainnet verification → XRPL Testnet NFT mint. Supports token selection, URI, and taxon inputs.
- **2026-06-06** — Task 9 done. Created `packages/web/.env.example` with `VITE_BITHOMP_API_KEY` and `VITE_TREASURY_ADDRESS`. Updated `README.md` with Layla NFT Shop branding, project structure, and dApp quick-start instructions. Updated `HANDOVER.md` with final state.
- **2026-06-08** — Session 14: **Persist registries**. Added `loadJson`/`saveJson` helpers to `packages/xaman-backend/src/index.ts`. All five registries (`pendingOffers`, `recentListings`, `auctions`, `midnightBids`, `collections`) now load from `data/*.json` on boot and write after every mutation. `data/` dir is created with `mkdirSync` if missing. `path.join` added for cross-platform path handling. `existsSync`/`mkdirSync` imported from `fs`.
- **2026-06-08** — Session 13: **Batch Mint + Collections**. Backend `POST /api/xrpl/testnet/batch-mint` — creates XRPL tickets (`TicketCreate`), mints each NFT with its own `TicketSequence` (Sequence=0), creates free transfer offers to destination, pushes to `pendingOffers`. Collection registry added: `GET/POST /api/xrpl/collections/platform`, `GET /api/xrpl/collections/platform/:id`. Frontend: `batchMint()`, `getPlatformCollections()`, `getPlatformCollection()` in `xaman.ts`. `BatchMintPanel` added as new mode in `CreatePage` — collection name/desc/taxon at top, per-item image upload + name rows (Add/Remove), scrolling log, per-item success/fail results with NFTokenID.
- **2026-06-08** — Session 12 fixes. (1) `BurnToMintPanel` (`BurnToMintPanel.tsx`): was hardcoded to `'testnet'` — now has devnet/testnet/mainnet network switcher matching the My NFTs tab; auto-clears selection on network switch. (2) Burn-token flow fixed: `burn-token` endpoint now sends tokens to `token.issuer` (not BLACKHOLE) — issuers always accept their own currency, no trustline required; `verify-burn` updated to accept `destination === token.issuer` OR legacy blackhole. (3) Removed **XRdoge** from both backend (`TOKENS[]` in `index.ts`) and frontend (`src/lib/tokens.ts`) — only GamerXGold active for testing.
- **2026-06-08** — Task 11 done. **XRPL native listing + auctions + marketplace improvements.**
  - Backend: added `POST /api/xaman/create-sell-offer`, `POST /api/xaman/create-buy-offer` (both support private `Destination`). Added `recentListings` registry: `GET /api/xrpl/recent-listings`, `POST /api/xrpl/confirm-listing`. Added full **auction registry** with `POST /api/auctions` (create), `GET /api/auctions` (list active, auto-expiry), `GET /api/auctions/:id` (seller sees private bids), `POST /api/auctions/:id/bids` (Xaman buy-offer payload), `POST /api/auctions/:id/bids/:bidId/confirm`, `POST /api/auctions/:id/cancel`. Added Midnight off-chain bid registry (`POST/GET/DELETE /api/midnight/bids`).
  - Frontend (`xaman.ts`): `createXrplSellOffer`, `createXrplBuyOffer`, `getRecentXrplListings`, `createAuction`, `getAuctions`, `getAuction`, `placeAuctionBid` (Xaman-signed, auto-confirms), `cancelAuction`, `placeMidnightBid`, `getMidnightBids`, `deleteMidnightBid`.
  - `MyNFTsPage` `XrplNftCard`: "List for XRP" + optional private dest, "Place bid" + private checkbox, **"Put up for auction"** — reserve price, duration (hrs), public/private toggle.
  - `MarketplacePage`: **Live Auctions** section at top (amber theme, `AuctionCard` with live countdown, bid list, public/private bid form, seller cancel). **Newly Listed on Layla** section (accent/Zap, shows confirmed platform listings, 30-s auto-refresh). **Your Listed NFTs** replaces mainnet NFT grid — network switcher, shows wallet NFTs with active sell offers + lowest ask price.
- **2026-06-08** — Session 15: **UI rebrand to laylaa**. Replaced dark purple/cyan theme with warm cream × deep brown × gold palette matching the laylaa brand infographic. Switched fonts to DM Serif Display (headings) + DM Sans (body) via Google Fonts. All Tailwind colors now resolve through CSS custom properties (`:root` light + `.dark` override) so the light/dark toggle works instantly without any component changes. Added sun/moon toggle button to header persisted to `localStorage` (`laylaa-theme`). Pre-paint inline script in `index.html` applies saved theme before React mounts (no flash). Logo (`laylllagold.png`) copied to `public/laylaa-logo.png` and shown in header. All "Layla NFT Shop" brand text updated to "laylaa" throughout `App.tsx`, `MarketplacePage.tsx`, footer, and page title. `PLAN.md` + `packages/web/README.md` updated.
- **2026-06-08** — Task 10 done. Fixed XRPL NFT offer flow (3 bugs): (1) `offer_id` extraction from `AffectedNodes.CreatedNode.LedgerIndex`; (2) Xaman `[no name found]` fixed via `custom_meta.instruction`; (3) added **Xaman QR Modal** (`components/XamanModal.tsx`) — `openAndAwait()` now fires `xaman:open` CustomEvent, modal shows Xaman-hosted QR PNG + deeplink button, auto-closes on resolve. Added **Incoming NFTs** section to My NFTs tab: backend `pendingOffers[]` registry tracks devnet mint offers by destination address; `GET /api/xrpl/incoming-offers/:address` serves them; `IncomingOfferCard` shows IPFS image/name + Accept button. Fixed **Midnight NFT images**: `MidnightNftCard` now receives `metadataCid` (fetched via `getTokenMetadataMap()` in parallel with `getOwnedTokens()`), fetches IPFS metadata JSON, and displays image + name.
