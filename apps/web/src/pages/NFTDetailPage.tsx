// NFT Detail Page
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useParams } from 'react-router-dom';

export const NFTDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Mock data - in real app, fetch from API
  const nft = {
    id,
    name: 'Cosmic Explorer #001',
    description: 'A unique cosmic explorer traveling through the digital universe.',
    image: 'https://via.placeholder.com/600',
    price: '100',
    currency: 'XRP',
    chain: 'xrpl',
    collection: 'Cosmic Explorers',
    owner: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMfHgFj',
    creator: 'rN7n7otQDd6FczFgLdlqtyMVrn3HMfHgFj',
    attributes: [
      { trait_type: 'Background', value: 'Nebula' },
      { trait_type: 'Suit', value: 'Platinum' },
      { trait_type: 'Helmet', value: 'Gold' },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-midnight-100">
            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Details */}
        <div>
          <span className={`badge mb-4 ${nft.chain === 'xrpl' ? 'badge-xrpl' : 'badge-midnight'}`}>
            {nft.chain === 'xrpl' ? 'XRPL' : 'Midnight'}
          </span>
          
          <h1 className="text-3xl font-bold text-midnight-900 mb-2">{nft.name}</h1>
          <p className="text-midnight-600 mb-4">{nft.collection}</p>
          
          <p className="text-midnight-700 mb-6">{nft.description}</p>

          {/* Price */}
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-midnight-600">Current Price</span>
              <span className="text-2xl font-bold">{nft.price} {nft.currency}</span>
            </div>
            <div className="flex space-x-3">
              <button className="flex-1 btn-primary py-3">Buy Now</button>
              <button className="flex-1 btn-secondary py-3">Make Offer</button>
            </div>
          </div>

          {/* Owner Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-midnight-600">Owner</span>
              <span className="font-mono">{nft.owner.slice(0, 8)}...{nft.owner.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-midnight-600">Creator</span>
              <span className="font-mono">{nft.creator.slice(0, 8)}...{nft.creator.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-midnight-600">Token ID</span>
              <span className="font-mono">{nft.id}</span>
            </div>
          </div>

          {/* Attributes */}
          <div className="mt-6">
            <h3 className="font-semibold text-midnight-900 mb-3">Attributes</h3>
            <div className="grid grid-cols-3 gap-3">
              {nft.attributes.map((attr, i) => (
                <div key={i} className="bg-midnight-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-midnight-500">{attr.trait_type}</p>
                  <p className="font-medium text-midnight-900">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
