// NFT contract witnesses
// SPDX-License-Identifier: Apache-2.0
//
// The NFT contract keeps all state in the public ledger, so it has no private
// witnesses. midnight-js still requires a private-state type and a witnesses
// object, so we provide empty ones (mirroring the counter example).

export type NFTPrivateState = Record<string, never>;

export const witnesses = {};
