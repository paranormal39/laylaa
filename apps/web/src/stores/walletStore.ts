// Wallet Store
// SPDX-License-Identifier: Apache-2.0

import { create } from 'zustand';
import type { Network, SourceChain } from '@nftmarket/shared';

export interface WalletState {
  // Connection states
  xrplConnected: boolean;
  midnightConnected: boolean;
  
  // Wallet info
  xrplAddress: string | null;
  midnightAddress: string | null;
  
  // Balances
  xrplBalance: string;
  midnightBalance: string;
  dustBalance: string;
  
  // Network info
  currentNetwork: Network;
  
  // Actions
  connectXRPL: (address: string, balance: string) => void;
  connectMidnight: (address: string, balance: string, dust: string) => void;
  disconnectXRPL: () => void;
  disconnectMidnight: () => void;
  updateBalances: (xrpl?: string, midnight?: string, dust?: string) => void;
  setNetwork: (network: Network) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  xrplConnected: false,
  midnightConnected: false,
  xrplAddress: null,
  midnightAddress: null,
  xrplBalance: '0',
  midnightBalance: '0',
  dustBalance: '0',
  currentNetwork: 'xrpl-testnet' as Network,
  
  connectXRPL: (address, balance) => set({
    xrplConnected: true,
    xrplAddress: address,
    xrplBalance: balance,
  }),
  
  connectMidnight: (address, balance, dust) => set({
    midnightConnected: true,
    midnightAddress: address,
    midnightBalance: balance,
    dustBalance: dust,
  }),
  
  disconnectXRPL: () => set({
    xrplConnected: false,
    xrplAddress: null,
    xrplBalance: '0',
  }),
  
  disconnectMidnight: () => set({
    midnightConnected: false,
    midnightAddress: null,
    midnightBalance: '0',
    dustBalance: '0',
  }),
  
  updateBalances: (xrpl, midnight, dust) => set((state) => ({
    xrplBalance: xrpl ?? state.xrplBalance,
    midnightBalance: midnight ?? state.midnightBalance,
    dustBalance: dust ?? state.dustBalance,
  })),
  
  setNetwork: (network) => set({ currentNetwork: network }),
}));
