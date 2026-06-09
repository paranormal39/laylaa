// NFT Marketplace Frontend - App Component
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { NFTDetailPage } from './pages/NFTDetailPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { MintPage } from './pages/MintPage';
import { BridgePage } from './pages/BridgePage';
import { ProfilePage } from './pages/ProfilePage';
import { WalletProvider } from './components/WalletProvider';

const App: React.FC = () => {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/nft/:id" element={<NFTDetailPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collection/:id" element={<CollectionDetailPage />} />
          <Route path="/mint" element={<MintPage />} />
          <Route path="/bridge" element={<BridgePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Layout>
    </WalletProvider>
  );
};

export default App;
