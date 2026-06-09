import { AlertTriangle } from 'lucide-react';
import { BurnToMintPanel } from '@/components/BurnToMintPanel';
import { TokenBurnToMintPanel } from '@/components/TokenBurnToMintPanel';
import { useApp } from '@/context/AppContext';

export function BridgePage() {
  const { bridgeJoinError, midnight } = useApp();
  return (
    <div className="space-y-6">
      {midnight && bridgeJoinError && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Burn contract unavailable</p>
            <p className="mt-1 text-xs opacity-90">
              The burn contract could not be joined (on-chain verifier keys don&apos;t match the
              bundled build). XRPL-NFT burn-to-mint is disabled until the contract is redeployed
              and <code className="font-mono">VITE_BRIDGE_ADDRESS</code> is updated. The rest of
              the app is unaffected.
            </p>
            <p className="mt-1 break-all font-mono text-[10px] opacity-60">{bridgeJoinError}</p>
          </div>
        </div>
      )}
      <BurnToMintPanel />
      <TokenBurnToMintPanel />
    </div>
  );
}
