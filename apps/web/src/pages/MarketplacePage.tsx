// Marketplace Page
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Mock NFT data
const mockNFTs = [
  { id: '1', name: 'Cosmic Explorer #001', price: '100', currency: 'XRP', image: 'https://via.placeholder.com/300', collection: 'Cosmic Explorers', chain: 'xrpl' },
  { id: '2', name: 'Digital Dream #042', price: '500', currency: 'NIGHT', image: 'https://via.placeholder.com/300', collection: 'Digital Dreams', chain: 'midnight' },
  { id: '3', name: 'Neon Nights #007', price: '250', currency: 'XRP', image: 'https://via.placeholder.com/300', collection: 'Neon Nights', chain: 'xrpl' },
  { id: '4', name: 'Abstract Mind #103', price: '1000', currency: 'NIGHT', image: 'https://via.placeholder.com/300', collection: 'Abstract Minds', chain: 'midnight' },
];

export const MarketplacePage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'xrpl' | 'midnight'>('all');

  const filteredNFTs = filter === 'all' 
    ? mockNFTs 
    : mockNFTs.filter(nft => nft.chain === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-midnight-900 mb-2">NFT Marketplace</h1>
          <p className="text-midnight-600">Browse and collect NFTs from XRPL and Midnight</p>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-midnight-100 text-midnight-700'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('xrpl')}
            className={`px-4 py-2 rounded-lg font-medium ${filter === 'xrpl' ? 'bg-xrpl-500 text-white' : 'bg-midnight-100 text-midnight-700'}`}
          >
            XRPL
          </button>
          <button
            onClick={() => setFilter('midnight')}
            className={`px-4 py-2 rounded-lg font-medium ${filter === 'midnight' ? 'bg-primary-600 text-white' : 'bg-midnight-100 text-midnight-700'}`}
          >
            Midnight
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredNFTs.map((nft) => (
          <Link key={nft.id} to={`/nft/${nft.id}`} className="group">
            <div className="card overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-midnight-100">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className={`absolute top-2 right-2 badge ${nft.chain === 'xrpl' ? 'badge-xrpl' : 'badge-midnight'}`}>
                  {nft.chain === 'xrpl' ? 'XRPL' : 'Midnight'}
                </span>
              </div>
              <h3 className="font-semibold text-midnight-900 mb-1">{nft.name}</h3>
              <p className="text-sm text-midnight-500 mb-2">{nft.collection}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-midnight-900">{nft.price} {nft.currency}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
