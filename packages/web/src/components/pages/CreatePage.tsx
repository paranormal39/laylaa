import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles, Droplets, Flame, CheckCircle2,
  ImageIcon, X, Tag, Coins, RefreshCw, LayoutGrid, Plus, Trash2, CheckCheck, FolderPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { testnetMint, acceptNftOffer, gxgMint, createTokenBurn, verifyBurn, openAndAwait, getTokenPrice, batchMint, createPlatformCollection, type TokenPrice, type BatchMintItem, type BatchMintResultItem, type PlatformCollection } from '@/lib/xaman';
import { useApp } from '@/context/AppContext';
import { mintNFT, ownerFromCoinPublicKeyHex, padCID } from '@/lib/midnight';
import { TOKENS } from '@/lib/tokens';
import { Buffer } from 'buffer';

type MintMode = 'xrpl' | 'midnight' | 'burn' | 'gxg' | 'batch' | 'collection';
type Step = 'idle' | 'uploading' | 'verifying' | 'signing' | 'minting' | 'done';

interface UploadResult {
  storage: 'ipfs' | 'local';
  imageUri: string;
  imageUrl: string;
  metadataUri: string;
  metadataUrl: string;
  metadata: Record<string, unknown>;
}

export function CreatePage() {
  const app = useApp();
  const [mode, setMode] = useState<MintMode>('xrpl');
  const [taxon, setTaxon] = useState('0');
  const [tokenId, setTokenId] = useState('');
  const [midnightMeta, setMidnightMeta] = useState('');
  const [selectedToken, setSelectedToken] = useState(TOKENS[0].id);
  // Collection mode
  const [collMode_name, setCollMode_name] = useState('');
  const [collMode_desc, setCollMode_desc] = useState('');
  const [collMode_taxon, setCollMode_taxon] = useState('0');
  const [collMode_network, setCollMode_network] = useState<'devnet' | 'testnet' | 'mainnet'>('devnet');
  const [collMode_result, setCollMode_result] = useState<PlatformCollection | null>(null);
  const [collMode_error, setCollMode_error] = useState<string | null>(null);
  const [collMode_running, setCollMode_running] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ txid?: string; nftoken_id?: string | null } | null>(null);

  // Image + metadata form
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributesRaw, setAttributesRaw] = useState('');
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);

  // Token price (1 XRP worth of the selected token)
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const append = (msg: string) => setLog((l) => [...l, msg]);

  const needsPrice = mode === 'burn';

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
    if (needsPrice) void loadPrice(selectedToken);
    else setPrice(null);
  }, [needsPrice, selectedToken, loadPrice]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploaded(null);
    }
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploaded(null);
    }
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setUploaded(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  async function uploadMeta(): Promise<UploadResult | null> {
    if (!imageFile) return uploaded;
    setStep('uploading');
    append('Uploading image + generating metadata…');
    const form = new FormData();
    form.append('image', imageFile);
    form.append('name', name.trim() || 'Untitled');
    form.append('description', description.trim());
    let attrs: unknown[] = [];
    try { if (attributesRaw.trim()) attrs = JSON.parse(attributesRaw.trim()); } catch { /* ignore */ }
    form.append('attributes', JSON.stringify(attrs));
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = (await res.json()) as UploadResult;
    append(`Metadata URL: ${data.metadataUrl}`);
    setUploaded(data);
    return data;
  }

  async function run() {
    app.setError(null);
    setLog([]);
    setResult(null);
    setStep('idle');

    let metadataUri = '';
    try {
      const up = await uploadMeta();
      if (!up) { app.setError('Drop an image first.'); setStep('idle'); return; }
      metadataUri = up.metadataUri;
      append(up.storage === 'ipfs' ? `Pinned to IPFS: ${up.metadataUri}` : `Stored locally: ${up.metadataUri}`);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle'); return;
    }

    if (mode === 'gxg') {
      if (!app.xrplAccount) { app.setError('Connect Xaman first.'); setStep('idle'); return; }
      setStep('verifying');
      append('Checking GXG hold on XRPL mainnet…');
      try {
        const res = await gxgMint(metadataUri, Number(taxon), app.xrplAccount);
        append(`GXG balance: ${res.gxgBalance}. Minted on mainnet.`);
        append(`Tx: ${res.txid}`);
        if (res.nftoken_id) append(`NFTokenID: ${res.nftoken_id}`);
        setResult(res); setStep('done');
      } catch (e) {
        app.setError(e instanceof Error ? e.message : String(e));
        setStep('idle');
      }
      return;
    }

    if (mode === 'xrpl') {
      if (!app.xrplAccount) { app.setError('Connect Xaman first so the NFT can be sent to your wallet.'); setStep('idle'); return; }
      setStep('minting');
      append('Minting on XRPL Devnet — sending to your wallet…');
      try {
        const res = await testnetMint(metadataUri, Number(taxon), app.xrplAccount) as any;
        append(`Minted. Tx: ${res.txid}`);
        if (res.nftoken_id) append(`NFTokenID: ${res.nftoken_id}`);
        if (res.offer_id) {
          append('Open Xaman to accept the NFT transfer to your wallet…');
          setStep('signing');
          const accepted = await acceptNftOffer(res.offer_id, name.trim() || 'Untitled');
          if (accepted.signed) {
            append('NFT accepted into your wallet!');
          } else {
            append('Transfer not accepted — NFT is held by the minting wallet.');
          }
        }
        setResult(res); setStep('done');
      } catch (e) {
        app.setError(e instanceof Error ? e.message : String(e));
        setStep('idle');
      }
      return;
    }

    if (mode === 'midnight') {
      if (!app.midnight || !app.nft) {
        app.setError('Connect Lace and deploy/join the NFT contract first.');
        return;
      }
      setStep('minting');
      append('Minting on Midnight Preview via Lace…');
      try {
        const idBytes = hexToBytes32(tokenId || randomHex32());
        const owner = ownerFromCoinPublicKeyHex(app.midnight.coinPublicKeyHex);
        const metaBytes = padCID(midnightMeta || metadataUri || 'layla-nft');
        const tx = await mintNFT(app.nft, idBytes, owner, metaBytes);
        append(`Minted. Tx: ${tx}`);
        setResult({ txid: tx }); setStep('done');
      } catch (e) {
        app.setError(e instanceof Error ? e.message : String(e));
        setStep('idle');
      }
      return;
    }

    const tokenDef = TOKENS.find((t) => t.id === selectedToken);
    if (!tokenDef) { app.setError('Select a valid token.'); return; }

    // Resolve "1 XRP worth" of the token for burn.
    let payAmount = '1';
    if (mode === 'burn') {
      try {
        const p = price && price.tokenId === tokenDef.id ? price : await getTokenPrice(tokenDef.id, 1);
        payAmount = p.amount;
        append(`1 XRP ≈ ${payAmount} ${tokenDef.name}`);
      } catch (e) {
        app.setError(`Could not fetch ${tokenDef.name} price: ${e instanceof Error ? e.message : String(e)}`);
        setStep('idle'); return;
      }
    }

    if (mode === 'burn') {
      if (!app.xrplAccount) { app.setError('Connect Xaman first.'); return; }
      setStep('signing');
      append(`Creating Xaman burn of ${payAmount} ${tokenDef.name}…`);
      let txid: string;
      try {
        const payload = await createTokenBurn(tokenDef.id, payAmount);
        const status = await openAndAwait(payload);
        if (!status.signed || !status.txid) { app.setError('Burn was not signed.'); setStep('idle'); return; }
        txid = status.txid;
        append(`Burned. Tx: ${txid}`);
      } catch (e) { app.setError(e instanceof Error ? e.message : String(e)); setStep('idle'); return; }
      setStep('verifying');
      append('Verifying burn on mainnet…');
      try {
        const v = await verifyBurn(txid, tokenDef.id, payAmount);
        append(`Verified: ${v.verified}`);
        if (!v.verified) { app.setError('Burn verification failed.'); setStep('idle'); return; }
      } catch (e) { app.setError(e instanceof Error ? e.message : String(e)); setStep('idle'); return; }
    }

    setStep('minting');
    append('Minting NFT on XRPL Testnet…');
    try {
      const res = await testnetMint(metadataUri, Number(taxon));
      append(`Minted. Tx: ${res.txid}`);
      if (res.nftoken_id) append(`NFTokenID: ${res.nftoken_id}`);
      setResult(res); setStep('done');
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
      setStep('idle');
    }
  }

  const ready =
    mode === 'midnight'
      ? Boolean(app.midnight && app.nft && imageFile)
      : mode === 'xrpl'
      ? Boolean(imageFile)
      : mode === 'gxg'
      ? Boolean(app.xrplAccount && imageFile)
      : mode === 'collection'
      ? false  // collection has its own submit button
      : Boolean(app.xrplAccount && imageFile);

  const showImageForm = true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Create / Mint
          </CardTitle>
          <CardDescription>
            Drop an image, set metadata, and mint on XRPL Testnet or Midnight Preview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode selector — grouped by destination chain */}
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Droplets className="h-3.5 w-3.5 text-accent" /> XRPL
              </div>
              <div className="flex flex-wrap gap-2">
                <ModeButton active={mode === 'gxg'} onClick={() => setMode('gxg')} icon={Sparkles} label="GXG-Gated (Mainnet)" />
                <ModeButton active={mode === 'xrpl'} onClick={() => setMode('xrpl')} icon={Droplets} label="Standard (Testnet)" />
                <ModeButton active={mode === 'burn'} onClick={() => setMode('burn')} icon={Flame} label="Burn-to-Mint" />
                <ModeButton active={mode === 'batch'} onClick={() => setMode('batch')} icon={LayoutGrid} label="Batch Mint" />
                <ModeButton active={mode === 'collection'} onClick={() => setMode('collection')} icon={Tag} label="Create Collection" />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Midnight Preview
              </div>
              <div className="flex flex-wrap gap-2">
                <ModeButton active={mode === 'midnight'} onClick={() => setMode('midnight')} icon={Sparkles} label="Private NFT" />
              </div>
            </div>
          </div>

          {/* Collection create panel */}
          {mode === 'collection' && (
            <CollectionCreatePanel
              name={collMode_name} onName={setCollMode_name}
              desc={collMode_desc} onDesc={setCollMode_desc}
              taxon={collMode_taxon} onTaxon={setCollMode_taxon}
              network={collMode_network} onNetwork={setCollMode_network}
              result={collMode_result} error={collMode_error} running={collMode_running}
              onSubmit={async () => {
                if (!collMode_name.trim()) { setCollMode_error('Collection name is required.'); return; }
                setCollMode_running(true); setCollMode_error(null); setCollMode_result(null);
                try {
                  const col = await createPlatformCollection({
                    name: collMode_name.trim(),
                    description: collMode_desc.trim() || undefined,
                    taxon: Number(collMode_taxon),
                    network: collMode_network,
                  });
                  setCollMode_result(col);
                } catch (e) {
                  setCollMode_error(e instanceof Error ? e.message : String(e));
                } finally {
                  setCollMode_running(false);
                }
              }}
            />
          )}

          {/* Image + metadata form */}
          {showImageForm && mode !== 'collection' && (
            <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-background p-10 transition-colors hover:border-primary/50 hover:bg-secondary/50"
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                {imagePreview ? (
                  <div className="relative w-full max-w-sm">
                    <img src={imagePreview} alt="Preview" className="mx-auto max-h-72 w-auto rounded-md object-contain" />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearImage(); }}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground" />
                    <p className="text-base font-medium text-muted-foreground">Drop an image here or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-1 text-sm font-medium">
                    <Tag className="h-3 w-3" /> Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cosmic Cat #001"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your NFT…"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Taxon (Collection ID)</label>
                  <input
                    type="number"
                    value={taxon}
                    onChange={(e) => setTaxon(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Attributes (JSON array)</label>
                  <input
                    value={attributesRaw}
                    onChange={(e) => setAttributesRaw(e.target.value)}
                    placeholder='[{"trait_type":"Color","value":"Blue"}]'
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {uploaded && (
                <div className="rounded-md border border-accent/40 bg-accent/10 p-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-accent">
                    Metadata ready
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                      {uploaded.storage === 'ipfs' ? 'IPFS' : 'Local'}
                    </span>
                  </div>
                  <div className="mt-1 break-all font-mono text-muted-foreground">{uploaded.metadataUri}</div>
                  <a
                    href={uploaded.metadataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary underline"
                  >
                    View on gateway
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Midnight-only inputs */}
          {mode === 'midnight' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">Token ID (hex, 64 chars)</label>
              <input
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                placeholder="Leave empty for auto-generated"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="block text-sm font-medium">Metadata / CID override (optional)</label>
              <input
                value={midnightMeta}
                onChange={(e) => setMidnightMeta(e.target.value)}
                placeholder="Defaults to the uploaded metadata URL"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Token selector */}
          {mode === 'burn' && (
            <div>
              <label className="block text-sm font-medium">Token</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {TOKENS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (hold {t.holdThreshold})
                  </option>
                ))}
              </select>
              {/* Price converter: 1 XRP worth of the token */}
              {needsPrice && (
                <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
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
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Select a token to see pricing.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {mode !== 'collection' && (
            <Button onClick={run} disabled={!ready || step !== 'idle'} className="w-full">
              {step === 'idle' ? (
                <><Sparkles className="h-4 w-4" /> Mint</>
              ) : step === 'done' ? (
                <><CheckCircle2 className="h-4 w-4" /> Done</>
              ) : (
                <>{step}…</>
              )}
            </Button>
          )}

          {log.length > 0 && (
            <div className="space-y-1 rounded-md bg-secondary p-3 font-mono text-xs">
              {log.map((line, i) => (
                <div key={i} className="text-muted-foreground">{line}</div>
              ))}
            </div>
          )}

          {result?.txid && (
            <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
              <div className="font-medium text-accent">Success</div>
              {result.nftoken_id && <div className="font-mono text-xs">NFTokenID: {result.nftoken_id}</div>}
              <div className="font-mono text-xs">Tx: {result.txid}</div>
            </div>
          )}
          {mode === 'batch' && <BatchMintPanel />}
        </CardContent>
      </Card>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// BatchMintPanel — mint up to 50 NFTs in one shot using XRPL Tickets.
// Each item has its own name + URI; they share a taxon (collection ID).
// Optionally saves the results as a named collection in the backend registry.
// ---------------------------------------------------------------------------
function BatchMintPanel() {
  const app = useApp();
  const [collectionName, setCollectionName] = useState('');
  const [collectionDesc, setCollectionDesc] = useState('');
  const [taxon, setTaxon] = useState('0');
  const [items, setItems] = useState<Array<{ name: string; uri: string; imageFile: File | null; imagePreview: string | null; metadataUri: string }>>([
    { name: '', uri: '', imageFile: null, imagePreview: null, metadataUri: '' },
  ]);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [results, setResults] = useState<BatchMintResultItem[] | null>(null);
  const fileRefs = useRef<Array<HTMLInputElement | null>>([]);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  function addItem() {
    if (items.length >= 50) return;
    setItems((prev) => [...prev, { name: '', uri: '', imageFile: null, imagePreview: null, metadataUri: '' }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: string, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function onFileSelect(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setItems((prev) => prev.map((it, idx) =>
      idx === i ? { ...it, imageFile: file, imagePreview: URL.createObjectURL(file), metadataUri: '' } : it
    ));
  }

  async function uploadAll(): Promise<boolean> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.imageFile && !item.uri) continue;
      if (item.metadataUri) continue; // already uploaded
      if (!item.imageFile) {
        // uri provided directly — use as-is
        setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, metadataUri: it.uri } : it));
        continue;
      }
      append(`Uploading image ${i + 1}/${items.length}: ${item.name || `NFT #${i + 1}`}…`);
      const form = new FormData();
      form.append('image', item.imageFile);
      form.append('name', item.name.trim() || `NFT #${i + 1}`);
      form.append('description', collectionDesc.trim());
      form.append('attributes', '[]');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) { append(`Upload failed for item ${i + 1}: ${res.status}`); return false; }
      const data = (await res.json()) as { metadataUri: string };
      setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, metadataUri: data.metadataUri } : it));
    }
    return true;
  }

  async function run() {
    if (!app.xrplAccount) { app.setError('Connect Xaman first.'); return; }
    app.setError(null);
    setLog([]);
    setResults(null);
    setRunning(true);
    try {
      append('Uploading images + metadata to IPFS…');
      const uploadOk = await uploadAll();
      if (!uploadOk) { setRunning(false); return; }

      // Re-read items after state updates (use a snapshot via callback)
      const snapshot = await new Promise<typeof items>((resolve) => {
        setItems((prev) => { resolve(prev); return prev; });
      });

      const mintItems: BatchMintItem[] = snapshot.map((it, i) => ({
        uri: it.metadataUri || it.uri || undefined,
        taxon: Number(taxon),
        name: it.name || `NFT #${i + 1}`,
      }));

      append(`Creating XRPL tickets and minting ${mintItems.length} NFT(s)…`);
      const res = await batchMint(mintItems, {
        destination: app.xrplAccount,
        collectionName: collectionName.trim() || undefined,
        collectionDescription: collectionDesc.trim() || undefined,
      });

      append(`Done. Minted: ${res.minted}/${res.attempted}`);
      res.results.forEach((r) => {
        if (r.ok) {
          append(`  ✓ #${r.index + 1} — ${r.nftId ?? 'unknown id'}`);
        } else {
          append(`  ✗ #${r.index + 1} — ${r.error ?? 'failed'}`);
        }
      });
      setResults(res.results);
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <span className="font-semibold">Batch Mint Collection</span>
        <span className="ml-auto text-xs text-muted-foreground">{items.length}/50 NFTs</span>
      </div>

      {/* Collection meta */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Collection Name <span className="text-muted-foreground">(optional)</span></label>
          <input
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="e.g. Cosmic Cats"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Taxon (shared collection ID)</label>
          <input
            type="number"
            value={taxon}
            onChange={(e) => setTaxon(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Description <span className="text-muted-foreground">(optional, applied to all)</span></label>
          <input
            value={collectionDesc}
            onChange={(e) => setCollectionDesc(e.target.value)}
            placeholder="Describe the collection…"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* NFT item rows */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
            {/* Thumbnail / upload */}
            <div
              onClick={() => fileRefs.current[i]?.click()}
              className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded border border-dashed border-muted-foreground/40 bg-secondary flex items-center justify-center"
            >
              <input
                ref={(el) => { fileRefs.current[i] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => onFileSelect(i, e)}
                className="hidden"
              />
              {item.imagePreview
                ? <img src={item.imagePreview} alt="" className="h-full w-full object-cover" />
                : <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
              }
            </div>
            {/* Name */}
            <input
              value={item.name}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
              placeholder={`NFT #${i + 1} name`}
              className="min-w-0 flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {/* URI (optional override) */}
            <input
              value={item.uri}
              onChange={(e) => updateItem(i, 'uri', e.target.value)}
              placeholder="Metadata URI (optional)"
              className="hidden sm:block min-w-0 w-48 rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {/* Uploaded indicator */}
            {item.metadataUri && <span title={item.metadataUri}><CheckCheck className="h-4 w-4 shrink-0 text-accent" /></span>}
            {/* Remove */}
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add row / mint */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={addItem}
          disabled={items.length >= 50 || running}
        >
          <Plus className="h-4 w-4" /> Add NFT
        </Button>
        <Button onClick={run} disabled={running || !app.xrplAccount} className="ml-auto">
          {running
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Minting…</>
            : <><LayoutGrid className="h-4 w-4" /> Mint {items.length} NFT{items.length !== 1 ? 's' : ''}</>
          }
        </Button>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-md bg-secondary p-3 font-mono text-xs">
          {log.map((line, i) => (
            <div key={i} className="text-muted-foreground">{line}</div>
          ))}
        </div>
      )}

      {/* Results summary */}
      {results && (
        <div className="space-y-1">
          {results.map((r) => (
            <div
              key={r.index}
              className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${r.ok ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}
            >
              {r.ok
                ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> #{r.index + 1} — <span className="font-mono">{r.nftId ?? ''}</span></>
                : <><X className="h-3.5 w-3.5 shrink-0" /> #{r.index + 1} — {r.error}</>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollectionCreatePanel — register an empty named collection in the backend.
// ---------------------------------------------------------------------------
function CollectionCreatePanel({
  name, onName, desc, onDesc, taxon, onTaxon,
  network, onNetwork, result, error, running, onSubmit,
}: {
  name: string; onName: (v: string) => void;
  desc: string; onDesc: (v: string) => void;
  taxon: string; onTaxon: (v: string) => void;
  network: 'devnet' | 'testnet' | 'mainnet'; onNetwork: (v: 'devnet' | 'testnet' | 'mainnet') => void;
  result: PlatformCollection | null;
  error: string | null;
  running: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex items-center gap-2">
        <FolderPlus className="h-5 w-5 text-primary" />
        <span className="font-semibold">Create a Collection</span>
        <span className="ml-auto text-xs text-muted-foreground">Registered in platform registry</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Collection Name <span className="text-destructive">*</span></label>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="e.g. Cosmic Cats"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
          <textarea
            value={desc}
            onChange={(e) => onDesc(e.target.value)}
            placeholder="Describe the collection…"
            rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Taxon (XRPL Collection ID)</label>
          <input
            type="number"
            value={taxon}
            onChange={(e) => onTaxon(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Network</label>
          <select
            value={network}
            onChange={(e) => onNetwork(e.target.value as 'devnet' | 'testnet' | 'mainnet')}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="devnet">Devnet</option>
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result ? (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 font-medium text-accent">
            <CheckCircle2 className="h-4 w-4" /> Collection created!
          </div>
          <div className="font-mono text-xs text-muted-foreground">ID: {result.id}</div>
          <div className="font-mono text-xs text-muted-foreground">Issuer: {result.issuer}</div>
          <p className="text-xs text-muted-foreground">Use this collection ID when batch minting to add NFTs to it.</p>
        </div>
      ) : (
        <Button onClick={onSubmit} disabled={running || !name.trim()} className="w-full">
          {running ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating…</> : <><FolderPlus className="h-4 w-4" /> Create Collection</>}
        </Button>
      )}
    </div>
  );
}

function hexToBytes32(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '').padStart(64, '0');
  if (clean.length !== 64) throw new Error('Expected 64-char hex');
  return Uint8Array.from(Buffer.from(clean, 'hex'));
}

function randomHex32(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
