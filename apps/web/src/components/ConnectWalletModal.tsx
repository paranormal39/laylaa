// Connect Wallet Modal
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { useWalletStore } from '../stores/walletStore';

interface ConnectWalletModalProps {
  onClose: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'xrpl' | 'midnight'>('xrpl');
  const [seed, setSeed] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { connectXRPL } = useWallet();
  const { xrplConnected, midnightConnected } = useWalletStore();

  const handleConnectXRPL = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectXRPL(seed || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectMidnight = async () => {
    // Midnight connection would be implemented here
    console.log('Midnight connection not yet implemented');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-midnight-900">Connect Wallet</h2>
            <button
              onClick={onClose}
              className="text-midnight-400 hover:text-midnight-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-midnight-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setActiveTab('xrpl')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'xrpl'
                  ? 'bg-white text-midnight-900 shadow-sm'
                  : 'text-midnight-600 hover:text-midnight-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="w-2 h-2 bg-xrpl-500 rounded-full"></span>
                <span>XRPL</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('midnight')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'midnight'
                  ? 'bg-white text-midnight-900 shadow-sm'
                  : 'text-midnight-600 hover:text-midnight-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                <span>Midnight</span>
              </div>
            </button>
          </div>

          {/* XRPL Tab */}
          {activeTab === 'xrpl' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-midnight-700 mb-2">
                  Wallet Seed (optional)
                </label>
                <input
                  type="password"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Enter your XRPL wallet seed"
                  className="input"
                />
                <p className="mt-1 text-xs text-midnight-500">
                  Leave empty to generate a new wallet
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConnectXRPL}
                disabled={isConnecting}
                className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : xrplConnected ? 'Connected' : 'Connect XRPL Wallet'}
              </button>

              <p className="text-xs text-midnight-500 text-center">
                Connect to XRPL Testnet for development
              </p>
            </div>
          )}

          {/* Midnight Tab */}
          {activeTab === 'midnight' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-midnight-700 mb-2">
                  Midnight Wallet Seed
                </label>
                <input
                  type="password"
                  placeholder="Enter your Midnight wallet seed"
                  className="input"
                />
              </div>

              <button
                onClick={handleConnectMidnight}
                className="w-full btn-primary py-3"
              >
                {midnightConnected ? 'Connected' : 'Connect Midnight Wallet'}
              </button>

              <p className="text-xs text-midnight-500 text-center">
                Connect to Midnight Preview Network
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
