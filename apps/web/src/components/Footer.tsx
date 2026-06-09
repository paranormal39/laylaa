// Footer Component
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-midnight-900 text-midnight-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">XM</span>
              </div>
              <span className="text-xl font-bold text-white">
                NFT Marketplace
              </span>
            </div>
            <p className="text-sm text-midnight-400">
              A unified NFT marketplace supporting XRPL and Midnight networks with Burn-To-Mint bridge functionality.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/marketplace" className="hover:text-white transition-colors">Browse NFTs</Link></li>
              <li><Link to="/collections" className="hover:text-white transition-colors">Collections</Link></li>
              <li><Link to="/mint" className="hover:text-white transition-colors">Mint NFT</Link></li>
              <li><Link to="/bridge" className="hover:text-white transition-colors">Bridge</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="https://docs.midnight.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Midnight Docs</a></li>
              <li><a href="https://xrpl.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">XRPL Docs</a></li>
              <li><a href="https://docs.xaman.dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Xaman SDK</a></li>
              <li><a href="https://github.com/EvernodeXRPL/evernode-sdk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Evernode SDK</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Networks</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>XRPL Testnet</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Midnight Preview</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-midnight-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-midnight-400">
            © 2024 XRPL + Midnight NFT Marketplace. Licensed under Apache-2.0.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-midnight-400 hover:text-white transition-colors">
              GitHub
            </a>
            <a href="#" className="text-midnight-400 hover:text-white transition-colors">
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
