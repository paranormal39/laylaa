# Layla — Launch Plan

Current state and the prioritized plan of fixes to get **Layla** to a public mainnet launch, deployed on **Railway**.

_Last updated: 2026-06-09 (deployment audit)._

---

## 1. Current state

### Works
- **Web dApp** (`packages/web`, Vite + React + Tailwind): Market / Create / Bridge / Wallets tabs render and run in dev.
- **Lace integration** migrated to **DApp Connector API v4** (`packages/web/src/lib/midnight.ts`): `connect()` handshake, `getConfiguration()`, `getShieldedAddresses()`, in-memory private state, serialized-hex `balanceTx`/`submitTx`. Typechecks clean; **not yet verified end-to-end against a live wallet + proof server**.
- **Backend** (`packages/xaman-backend`, Express + xumm-sdk): Xaman sign payloads, token verify/price, IPFS upload (Pinata), and XRPL collection feeds (`/api/xrpl/collections`, `/api/xrpl/curated`).
- **Curated List** section is wired (backend `CURATED_COLLECTIONS` + `getCuratedCollections()`), rendered as the first Market section.
- **CLI** (`packages/nftmarket-cli`) deploys NFT/Bridge/Marketplace/Collection contracts against a local proof server.

### Already in place (verified 2026-06-09)
- **Bridge redeployed** (`a8a1bf5445d6e3d8e8360d70cad117a294eec23a840ffdf6bb12f3d114201914`) — `DEFAULT_CONTRACTS.bridge` updated in `midnight.ts`. ✓
- **Same-origin hosting** — the backend serves the built SPA from `public/` with an `*` SPA fallback (`packages/xaman-backend/src/index.ts`), so the web's relative `/api` calls work in production. ✓
- **Railway config** — `Dockerfile` (multi-stage: build web → copy `dist` into backend `public/` → run via `tsx`) + `railway.toml` (single `layla-backend` service, health check `/api/tokens`). ✓
- **CORS** — `CORS_ORIGINS` env wired (`cors({ origin })`). ✓
- **Web typechecks clean** (only a `baseUrl` deprecation warning).

### Not working / at risk
- **Docker image is XRPL-only / Midnight-broken** — the Dockerfile copies *only* `packages/web` and runs `copy-zk` with `|| true`. The web depends on the workspace contract packages (`@nftmarket/{nft,bridge,marketplace}-contract`) and needs the `/midnight` ZK params, neither of which are in the image. The web stage likely fails to resolve those imports (or ships without proving assets). See P0 #1.
- **Build-time `VITE_*` env not passed** to the Docker web build — contract addresses fall back to baked defaults; Bithomp/treasury/proof-server overrides are absent. See P0 #2.
- **Curated / Collections feeds return empty** against the current mainnet endpoint (see P1).
- **Brand inconsistency** — the app brands as **laylaa** (header/footer/logo/`PLAN.md`) but `README.md` / `HANDOVER.md` say **Layla**. Pick one before launch.

---

## 2. Launch blockers & fix plan

> **Scope decision first:** is **Midnight** in scope for the public launch, or is launch **XRPL-first**? If XRPL-first, the app is close to deployable today and P0 #1/#2 shrink to "keep Midnight defaults / hide Midnight UI". The blockers below assume Midnight is in scope.

### P0 — Must fix before launch

1. **Docker image missing Midnight contract packages + ZK assets**
   - The Dockerfile (`web-build` stage) copies only `packages/web` and runs `node scripts/copy-zk.mjs || true`. The web imports `@nftmarket/{nft,bridge,marketplace}-contract` (workspace deps) and needs the `/midnight` proving params.
   - Fix: copy the contract packages into the build stage (and `contracts/midnight/**` managed assets), run `copy-zk` for real, so `vite build` resolves contract imports and ships the ZK params. Verify with an actual `docker build`.

2. **Build-time `VITE_*` env for the Docker web build**
   - Vite bakes env at build time; the Dockerfile passes none. Add `ARG`/`ENV` (or a build-time `.env`) for `VITE_NFT_ADDRESS` / `VITE_BRIDGE_ADDRESS` / `VITE_MARKETPLACE_ADDRESS` / `VITE_COLLECTION_ADDRESS`, `VITE_TREASURY_ADDRESS`, `VITE_BITHOMP_API_KEY`, `VITE_PROOF_SERVER`, `VITE_MIDNIGHT_NETWORK`.

