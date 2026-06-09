# ============================================================
# Layla NFT Marketplace — single-image Docker build
# Builds the React frontend then serves it + the API from the
# Express backend.  The backend serves /api/* and falls through
# to the Vite dist/ static files for everything else.
# ============================================================

# ---- Stage 1: build frontend --------------------------------
FROM node:20-alpine AS web-build
WORKDIR /app

# Copy workspace root + relevant packages
COPY package.json package-lock.json* ./
# Root tsconfig the contract packages extend (tsconfig.base.json)
COPY tsconfig.base.json ./
COPY packages/web ./packages/web

# Copy contract packages that web depends on
COPY contracts/midnight/nft ./contracts/midnight/nft
COPY contracts/midnight/bridge ./contracts/midnight/bridge
COPY contracts/midnight/marketplace ./contracts/midnight/marketplace

# Install web + contract package dependencies. Do NOT use --ignore-scripts:
# esbuild's postinstall downloads its platform binary, which Vite (build) and
# tsx (runtime) both require.
RUN npm install --workspace=@nftmarket/web --workspace=@nftmarket/nft-contract \
    --workspace=@nftmarket/bridge-contract --workspace=@nftmarket/marketplace-contract \
    --include-workspace-root

# Build the contract packages (tsc only — the Compact-compiled managed/ dirs are
# committed, so no compiler is needed). This produces each package's dist/index.js
# that the web app imports.
RUN npm run build --workspace=@nftmarket/nft-contract \
 && npm run build --workspace=@nftmarket/bridge-contract \
 && npm run build --workspace=@nftmarket/marketplace-contract

# Build frontend (copy-zk pulls ZK assets from the contract managed/ dirs)
WORKDIR /app/packages/web
RUN node scripts/copy-zk.mjs 2>/dev/null || true
RUN npx vite build

# ---- Stage 2: backend runtime --------------------------------
FROM node:20-alpine AS backend
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/xaman-backend ./packages/xaman-backend

# Install backend dependencies. Do NOT use --ignore-scripts: tsx relies on
# esbuild's platform binary, installed by esbuild's postinstall script.
RUN npm install --workspace=@nftmarket/xaman-backend --include-workspace-root

# Copy frontend build output into the backend package
COPY --from=web-build /app/packages/web/dist ./packages/xaman-backend/public

# Create data directory for persisted registries
RUN mkdir -p /app/packages/xaman-backend/data

WORKDIR /app/packages/xaman-backend

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
