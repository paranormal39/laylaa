// Collection Detail Page
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useParams, Link } from 'react-router-dom';

export const CollectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const collection = {
    id,
    name: 'Cosmic Explorers',
    description: 'A collection of unique cosmic explorers traveling through the digital universe.',
    image: 'https://via.placeholder.com/800',
    banner: 'https://via.placeholder.com/1200x400',
    creator: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMfHgFj',
    itemCount: 100,
    floorPrice: '50 XRP',
    volume: '10,000 XRP',
    verified: true,
    chain: 'xrpl',
  };

  const nfts = [
    { id: '1', name: 'Explorer #001', price: '50 XRP', image: 'https://via.placeholder.com/300' },
    { id: '2', name: 'Explorer #002', price: '55 XRP', image: 'https://via.placeholder.com/300' },
    { id: '3', name: 'Explorer #003', price: '60 XRP', image: 'https://via.placeholder.com/300' },
    { id: '4', name: 'Explorer #004', price: '75 XRP', image: 'https://via.placeholder.com/300' },
  ];

  return (
    <div>
      {/* Banner */}
      <div className="h-64 overflow-hidden">
        <img src={collection.banner} alt={collection.name} className="w-full h-full object-cover" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Collection Image */}
          <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
            <img src={collection.image} alt={collection.name} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex-1 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              {collection.verified && (
                <span className="badge badge-primary">Verified</span>
              )}
            </div>
            <p className="text-midnight-600 mb-4">{collection.description}</p>
            <div className="flex gap-6 text-sm">
              <div><strong>{collection.itemCount}</strong> items</div>
              <div><strong>{collection.floorPrice}</strong> floor</div>
              <div><strong>{collection.volume}</strong> volume</div>
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <Link key={nft.id} to={`/nft/${nft.id}`}>
                <div className="card overflow-hidden">
                  <img src={nft.image} alt={nft.name} className="w-full aspect-square object-cover rounded-lg mb-4" />
                  <h3 className="font-semibold">{nft.name}</h3>
                  <p className="text-sm text-midnight-600">{nft.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
