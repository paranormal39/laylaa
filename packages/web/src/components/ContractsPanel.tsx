import { useState } from 'react';
import { Boxes, Rocket, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import {
  deployNFT, joinNFT,
  deployBridge, joinBridge,
  deployMarketplace, joinMarketplace,
} from '@/lib/midnight';
import { shorten } from '@/lib/utils';

type Kind = 'nft' | 'bridge' | 'marketplace';

function ContractRow({ kind }: { kind: Kind }) {
  const app = useApp();
  const [addrInput, setAddrInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const label =
    kind === 'nft' ? 'NFT' : kind === 'bridge' ? 'Bridge' : 'Marketplace';
  const address =
    kind === 'nft'
      ? app.nftAddress
      : kind === 'bridge'
      ? app.bridgeAddress
      : app.marketplaceAddress;
  const setAddress =
    kind === 'nft'
      ? app.setNftAddress
      : kind === 'bridge'
      ? app.setBridgeAddress
      : app.setMarketplaceAddress;
  const setHandle =
    kind === 'nft'
      ? app.setNft
      : kind === 'bridge'
      ? app.setBridge
      : app.setMarketplace;

  async function doDeploy() {
    if (!app.midnight) return;
    setBusy('deploy');
    app.setError(null);
    try {
      const addr =
        kind === 'nft'
          ? await deployNFT(app.midnight)
          : kind === 'bridge'
          ? await deployBridge(app.midnight)
          : await deployMarketplace(app.midnight);
      setAddress(addr);
      const handle =
        kind === 'nft'
          ? await joinNFT(app.midnight, addr)
          : kind === 'bridge'
          ? await joinBridge(app.midnight, addr)
          : await joinMarketplace(app.midnight, addr);
      setHandle(handle);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function doJoin() {
    if (!app.midnight || !addrInput.trim()) return;
    setBusy('join');
    app.setError(null);
    try {
      const addr = addrInput.trim();
      const handle =
        kind === 'nft'
          ? await joinNFT(app.midnight, addr)
          : kind === 'bridge'
          ? await joinBridge(app.midnight, addr)
          : await joinMarketplace(app.midnight, addr);
      setAddress(addr);
      setHandle(handle);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label} contract</span>
        <span className="text-xs text-muted-foreground">{address ? shorten(address, 10, 8) : 'none'}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={doDeploy} disabled={!app.midnight || busy !== null}>
          <Rocket className="h-4 w-4" /> {busy === 'deploy' ? 'Deploying…' : 'Deploy'}
        </Button>
        <input
          value={addrInput}
          onChange={(e) => setAddrInput(e.target.value)}
          placeholder={`Paste ${label} address`}
          className="h-9 flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button size="sm" variant="outline" onClick={doJoin} disabled={!app.midnight || busy !== null || !addrInput.trim()}>
          <Link2 className="h-4 w-4" /> {busy === 'join' ? 'Joining…' : 'Join'}
        </Button>
      </div>
    </div>
  );
}

export function ContractsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" /> Midnight Contracts
        </CardTitle>
        <CardDescription>Deploy new instances or connect to ones you already deployed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ContractRow kind="nft" />
        <ContractRow kind="bridge" />
        <ContractRow kind="marketplace" />
      </CardContent>
    </Card>
  );
}
