import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, ArrowRight, CheckCircle2, Circle, Loader2, Coins, PenLine, ShieldCheck, Moon, RefreshCw, Image as ImageIcon, X, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { createTokenBurn, verifyBurn, openAndAwait, getTokenPrice, uploadNftMetadata, type TokenPrice } from '@/lib/xaman';
import { mintNFT, ownerFromCoinPublicKeyHex, padCID, hexToBytes32, randomHex32 } from '@/lib/midnight';
import { TOKENS } from '@/lib/tokens';

type Step = 'idle' | 'signing' | 'verifying' | 'uploading' | 'minting' | 'done';

const STEPS = [
  { key: 'choose', icon: Coins, title: 'Choose token & artwork', desc: 'Pick a mainnet token (1 XRP worth) and drop the image to mint.' },
  { key: 'burn', icon: PenLine, title: 'Burn in Xaman', desc: 'Approve the Payment to the blackhole address to destroy the tokens.' },
  { key: 'verify', icon: ShieldCheck, title: 'Verify on mainnet', desc: 'We confirm the burn landed on-chain with the right token + amount.' },
  { key: 'mint', icon: Moon, title: 'Mint on Midnight', desc: 'Artwork is pinned to IPFS and a private NFT is minted via Lace.' },
] as const;

// Map runtime step to the active stepper index. 4 = all done.
function stepIndex(step: Step): number {
  switch (step) {
    case 'idle':
      return 0;
    case 'signing':
      return 1;
    case 'verifying':
      return 2;
    case 'uploading':
    case 'minting':
      return 3;
    case 'done':
      return 4;
  }
}

