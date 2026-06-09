// Home Page
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-midnight-900 text-white py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              XRPL + Midnight
              <span className="block text-primary-200">NFT Marketplace</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8">
              The first cross-chain NFT marketplace with Burn-To-Mint bridge technology.
              Trade NFTs across XRPL and Midnight networks seamlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/marketplace" className="btn-primary text-lg py-3 px-8">
                Explore Marketplace
              </Link>
              <Link to="/bridge" className="btn-secondary bg-white/10 text-white border border-white/20 hover:bg-white/20 text-lg py-3 px-8">
                Bridge NFTs
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-midnight-900 mb-4">
              Built for Cross-Chain NFT Trading
            </h2>
            <p className="text-lg text-midnight-600 max-w-2xl mx-auto">
              Experience seamless NFT trading across XRPL and Midnight networks
              with our advanced bridge technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card text-center">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-midnight-900 mb-2">
                Burn-To-Mint Bridge
              </h3>
              <p className="text-midnight-600">
                Migrate your XRPL NFTs to Midnight with verified burn receipts and
                provenance tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card text-center">
              <div className="w-14 h-14 bg-xrpl-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-xrpl-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-midnight-900 mb-2">
                Dual-Chain Trading
              </h3>
              <p className="text-midnight-600">
                Browse and trade NFTs from both XRPL and Midnight networks in one
                unified marketplace.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card text-center">
              <div className="w-14 h-14 bg-midnight-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-midnight-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-midnight-900 mb-2">
                Verified Collections
              </h3>
              <p className="text-midnight-600">
                Only approved collections can migrate, ensuring authenticity and
                preventing fraudulent assets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-midnight-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">2</div>
              <div className="text-midnight-600">Blockchains</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-xrpl-600 mb-2">4</div>
              <div className="text-midnight-600">Smart Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">100%</div>
              <div className="text-midnight-600">Decentralized</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-xrpl-600 mb-2">IPFS</div>
              <div className="text-midnight-600">Storage</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-midnight-900 mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-lg text-midnight-600 mb-8">
            Connect your XRPL or Midnight wallet and start exploring the marketplace.
            Mint, trade, and bridge NFTs across both networks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/mint" className="btn-primary text-lg py-3 px-8">
              Mint Your First NFT
            </Link>
            <Link to="/collections" className="btn-secondary text-lg py-3 px-8">
              Browse Collections
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
