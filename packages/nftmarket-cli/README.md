# nftmarket-cli

Development & testing CLI for the XRPL + Midnight NFT Marketplace.

It exercises **real** integrations:
- **Midnight Preview**: create/restore a wallet, fund + register DUST, deploy the
  NFT contract, mint / transfer / burn, and read ledger state.
- **XRPL Testnet**: create/connect a wallet, list/mint/burn NFTs (the burn hash
  feeds the Burn-To-Mint bridge).
- **Demo flows**: collection / marketplace / bridge are simulated until those
  Compact contracts are compiled.

## Prerequisites

1. **Compact toolchain** (already used to compile the NFT contract):
   ```bash
   curl --proto '=https' --tlsv1.2 -LsSf \
     https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   source $HOME/.local/bin/env
   compact update 0.30.0
   ```
   > The NFT contract is pinned to toolchain **0.30.0** so it matches the
   > installed `@midnight-ntwrk/compact-runtime@0.15.0`.

2. **Proof server** running locally on `http://127.0.0.1:6300`. The simplest way
   is to reuse the counter example's compose file:
   ```bash
   docker compose -f counter-cli/proof-server.yml up
   ```

3. Dependencies installed and the NFT contract built (from repo root):
   ```bash
   npm install
   npm run compact -w @nftmarket/nft-contract   # compile Compact -> managed/nft
   npm run build  -w @nftmarket/nft-contract    # build the TS contract package
   ```

## Run

From the repo root:

```bash
npm run dev -w @nftmarket/cli         # Midnight Preview (default) + XRPL Testnet
# or
npm run preview  -w @nftmarket/cli
npm run preprod  -w @nftmarket/cli
npm run standalone -w @nftmarket/cli
```

## Suggested test walkthrough

1. **Midnight Wallet → Create a new wallet** — save the printed seed.
2. Fund the printed unshielded address at <https://faucet.preview.midnight.network>.
3. **Midnight Wallet → Sync & show balances** until tNIGHT > 0.
4. **Midnight Wallet → Register NIGHT for DUST generation** (needed to pay fees).
5. **Midnight NFT → Deploy a new NFT contract** — save the contract address.
6. **Midnight NFT → Mint an NFT to myself**, then **List my NFTs** / **Show total supply**.
7. **XRPL → Connect** (empty seed auto-funds a Testnet wallet), then **Mint** / **Burn**.

> Deploy/mint require the proof server running and a DUST-funded wallet.
