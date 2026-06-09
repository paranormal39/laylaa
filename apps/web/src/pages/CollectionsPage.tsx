// Collections Page
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from 'react-router-dom';

const mockCollections = [
  { id: '1', name: 'Cosmic Explorers', image: 'https://via.placeholder.com/400', itemCount: 100, floorPrice: '50 XRP', verified: true },
  { id: '2', name: 'Digital Dreams', image: 'https://via.placeholder.com/400', itemCount: 500, floorPrice: '100 NIGHT', verified: true },
  { id: '3', name: 'Neon Nights', image: 'https://via.placeholder.com/400', itemCount: 50, floorPrice: '25 XRP', verified: false },
];

export const CollectionsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-midnight-900 mb-2">Collections</h1>
        <p className="text-midnight-600">Browse curated NFT collections from XRPL and Midnight</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCollections.map((collection) => (
          <Link key={collection.id} to={`/collection/${collection.id}`}>
            <div className="card overflow-hidden group">
              <div className="aspect-[4/3] overflow-hidden rounded-lg mb-4">
                <img 
                  src={collection.image} 
                  alt={collection.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">{collection.name}</h3>
                {collection.verified && (
                  <span className="badge badge-primary">Verified</span>
                )}
              </div>
              <div className="flex justify-between text-sm text-midnight-600">
                <span>{collection.itemCount} items</span>
                <span>Floor: {collection.floorPrice}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
