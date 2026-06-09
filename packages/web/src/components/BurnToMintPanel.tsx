import { useCallback, useEffect, useState } from 'react';
import { Flame, RefreshCw, ArrowRight, CheckCircle2, Circle, Loader2, Image as ImageIcon, PenLine, Repeat, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { getNFTs, type XRPLNFT, type XrplNetwork } from '@/lib/xrpl';
import { createBurn, openAndAwait } from '@/lib/xaman';
import {
  hexHashToBytes32,
  ownerFromCoinPublicKeyHex,
  padCID,
  redeemBurn,
  mintNFT,
} from '@/lib/midnight';
import { shorten } from '@/lib/utils';

type Step = 'idle' | 'burning' | 'redeeming' | 'minting' | 'done';

const STEPS = [
  { key: 'select', icon: ImageIcon, title: 'Select an NFT', desc: 'Pick the XRPL NFT you want to bridge to Midnight.' },
  { key: 'burn', icon: PenLine, title: 'Burn on XRPL', desc: 'Approve the NFTokenBurn in Xaman. This destroys the XRPL NFT.' },
  { key: 'redeem', icon: Repeat, title: 'Redeem on bridge', desc: 'The burn hash is registered on the Midnight bridge (Lace prompt).' },
  { key: 'mint', icon: Sparkles, title: 'Mint on Midnight', desc: 'A wrapped NFT is minted to your Midnight wallet (Lace prompt).' },
] as const;

// Map the runtime step to the active stepper index (0-based). 4 = all done.
function stepIndex(step: Step, hasSelection: boolean): number {
  switch (step) {
    case 'idle':
      return hasSelection ? 1 : 0;
    case 'burning':
      return 1;
    case 'redeeming':
      return 2;
    case 'minting':
      return 3;
    case 'done':
      return 4;
  }
}

function StepRow({ index, current, icon: Icon, title, desc }: {
  index: number;
  current: number;
  icon: typeof ImageIcon;
  title: string;
  desc: string;
}) {
  const done = index < current;
  const active = index === current;
  return (
    <div className={`flex gap-3 rounded-md border p-3 transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-accent" />
        ) : active ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1">
        <div className={`flex items-center gap-1.5 text-sm font-medium ${active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
          <Icon className="h-4 w-4" /> {title}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function BurnToMintPanel() {
  const app = useApp();
  const [network, setNetwork] = useState<XrplNetwork>('devnet');
  const [nfts, setNfts] = useState<XRPLNFT[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  const refresh = useCallback(async () => {
    if (!app.xrplAccount) return;
    setLoadingNfts(true);
    setSelected(null);
    try {
      setNfts(await getNFTs(app.xrplAccount, network));
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingNfts(false);
    }
  }, [app.xrplAccount, network]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ready = Boolean(app.xrplAccount && app.midnight && app.bridge && app.nft);

  async function run() {
    if (!ready || !selected || !app.midnight) return;
    app.setError(null);
    setLog([]);
    const chosen = nfts.find((n) => n.NFTokenID === selected);
    const metadata = chosen?.URI && chosen.URI.length > 0 ? chosen.URI : 'bridged-from-xrpl';

    // 1. Burn on XRPL via Xaman.
    setStep('burning');
    append('Creating XRPL burn payload in Xaman…');
    let burnHashHex: string;
    try {
      const payload = await createBurn(selected, app.xrplAccount ?? undefined);
      append('Open Xaman and approve the burn…');
      const status = await openAndAwait(payload);
      if (!status.signed || !status.txid) {
        app.setError('XRPL burn was not signed.');
        setStep('idle');
        return;
      }
      burnHashHex = status.txid;
      append(`Burned. Tx hash: ${burnHashHex}`);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }

    // 2. Redeem on the bridge contract.
    let burnHash: Uint8Array;
    try {
      burnHash = hexHashToBytes32(burnHashHex);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }
    setStep('redeeming');
    append('Redeeming burn on the Midnight bridge (Lace will prompt)…');
    try {
      const tx = await redeemBurn(app.bridge, burnHash, padCID(metadata));
      append(`Bridge redeem submitted: ${tx}`);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }

    // 3. Mint the wrapped NFT on Midnight.
    setStep('minting');
    append('Minting wrapped NFT on Midnight…');
    try {
      const owner = ownerFromCoinPublicKeyHex(app.midnight.coinPublicKeyHex);
      const tx = await mintNFT(app.nft, burnHash, owner, padCID(metadata));
      append(`Wrapped NFT minted. Token id: ${burnHashHex}`);
      append(`Mint tx: ${tx}`);
      setStep('done');
      void refresh();
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-destructive" /> Burn-To-Mint Bridge
        </CardTitle>
        <CardDescription>
          Burn an XRPL NFT in Xaman, then mint the wrapped version on Midnight via the bridge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready && (
          <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
            Connect both wallets and deploy/join the NFT + Bridge contracts to enable this flow.
          </p>
        )}

        {/* Guided walkthrough */}
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <StepRow
              key={s.key}
              index={i}
              current={stepIndex(step, Boolean(selected))}
              icon={s.icon}
              title={s.title}
              desc={s.desc}
            />
          ))}
        </div>

        {/* Step 1: choose an NFT */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">1. Your XRPL NFTs</span>
          <div className="flex items-center gap-2">
            {/* Network switcher */}
            <div className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/50 p-0.5 text-xs">
              {(['devnet', 'testnet', 'mainnet'] as XrplNetwork[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNetwork(n)}
                  disabled={loadingNfts}
                  className={`rounded-full px-2 py-0.5 capitalize transition-colors ${
                    network === n
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={refresh} disabled={!app.xrplAccount || loadingNfts}>
              <RefreshCw className={`h-4 w-4 ${loadingNfts ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="max-h-56 space-y-2 overflow-y-auto">
          {nfts.length === 0 && (
            <p className="text-sm text-muted-foreground">No XRPL NFTs found for this account.</p>
          )}
          {nfts.map((n) => (
            <button
              key={n.NFTokenID}
              onClick={() => setSelected(n.NFTokenID)}
              disabled={step !== 'idle' && step !== 'done'}
              className={`w-full rounded-md border p-3 text-left text-sm transition-colors disabled:opacity-60 ${
                selected === n.NFTokenID ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
              }`}
            >
              <div className="font-mono text-xs">{shorten(n.NFTokenID, 14, 10)}</div>
              {n.URI && <div className="text-xs text-muted-foreground">{n.URI}</div>}
            </button>
          ))}
        </div>

        {selected && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="font-medium text-primary">Selected NFT</div>
            <div className="font-mono text-muted-foreground">{selected}</div>
          </div>
        )}

        <Button onClick={run} disabled={!ready || !selected || (step !== 'idle' && step !== 'done')} className="w-full">
          <Flame className="h-4 w-4" />
          {step === 'idle'
            ? '2. Burn & Mint'
            : step === 'done'
            ? 'Bridge another NFT'
            : step === 'burning'
            ? 'Awaiting Xaman burn…'
            : step === 'redeeming'
            ? 'Redeeming on bridge…'
            : 'Minting on Midnight…'}
          <ArrowRight className="h-4 w-4" />
        </Button>

        {step === 'done' && (
          <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            <CheckCircle2 className="h-4 w-4" /> Bridged successfully — wrapped NFT minted on Midnight.
          </div>
        )}

        {log.length > 0 && (
          <div className="space-y-1 rounded-md bg-secondary p-3 font-mono text-xs">
            {log.map((line, i) => (
              <div key={i} className="text-muted-foreground">
                {line}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
