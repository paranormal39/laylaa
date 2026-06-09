import { Wallet, Droplet, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { shorten } from '@/lib/utils';

function StatusDot({ on }: { on: boolean }) {
  return on ? (
    <CheckCircle2 className="h-4 w-4 text-accent" />
  ) : (
    <XCircle className="h-4 w-4 text-muted-foreground" />
  );
}

export function WalletPanel() {
  const { laceAvailable, midnight, connectingLace, connectMidnight, xrplAccount, connectingXrpl, connectXrpl, autoJoining, nft, bridge, marketplace } =
    useApp();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Midnight — Lace
          </CardTitle>
          <CardDescription>Connect the Lace wallet extension to deploy and call contracts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <StatusDot on={Boolean(midnight)} />
            <span className="text-muted-foreground">
              {midnight ? shorten(midnight.address) : laceAvailable ? 'Detected — not connected' : 'Lace not detected yet'}
            </span>
          </div>
          <Button onClick={connectMidnight} disabled={connectingLace || Boolean(midnight)}>
            {midnight ? 'Connected' : connectingLace ? 'Connecting…' : laceAvailable ? 'Connect Lace' : 'Connect Lace (retry)'}
          </Button>
          {!laceAvailable && !midnight && (
            <p className="text-xs text-muted-foreground">
              If you have the Midnight Lace extension installed, make sure it is unlocked, then click connect. Reload the page if it stays undetected.
            </p>
          )}
          {midnight && (
            <div className="text-xs text-muted-foreground">
              {autoJoining ? (
                <span>Connecting preview contracts…</span>
              ) : (
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><StatusDot on={Boolean(nft)} /> NFT</span>
                  <span className="flex items-center gap-1"><StatusDot on={Boolean(bridge)} /> Bridge</span>
                  <span className="flex items-center gap-1"><StatusDot on={Boolean(marketplace)} /> Marketplace</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-accent" /> XRPL — Xaman
          </CardTitle>
          <CardDescription>Sign in with Xaman to mint and burn XRPL NFTs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <StatusDot on={Boolean(xrplAccount)} />
            <span className="text-muted-foreground">{xrplAccount ? shorten(xrplAccount) : 'Not connected'}</span>
          </div>
          <Button variant="accent" onClick={connectXrpl} disabled={connectingXrpl || Boolean(xrplAccount)}>
            {xrplAccount ? 'Connected' : connectingXrpl ? 'Awaiting Xaman…' : 'Connect Xaman'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
