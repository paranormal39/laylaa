# XRPL + Midnight NFT Marketplace

A production-quality NFT marketplace supporting both XRPL and Midnight networks with Burn-To-Mint bridge functionality.

## Project Overview

This marketplace enables:
- Dual-chain NFT support (XRPL and Midnight)
- Cross-chain NFT migration via Burn-To-Mint bridge
- Decentralized trading with marketplace contracts
- IPFS-based metadata storage
- Evernode-powered backend services

## Architecture

```
xrpl-midnight-marketplace/
├── apps/
│   ├── web/                    # React + Vite frontend DApp
│   └── admin/                  # Admin interface
├── contracts/
│   └── midnight/
│       ├── nft/                # NFT contract (ERC-721 style)
│       ├── collection/         # Collection management
│       ├── marketplace/        # Trading and listings
│       └── bridge/             # XRPL Burn-To-Mint bridge
├── services/
│   ├── evernode-gateway/       # API gateway
│   ├── xrpl-service/           # XRPL verification
│   ├── midnight-service/       # Midnight integration
│   ├── bridge-service/         # Bridge processing
│   ├── metadata-service/       # IPFS operations
│   └── indexing-service/       # NFT indexing
└── packages/
    ├── shared/                 # Types and utilities
    ├── xrpl-client/            # XRPL SDK wrapper
    ├── xmidnight-client/       # Midnight SDK wrapper
    └── nftmarket-cli/          # Development CLI
```

## Smart Contracts

### 1. NFT Contract (`contracts/midnight/nft`)

Features:
- Mint NFTs with metadata CID
- Transfer ownership
- Approval mechanisms (single token and operator)
- Burn functionality
- Migration support for Burn-To-Mint
- Replay protection via processed burn hash tracking

Key circuits:
- `mint()` - Create new NFTs
- `mintFromBridge()` - Mint from verified XRPL burn
- `transferFrom()` - Transfer ownership
- `approve()` - Approve operator for single token
- `setApprovalForAll()` - Approve operator for all tokens
- `burn()` - Destroy NFT

### 2. Collection Contract (`contracts/midnight/collection`)

Features:
- Collection creation and management
- Creator pages
- Verification system (admin)
- Migration approval for XRPL collections
- Royalty configuration
- Supply management

Key circuits:
- `createCollection()` - Create new collection
- `verifyCollection()` - Admin verification
- `approveForMigration()` - Approve for Burn-To-Mint
- `incrementSupply()` - Track minting
- `setPaused()` - Emergency pause

### 3. Marketplace Contract (`contracts/midnight/marketplace`)

Features:
- Listing creation and management
- Price editing
- Purchase functionality
- Platform fees (2.5% default)
- Royalty distribution
- Sale history tracking
- Emergency pause controls

Key circuits:
- `createListing()` - List NFT for sale
- `editListing()` - Update price
- `cancelListing()` - Remove listing
- `buyListing()` - Purchase NFT
- `setPaused()` - Emergency controls

### 4. Bridge Contract (`contracts/midnight/bridge`)

Features:
- Burn receipt submission and verification
- Replay protection
- Approved issuer/taxon management
- Verifier authorization (Evernode services)
- Migration status tracking

Key circuits:
- `submitBurnReceipt()` - Submit XRPL burn proof
- `mintMigratedNFT()` - Mint on Midnight
- `isBurnProcessed()` - Check replay status
- `addApprovedIssuer()` - Whitelist XRPL issuers
- `setPaused()` - Bridge pause controls

## Development CLI

The CLI (`packages/nftmarket-cli`) provides comprehensive testing capabilities:

### Commands

```bash
# Interactive mode
npm run preview-ps    # Start with proof server on Preview network
npm run preprod-ps    # Start with proof server on Preprod network

# Direct commands
nftmarket wallet create-midnight
nftmarket wallet connect-xrpl
nftmarket nft mint
nftmarket collection create
nftmarket marketplace create-listing
nftmarket bridge burn-xrpl
nftmarket test
```

### CLI Structure

- **Wallet Management**: Create/restore wallets, check balances, faucet requests
- **NFT Operations**: Mint, batch mint, transfer, burn, approvals
- **Collection Management**: Create, verify, approve for migration
- **Marketplace**: Listings, purchases, browsing, activity
- **Bridge**: Burn XRPL, submit receipts, mint on Midnight
- **Testing**: Automated test suite for all contracts

## Target Networks

### Development

| Network | Type | Faucet |
|---------|------|--------|
| XRPL Testnet | Testnet | https://faucet.altnet.rippletest.net |
| Midnight Preview | Testnet | https://faucet.preview.midnight.network |
| Midnight Preprod | Testnet | https://faucet.preprod.midnight.network |

## Security Features

1. **Replay Protection**: Burn hashes tracked to prevent double-minting
2. **Collection Validation**: Only approved XRPL collections can migrate
3. **Issuer Validation**: Whitelisted issuers for bridge operations
4. **Emergency Controls**: Pause marketplace and bridge functions
5. **Ownership Verification**: Strict ownership checks on all transfers
6. **Approval Expiration**: Time-limited operator approvals

## IPFS Storage

Metadata stored on IPFS:
- NFT metadata JSON
- Collection metadata
- Images and media assets
- Marketplace assets

Gateways supported:
- ipfs.io
- Pinata Cloud
- Cloudflare IPFS
- Filebase

## Evernode Services

Backend services deployed on Evernode:

1. **XRPL Verification Service**: Validates burn transactions
2. **Metadata Service**: IPFS upload and validation
3. **Marketplace Gateway**: API for marketplace data
4. **Indexing Service**: NFT and collection indexing
5. **Bridge Service**: Processes burn-to-mint workflow

## Getting Started

### Prerequisites

- Node.js v22.15+
- Docker (for proof server)
- Compact devtools

### Install Compact Devtools

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
source $HOME/.local/bin/env
compact update 0.30.0
```

### Install Dependencies

```bash
npm install
```

### Build Contracts

```bash
cd contracts/midnight/nft
npm run compact
npm run build

cd ../collection
npm run compact
npm run build

cd ../marketplace
npm run compact
npm run build

cd ../bridge
npm run compact
npm run build
```

### Run Development CLI

```bash
cd packages/nftmarket-cli
npm run preview-ps
```

## Testing

Run the full test suite:

```bash
cd packages/nftmarket-cli
nftmarket test
```

Test categories:
- NFT Tests: Mint, transfer, burn
- Collection Tests: Create, verify, mint
- Marketplace Tests: Listings, purchases
- XRPL Tests: NFT operations, burns
- Bridge Tests: Burn-to-mint flow, replay protection
- Security Tests: Authorization, pause controls

## Burn-To-Mint Flow

1. User burns NFT on XRPL
2. Evernode verifies burn transaction
3. Burn receipt generated and submitted to bridge
4. Bridge validates receipt (replay protection)
5. Bridge mints equivalent NFT on Midnight
6. Provenance metadata attached

## Frontend DApp

The web frontend (`apps/web`) provides:
- Xaman wallet integration (XRPL)
- Midnight wallet integration
- NFT browsing and discovery
- Collection pages
- Listing management
- Purchase flows
- Burn-to-Mint interface
- Activity feeds
- Profile management

## License

Apache-2.0 - See LICENSE file for details.

## Contributing

See CONTRIBUTING.md for guidelines.

## Resources

- [Midnight Documentation](https://docs.midnight.network/)
- [XRPL Documentation](https://xrpl.org/)
- [Xaman SDK](https://docs.xaman.dev/)
- [Evernode SDK](https://github.com/EvernodeXRPL/evernode-sdk)
