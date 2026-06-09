// Header Component
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../stores/walletStore';
import { ConnectWalletModal } from './ConnectWalletModal';

export const Header: React.FC = () => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const { xrplConnected, midnightConnected, xrplAddress, midnightAddress } = useWalletStore();

  const truncateAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-white border-b border-midnight-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">XM</span>
              </div>
              <span className="text-xl font-bold text-midnight-900">
                NFT Marketplace
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/marketplace" className="text-midnight-600 hover:text-midnight-900 font-medium">
              Marketplace
            </Link>
            <Link to="/collections" className="text-midnight-600 hover:text-midnight-900 font-medium">
              Collections
            </Link>
            <Link to="/bridge" className="text-midnight-600 hover:text-midnight-900 font-medium">
              Bridge
            </Link>
            <Link to="/mint" className="text-midnight-600 hover:text-midnight-900 font-medium">
              Mint
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {(xrplConnected || midnightConnected) ? (
              <div className="flex items-center space-x-2">
                {xrplConnected && (
                  <span className="badge-xrpl">
                    XRPL: {truncateAddress(xrplAddress)}
                  </span>
                )}
                {midnightConnected && (
                  <span className="badge-midnight">
                    Midnight: {truncateAddress(midnightAddress)}
                  </span>
                )}
                <Link
                  to="/profile"
                  className="p-2 text-midnight-400 hover:text-midnight-600 rounded-full hover:bg-midnight-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              </div>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="btn-primary"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {showConnectModal && (
        <ConnectWalletModal onClose={() => setShowConnectModal(false)} />
      )}
    </header>
  );
};
