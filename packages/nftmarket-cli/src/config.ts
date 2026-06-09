// Network configuration for the NFT Marketplace CLI
// SPDX-License-Identifier: Apache-2.0

import path from 'node:path';
import { createRequire } from 'node:module';
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';

const require = createRequire(import.meta.url);

// Resolve the compiled NFT contract's ZK config directory (keys/zkir/compiler).
// We resolve the installed @nftmarket/nft-contract package and point at its
// dist/managed/nft folder produced by `compact compile`.
function resolveNftZkConfigPath(): string {
  // Resolves to <pkg>/dist/index.js; the compiled ZK assets live alongside it
  // at <pkg>/dist/managed/nft (keys/zkir/compiler).
  const entry = require.resolve('@nftmarket/nft-contract');
  const distDir = path.dirname(entry);
  return path.resolve(distDir, 'managed', 'nft');
}

export const contractConfig = {
  privateStateStoreName: 'nft-private-state',
  zkConfigPath: resolveNftZkConfigPath(),
};

// Lazily resolve the compiled ZK assets directory for any contract package.
// Used for bridge/marketplace/collection so the CLI still starts even if one
// of them has not been built yet (resolution only happens at deploy time).
export function resolveManagedPath(pkg: string, managedName: string): string {
  const entry = require.resolve(pkg);
  return path.resolve(path.dirname(entry), 'managed', managedName);
}

export interface Config {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
  readonly networkName: string;
}

export class PreviewConfig implements Config {
  indexer = 'https://indexer.preview.midnight.network/api/v4/graphql';
  indexerWS = 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
  node = 'https://rpc.preview.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  networkName = 'preview';
  constructor() {
    setNetworkId('preview');
  }
}

export class PreprodConfig implements Config {
  indexer = 'https://indexer.preprod.midnight.network/api/v4/graphql';
  indexerWS = 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws';
  node = 'https://rpc.preprod.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  networkName = 'preprod';
  constructor() {
    setNetworkId('preprod');
  }
}

export class StandaloneConfig implements Config {
  indexer = 'http://127.0.0.1:8088/api/v4/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v4/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  networkName = 'standalone';
  constructor() {
    setNetworkId('undeployed');
  }
}

export function configForNetwork(keyword?: string): Config {
  switch ((keyword ?? '').toLowerCase()) {
    case 'preprod':
      return new PreprodConfig();
    case 'standalone':
      return new StandaloneConfig();
    case 'preview':
    default:
      return new PreviewConfig();
  }
}