3. **Secrets on Railway**
   - Set runtime secrets: `XUMM_API_KEY`, `XUMM_API_SECRET`, `TESTNET_MINT_SEED`, `TREASURY_ADDRESS`, `PINATA_JWT`, `CORS_ORIGINS` (production domain), optional `COLLECTION_ISSUERS`. None committed.

4. **Proof server reachable from the browser** (Midnight in scope)
   - The browser needs an HTTPS proof server at `VITE_PROOF_SERVER`. Decide host (self-hosted `midnightntwrk/proof-server` service vs. a public one) before baking the URL.

### P1 — Should fix before launch

5. **Collection feeds return empty**
   - `/api/xrpl/collections` and `/api/xrpl/curated` use Clio's `nfts_by_issuer`. The current mainnet endpoint returned no NFTs.
   - Actions: confirm a **Clio-capable** mainnet endpoint (e.g. `wss://xrplcluster.com`), and confirm the curated addresses are the NFToken **`Issuer`** (not just project wallets). Add a fallback/empty-state if a collection can't resolve.

6. **Lace v4 end-to-end verification**
   - Verify connect → `getConfiguration` → mint/deploy against a live Lace wallet + reachable proof server. Validate Bech32m→hex owner encoding and `Transaction.deserialize` markers.

7. **Midnight network decision**
   - Decide Preview vs mainnet for Midnight at launch (affects contract addresses, faucet, proof server).

8. **Brand consistency**
   - Align `README.md` / `HANDOVER.md` with the in-app brand (**laylaa**) or update the app — pick one spelling.

### P2 — Nice to have
- Error/empty states polish across Market sections.
- Rate-limiting / caching on backend XRPL calls.
- Custom domain.
- Health check is already `/api/tokens`; consider a dedicated `/healthz`.

---

## 3. Railway deployment plan

### What already exists
- **`Dockerfile`** — multi-stage: stage 1 builds the web (`vite build`), stage 2 installs the backend and copies `web/dist → packages/xaman-backend/public`; runs `npx tsx src/index.ts` on `:4000`.
- **`railway.toml`** — `dockerfilePath = Dockerfile`, single service `layla-backend`, health check `/api/tokens`, restart on failure.
- The backend serves the SPA same-origin, so **no separate web service is needed**.

### Gaps to close in the Dockerfile (P0 #1/#2)
The current `web-build` stage copies only `packages/web` and skips contract packages + real `copy-zk`, and passes no `VITE_*` build args. To ship Midnight:
1. Copy the contract packages and managed assets into the build stage: `COPY packages/web packages/web`, plus `contracts/midnight` (and the `@nftmarket/*-contract` packages) so `vite build` resolves imports and `copy-zk` finds the ZK params.
2. Add `ARG`/`ENV VITE_*` before `vite build` and pass them via Railway build variables.
3. (If self-hosting the prover) add a second Railway service from `midnightntwrk/proof-server` exposing `:6300`, and set `VITE_PROOF_SERVER` to its public HTTPS URL.

> Build-image note: the Compact toolchain is **not** needed at Docker build time if the prebuilt `contracts/midnight/**/src/managed/**` assets are committed; only `copy-zk` + a TS/Vite build run.

### Steps
1. Decide launch scope (Midnight in/out) and Midnight network (Preview vs mainnet).
2. Close P0 #1/#2 in the `Dockerfile`; verify with a local `docker build` + run.
3. Set Railway runtime secrets + build-time `VITE_*` variables.
4. (If Midnight) deploy/point a reachable proof server; bake `VITE_PROOF_SERVER`.
5. Deploy; smoke-test health (`/api/tokens`), wallet connect, an XRPL mint, a Midnight mint, and the Market feeds.

---

## 4. Pre-launch checklist
- [x] Bridge redeployed; `DEFAULT_CONTRACTS.bridge` updated.
- [x] Web served same-origin with backend (no relative-`/api` failures in prod).
- [x] Railway config present (`Dockerfile` + `railway.toml`, health check `/api/tokens`).
- [ ] Launch scope + Midnight network decided.
- [ ] Dockerfile ships contract packages + ZK params (Midnight builds/works in the image).
- [ ] Build-time `VITE_*` variables set on Railway.
- [ ] Runtime secrets set on Railway; none committed.
- [ ] `CORS_ORIGINS` set to the production domain.
- [ ] Collection/curated feeds return live data (Clio endpoint confirmed).
- [ ] Lace connect + XRPL/Midnight mint verified against the production proof server.
- [ ] Brand spelling unified (laylaa vs Layla).
