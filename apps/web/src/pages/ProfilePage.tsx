// Profile Page
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useWalletStore } from '../stores/walletStore';

export const ProfilePage: React.FC = () => {
  const { xrplConnected, midnightConnected, xrplAddress, midnightAddress, xrplBalance, midnightBalance } = useWalletStore();

  const truncate = (addr: string | null) => addr ? `${addr.slice(0, 8)}...${addr.slice(-4)}` : '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-midnight-900 mb-2">Profile</h1>
        <p className="text-midnight-600">Manage your connected wallets and view your NFTs</p>
      </div>

      {/* Wallet Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* XRPL Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">XRPL Wallet</h3>
            <span className={`badge ${xrplConnected ? 'badge-xrpl' : 'bg-midnight-100 text-midnight-500'}`}>
              {xrplConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          {xrplConnected ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-midnight-600">Address</span>
                <span className="font-mono">{truncate(xrplAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Balance</span>
                <span>{xrplBalance} XRP</span>
              </div>
            </div>
          ) : (
            <p className="text-midnight-500">Connect your XRPL wallet to view details</p>
          )}
        </div>

        {/* Midnight Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Midnight Wallet</h3>
            <span className={`badge ${midnightConnected ? 'badge-midnight' : 'bg-midnight-100 text-midnight-500'}`}>
              {midnightConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          {midnightConnected ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-midnight-600">Address</span>
                <span className="font-mono">{truncate(midnightAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-midnight-600">Balance</span>
                <span>{midnightBalance} tNight</span>
              </div>
            </div>
          ) : (
            <p className="text-midnight-500">Connect your Midnight wallet to view details</p>
          )}
        </div>
      </div>

      {/* My NFTs */}
      <div>
        <h2 className="text-2xl font-bold mb-6">My NFTs</h2>
        {!xrplConnected && !midnightConnected ? (
          <div className="card text-center py-12">
            <p className="text-midnight-600 mb-4">Connect a wallet to view your NFTs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mock NFT - would be fetched from API */}
            <div className="card text-center py-8">
              <p className="text-midnight-400">No NFTs found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
