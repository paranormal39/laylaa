// Bridge Page (Burn-To-Mint)
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { useWalletStore } from '../stores/walletStore';

export const BridgePage: React.FC = () => {
  const { xrplConnected } = useWalletStore();
  const [step, setStep] = useState<'burn' | 'verify' | 'mint' | 'complete'>('burn');
  const [tokenId, setTokenId] = useState('');
  const [burnHash, setBurnHash] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBurn = async () => {
    setIsProcessing(true);
    // Simulate burn
    await new Promise(resolve => setTimeout(resolve, 2000));
    setBurnHash('mock-burn-hash-123456');
    setStep('verify');
    setIsProcessing(false);
  };

  const handleVerify = async () => {
    setIsProcessing(true);
    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStep('mint');
    setIsProcessing(false);
  };

  const handleMint = async () => {
    setIsProcessing(true);
    // Simulate mint
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStep('complete');
    setIsProcessing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-midnight-900 mb-2">Burn-To-Mint Bridge</h1>
        <p className="text-midnight-600">Migrate your XRPL NFTs to the Midnight network</p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {['burn', 'verify', 'mint', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step === s || ['verify', 'mint', 'complete'].includes(step) && ['burn', 'verify', 'mint'].includes(s)
                ? 'bg-primary-600 text-white'
                : 'bg-midnight-200 text-midnight-500'
            }`}>
              {['verify', 'mint', 'complete'].includes(step) && s === 'burn' ? '✓' : i + 1}
            </div>
            {i < 3 && (
              <div className={`w-16 h-1 mx-2 ${
                ['verify', 'mint', 'complete'].includes(step) && ['burn', 'verify', 'mint'].includes(s)
                  ? 'bg-primary-600'
                  : 'bg-midnight-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="card">
        {step === 'burn' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 1: Burn XRPL NFT</h2>
            <p className="text-midnight-600 mb-4">
              Enter the Token ID of the XRPL NFT you want to migrate. This will permanently burn the NFT on XRPL.
            </p>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Enter XRPL Token ID"
              className="input mb-4"
            />
            {!xrplConnected && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 mb-4">
                Please connect your XRPL wallet first
              </div>
            )}
            <button
              onClick={handleBurn}
              disabled={!tokenId || !xrplConnected || isProcessing}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isProcessing ? 'Burning...' : 'Burn NFT'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 2: Verify Burn</h2>
            <p className="text-midnight-600 mb-4">
              Your burn has been submitted. Evernode services will verify the burn transaction.
            </p>
            <div className="p-3 bg-midnight-50 rounded-lg mb-4">
              <p className="text-sm text-midnight-600">Burn Hash:</p>
              <p className="font-mono text-sm">{burnHash}</p>
            </div>
            <button
              onClick={handleVerify}
              disabled={isProcessing}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isProcessing ? 'Verifying...' : 'Verify Burn'}
            </button>
          </div>
        )}

        {step === 'mint' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 3: Mint on Midnight</h2>
            <p className="text-midnight-600 mb-4">
              Burn verified! Now mint your NFT on the Midnight network.
            </p>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-green-700 text-sm">✓ Replay protection: Verified</p>
              <p className="text-green-700 text-sm">✓ Collection validation: Approved</p>
              <p className="text-green-700 text-sm">✓ Issuer validation: Verified</p>
            </div>
            <button
              onClick={handleMint}
              disabled={isProcessing}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isProcessing ? 'Minting...' : 'Mint on Midnight'}
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Migration Complete!</h2>
            <p className="text-midnight-600 mb-4">
              Your NFT has been successfully migrated to Midnight.
            </p>
            <div className="p-4 bg-midnight-50 rounded-lg mb-4 text-left">
              <p className="text-sm"><strong>New Token ID:</strong> new-midnight-token-id</p>
              <p className="text-sm"><strong>Source:</strong> XRPL</p>
              <p className="text-sm"><strong>Burn Hash:</strong> {burnHash}</p>
            </div>
            <button
              onClick={() => {
                setStep('burn');
                setTokenId('');
                setBurnHash('');
              }}
              className="btn-primary"
            >
              Migrate Another NFT
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
