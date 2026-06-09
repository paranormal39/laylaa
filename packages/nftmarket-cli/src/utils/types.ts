// Local types for the NFT Marketplace CLI
// SPDX-License-Identifier: Apache-2.0
//
// The CLI is a self-contained development & testing tool. It defines its own
// minimal types so it can run via `tsx` without building the workspace
// `@nftmarket/shared` package.

export enum Network {
  XRPL_TESTNET = 'xrpl-testnet',
  XRPL_MAINNET = 'xrpl-mainnet',
  MIDNIGHT_PREVIEW = 'midnight-preview',
  MIDNIGHT_PREPROD = 'midnight-preprod',
  MIDNIGHT_STANDALONE = 'midnight-standalone',
}

/** Resolve a CLI network keyword (preview/preprod/standalone) to a Network. */
export function resolveNetwork(keyword?: string): Network {
  switch ((keyword ?? '').toLowerCase()) {
    case 'preprod':
      return Network.MIDNIGHT_PREPROD;
    case 'standalone':
      return Network.MIDNIGHT_STANDALONE;
    case 'preview':
    default:
      return Network.MIDNIGHT_PREVIEW;
  }
}

export interface XRPLNFT {
  NFTokenID: string;
  URI?: string;
  taxon: number;
  issuer: string;
  nft_serial: number;
}

export interface WalletBalance {
  tNight: string;
  dust: string;
}