function StepRow({ index, current, icon: Icon, title, desc }: {
  index: number;
  current: number;
  icon: typeof Coins;
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

export function TokenBurnToMintPanel() {
  const app = useApp();
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].id);
  const [step, setStep] = useState<Step>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ txid?: string } | null>(null);

  // Artwork + metadata (same flow as the Create tab's Midnight mint).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const append = (msg: string) => setLog((l) => [...l, msg]);
  const tokenDef = TOKENS.find((t) => t.id === selectedToken);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const ready = Boolean(app.xrplAccount && app.midnight && app.nft && imageFile);

  // Live price: 1 XRP worth of the selected token.
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const loadPrice = useCallback(async (id: string) => {
    setPriceLoading(true);
    setPriceError(null);
    try {
      setPrice(await getTokenPrice(id, 1));
    } catch (e) {
      setPrice(null);
      setPriceError(e instanceof Error ? e.message : String(e));
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrice(selectedToken);
  }, [selectedToken, loadPrice]);

  async function run() {
    if (!app.xrplAccount || !tokenDef) {
      app.setError('Connect Xaman wallet first.');
      return;
    }
    if (!app.midnight || !app.nft) {
      app.setError('Connect Lace and the Midnight NFT contract first.');
      return;
    }
    if (!imageFile) {
      app.setError('Drop an image to mint.');
      return;
    }
    app.setError(null);
    setLog([]);
    setResult(null);
    setStep('idle');

    // Resolve 1 XRP worth of the token.
    let burnAmount = '1';
    try {
      const p = price && price.tokenId === tokenDef.id ? price : await getTokenPrice(tokenDef.id, 1);
      burnAmount = p.amount;
    } catch (e) {
      app.setError(`Could not fetch ${tokenDef.name} price: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    // 1. Sign token burn via Xaman
    setStep('signing');
    append(`Creating Xaman burn of ${burnAmount} ${tokenDef.name} (≈ 1 XRP)…`);
    let burnTxid: string;
    try {
      const payload = await createTokenBurn(tokenDef.id, burnAmount);
      const status = await openAndAwait(payload);
      if (!status.signed || !status.txid) {
        app.setError('Burn was not signed.');
        setStep('idle');
        return;
      }
      burnTxid = status.txid;
      append(`Burned. Tx: ${burnTxid}`);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }

    // 2. Verify burn on mainnet
    setStep('verifying');
    append('Verifying burn on mainnet…');
    try {
      const v = await verifyBurn(burnTxid, tokenDef.id, burnAmount);
      append(`Verified: ${v.verified}`);
      if (!v.verified) {
        app.setError('Burn verification failed.');
        setStep('idle');
        return;
      }
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }

    // 3. Pin artwork + metadata to IPFS
    let metadataUri: string;
    setStep('uploading');
    append('Pinning artwork + metadata to IPFS…');
    try {
      const up = await uploadNftMetadata({ image: imageFile, name, description });
      metadataUri = up.metadataUri;
      append(up.storage === 'ipfs' ? `Pinned: ${metadataUri}` : `Stored locally: ${metadataUri}`);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
      return;
    }

    // 4. Mint the NFT on Midnight via Lace (same as the Create tab)
    setStep('minting');
    append('Minting on Midnight Preview via Lace…');
    try {
      const idBytes = hexToBytes32(randomHex32());
      const owner = ownerFromCoinPublicKeyHex(app.midnight.coinPublicKeyHex);
      const metaBytes = padCID(metadataUri || 'layla-nft');
      const tx = await mintNFT(app.nft, idBytes, owner, metaBytes);
      append(`Minted. Tx: ${tx}`);
      setResult({ txid: tx });
      setStep('done');
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-destructive" /> Token Burn-To-Mint Bridge
        </CardTitle>
        <CardDescription>
          Burn a mainnet fungible token in Xaman, then mint a private NFT on Midnight Preview.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!app.xrplAccount || !app.midnight || !app.nft) && (
          <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
            Connect Xaman (to burn) and Lace (to mint on Midnight) in the Wallets tab to use this bridge.
          </p>
        )}

        {/* Guided walkthrough */}
        <div className="space-y-2">
          {STEPS.map((s, i) => (
            <StepRow key={s.key} index={i} current={stepIndex(step)} icon={s.icon} title={s.title} desc={s.desc} />
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">1. Token to burn</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              disabled={step !== 'idle' && step !== 'done'}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              {TOKENS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price card: 1 XRP worth */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm font-medium">
                <Coins className="h-4 w-4 text-primary" /> You will burn
              </span>
              <button
                onClick={() => loadPrice(selectedToken)}
                disabled={priceLoading}
                className="text-muted-foreground hover:text-foreground"
                title="Refresh price"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${priceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {priceLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">Fetching live price…</p>
            ) : priceError ? (
              <p className="mt-1 text-xs text-destructive">{priceError}</p>
            ) : price ? (
              <>
                <div className="mt-1 text-2xl font-bold text-primary">
                  {price.amount} <span className="text-base font-medium text-muted-foreground">{price.token}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ≈ 1 XRP &middot; 1 {price.token} ≈ {price.xrpPerToken.toFixed(8)} XRP
                </p>
              </>
            ) : null}
          </div>

          {/* Artwork + metadata */}
          <label className="block text-sm font-medium">2. Artwork & metadata</label>
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background p-6 transition-colors hover:border-primary/50 hover:bg-secondary/50"
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative w-full max-w-xs">
                <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 w-auto rounded-md object-contain" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Drop an image here or click to browse</p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
              </>
            )}
          </div>
          <div>
            <label className="flex items-center gap-1 text-sm font-medium">
              <Tag className="h-3 w-3" /> Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bridged Cat #001"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your NFT…"
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <Button onClick={run} disabled={!ready || (step !== 'idle' && step !== 'done')} className="w-full">
          <Flame className="h-4 w-4" />
          {step === 'idle'
            ? '3. Burn Token & Mint on Midnight'
            : step === 'done'
            ? 'Burn another'
            : step === 'signing'
            ? 'Awaiting Xaman burn…'
            : step === 'verifying'
            ? 'Verifying burn…'
            : step === 'uploading'
            ? 'Pinning to IPFS…'
            : 'Minting on Midnight…'}
          <ArrowRight className="h-4 w-4" />
        </Button>

        {log.length > 0 && (
          <div className="space-y-1 rounded-md bg-secondary p-3 font-mono text-xs">
            {log.map((line, i) => (
              <div key={i} className="text-muted-foreground">
                {line}
              </div>
            ))}
          </div>
        )}

        {result?.txid && (
          <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-accent">
              <CheckCircle2 className="h-4 w-4" /> Minted on Midnight
            </div>
            <div className="break-all font-mono text-xs">Tx: {result.txid}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
