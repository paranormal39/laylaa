// Wallet Provider Component
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext, useCallback } from 'react';
import { XRPLClient } from '@nftmarket/xrpl-client';
import { useWalletStore } from '../stores/walletStore';

interface WalletContextType {
  xrplClient: XRPLClient | null;
  connectXRPL: (seed?: string) => Promise<void>;
  disconnectXRPL: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [xrplClient, setXrplClient] = React.useState<XRPLClient | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const { connectXRPL: storeConnect, disconnectXRPL: storeDisconnect } = useWalletStore();

  const connectXRPL = useCallback(async (seed?: string) => {
    setIsConnecting(true);
    try {
      const client = XRPLClient.forTestnet();
      await client.connect();
      
      if (seed) {
        const wallet = await client.setWallet(seed);
        storeConnect(wallet.address, wallet.balance);
      }
      
      setXrplClient(client);
    } catch (error) {
      console.error('Failed to connect XRPL wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [storeConnect]);

  const disconnectXRPL = useCallback(() => {
    xrplClient?.disconnect();
    setXrplClient(null);
    storeDisconnect();
  }, [xrplClient, storeDisconnect]);

  const value = {
    xrplClient,
    connectXRPL,
    disconnectXRPL,
    isConnecting,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
