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
COPY packages/web ./packages/web

# Install only what the web package needs
RUN npm install --workspace=@nftmarket/web --include-workspace-root \
    --ignore-scripts 2>/dev/null || npm install --workspace=@nftmarket/web --include-workspace-root

# Build frontend (skip copy-zk — no contract packages in this image)
WORKDIR /app/packages/web
RUN node scripts/copy-zk.mjs 2>/dev/null || true
RUN npx vite build

# ---- Stage 2: backend runtime --------------------------------
FROM node:20-alpine AS backend
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/xaman-backend ./packages/xaman-backend

# Install backend dependencies
RUN npm install --workspace=@nftmarket/xaman-backend --include-workspace-root \
    --ignore-scripts 2>/dev/null || npm install --workspace=@nftmarket/xaman-backend --include-workspace-root

# Copy frontend build output into the backend package
COPY --from=web-build /app/packages/web/dist ./packages/xaman-backend/public

# Create data directory for persisted registries
RUN mkdir -p /app/packages/xaman-backend/data

WORKDIR /app/packages/xaman-backend

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
