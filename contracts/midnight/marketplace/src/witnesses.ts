// Marketplace contract witnesses
// SPDX-License-Identifier: Apache-2.0
//
// All marketplace state lives in the public ledger, so there are no private
// witnesses. midnight-js still requires a private-state type and a witnesses
// object, so we provide empty ones (mirroring the NFT contract).

export type MarketplacePrivateState = Record<string, never>;

export const witnesses = {};
