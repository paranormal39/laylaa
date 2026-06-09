// Mint Page
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';

export const MintPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null,
    collection: '',
    chain: 'xrpl' as 'xrpl' | 'midnight',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle mint logic
    console.log('Minting NFT:', formData);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-midnight-900 mb-2">Mint NFT</h1>
        <p className="text-midnight-600">Create and mint your NFT on XRPL or Midnight</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chain Selection */}
          <div>
            <label className="block text-sm font-medium text-midnight-700 mb-2">Network</label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, chain: 'xrpl' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                  formData.chain === 'xrpl'
                    ? 'border-xrpl-500 bg-xrpl-50'
                    : 'border-midnight-200'
                }`}
              >
                <span className="font-medium">XRPL</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, chain: 'midnight' })}
                className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                  formData.chain === 'midnight'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-midnight-200'
                }`}
              >
                <span className="font-medium">Midnight</span>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-midnight-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="NFT Name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-midnight-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input h-32 resize-none"
              placeholder="Describe your NFT..."
            />
          </div>

          {/* Collection */}
          <div>
            <label className="block text-sm font-medium text-midnight-700 mb-2">Collection (optional)</label>
            <input
              type="text"
              value={formData.collection}
              onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
              className="input"
              placeholder="Select or create collection"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-midnight-700 mb-2">Image</label>
            <div className="border-2 border-dashed border-midnight-300 rounded-lg p-8 text-center hover:border-midnight-400 transition-colors">
              <p className="text-midnight-600">Drop your image here or click to browse</p>
              <p className="text-sm text-midnight-400 mt-2">Supports JPG, PNG, GIF (max 50MB)</p>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="w-full btn-primary py-3">
            Mint NFT
          </button>
        </form>
      </div>
    </div>
  );
};
