# laylaa — The XRPL Midnight NFT Marketplace

A Vite + React + TypeScript + Tailwind dApp bridging **XRPL** and **Midnight** for cross-chain NFT creation, listing, bidding, and burn-to-mint.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite · React · TypeScript · Tailwind CSS |
| Midnight wallet | Lace extension — DApp Connector API v4 (`window.midnight.mnLace`) |
| XRPL wallet | Xaman — sign payloads built by `@nftmarket/xaman-backend` |
| Contracts | `@nftmarket/nft-contract` · `@nftmarket/bridge-contract` · `@nftmarket/marketplace-contract` |
| Backend | Express (`@nftmarket/xaman-backend`) — holds API secret, rate-limited |

## Features

- **Market** — Live Auctions (timed XRPL NFT auctions, public + private bids, countdown), Newly Listed on laylaa (30 s auto-refresh), Curated collections, Trending feed, Your Listed NFTs (network switcher), Midnight Marketplace listings with NIGHT prices + off-chain private bids.
- **Create** — XRPL Testnet mint, Midnight Preview mint, Token-gated mint (hold / pay / burn modes), Batch Mint (up to 50 NFTs via XRPL Tickets + platform collection registry).
- **My NFTs** — Midnight NFT images (IPFS metadata), Incoming NFTs (pending transfer offers), XRPL NFTs with List / Bid / Auction actions per card.
- **Burn** — XRPL NFT burn-to-mint (devnet / testnet / mainnet), Fungible-token burn-to-mint (GamerXGold).
- **Wallets** — Lace connect, Xaman connect, contract deploy / join panel.

## Theme

laylaa uses a warm **cream × deep brown × gold** palette with DM Serif Display headings and DM Sans body text. A ☀️/🌙 toggle in the header switches between light and dark modes; the preference is persisted to `localStorage`.

## Prerequisites

1. Build contract packages (needed for ZK asset copy + TypeScript imports):
   ```bash
   # run from repo root in WSL bash
   npm run compact -w @nftmarket/nft-contract && npm run build -w @nftmarket/nft-contract
   npm run compact -w @nftmarket/bridge-contract && npm run build -w @nftmarket/bridge-contract
   npm run compact -w @nftmarket/marketplace-contract && npm run build -w @nftmarket/marketplace-contract
   ```
2. Install workspace deps:
   ```bash
   npm install
   ```
3. Copy and fill in env files:
   ```bash
   cp packages/xaman-backend/.env.example packages/xaman-backend/.env
   cp packages/web/.env.example packages/web/.env          # optional overrides
   ```
4. Install the **Lace (Midnight)** browser extension, create a Preview wallet, fund via https://faucet.preview.midnight.network.
5. Create a **Xaman developer app** at https://apps.xaman.dev — copy API key + secret into `packages/xaman-backend/.env`.

## Run

```bash
# Terminal 1 — backend (http://localhost:4000)
npm run dev -w @nftmarket/xaman-backend

# Terminal 2 — web dApp (http://localhost:5173)
npm run dev -w @nftmarket/web
```

Vite proxies all `/api` requests to the backend on port 4000.

For Midnight contract operations (deploy / mint) you also need a **proof server**:
```bash
docker compose -f packages/nftmarket-cli/proof-server.yml up
```

## ZK assets

`scripts/copy-zk.mjs` runs automatically on `predev` / `prebuild` and copies `keys/` + `zkir/` from all compiled contracts into `public/midnight/`. If you recompile a contract, the next `npm run dev` picks it up automatically.

## Environment variables

### `packages/xaman-backend/.env`
| Variable | Purpose |
|---|---|
| `XUMM_API_KEY` / `XUMM_API_SECRET` | Xaman developer app credentials |
| `TESTNET_MINT_SEED` | Faucet-funded XRPL testnet wallet for server-side mints |
| `TREASURY_ADDRESS` | Destination for pay-to-mint token payments |
| `PINATA_JWT` | IPFS pinning via Pinata |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: localhost:5173) |

### `packages/web/.env` (optional)
| Variable | Purpose |
|---|---|
| `VITE_BITHOMP_API_KEY` | Live trending NFT feed |
| `VITE_PROOF_SERVER` | Proof server URL (default: `http://127.0.0.1:6300`) |
| `VITE_MIDNIGHT_NETWORK` | Midnight network hint for Lace (default: `preview`) |
| `VITE_NFT_ADDRESS` / `VITE_BRIDGE_ADDRESS` / `VITE_MARKETPLACE_ADDRESS` | Override default deployed contract addresses |

## Persisted registries

The backend writes five registries to `packages/xaman-backend/data/*.json` on every mutation and loads them on boot. The `data/` directory is created automatically.

| Registry | File |
|---|---|
| Pending XRPL sell offers (incoming NFTs) | `data/pendingOffers.json` |
| Recent platform listings | `data/recentListings.json` |
| Auctions + bids | `data/auctions.json` |
| Midnight off-chain bids | `data/midnightBids.json` |
| Platform collections | `data/collections.json` |
