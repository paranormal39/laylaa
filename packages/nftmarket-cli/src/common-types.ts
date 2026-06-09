// Shared Midnight contract types for the NFT Marketplace CLI
// SPDX-License-Identifier: Apache-2.0

import { NFT } from '@nftmarket/nft-contract';
import type { NFTPrivateState } from '@nftmarket/nft-contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js/types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js/contracts';
import type { ProvableCircuitId } from '@midnight-ntwrk/compact-js';

export type NFTContract = NFT.Contract<NFTPrivateState>;
export type NFTCircuits = ProvableCircuitId<NFTContract>;
export const NFTPrivateStateId = 'nftPrivateState';
export type NFTProviders = MidnightProviders<NFTCircuits, typeof NFTPrivateStateId, NFTPrivateState>;
export type DeployedNFTContract = DeployedContract<NFTContract> | FoundContract<NFTContract>;
