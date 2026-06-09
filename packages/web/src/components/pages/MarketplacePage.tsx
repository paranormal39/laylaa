import { TrendingUp, Wallet, RefreshCw, Moon, Layers, ImageOff, Star, Tag, ChevronDown, ChevronUp, CheckCircle2, Zap, Gavel, Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getNFTs, getNFTSellOffers, type XRPLNFT, type XrplNetwork, type XRPLSellOffer } from '@/lib/xrpl';
import { getTrendingNFTs, type AggregatorResult } from '@/lib/aggregator';
import { getCollections, getCuratedCollections, getMidnightBids, placeMidnightBid, deleteMidnightBid, getRecentXrplListings, getAuctions, placeAuctionBid, cancelAuction, acceptAuctionBid, type XrplCollection, type MidnightBid, type RecentListing, type Auction, type AuctionBid } from '@/lib/xaman';
import { getMarketplaceListings, type MidnightListing } from '@/lib/midnight';
import { shorten } from '@/lib/utils';
import type { UnifiedNFT } from '@/lib/types';

export function MarketplacePage() {
  const app = useApp();
  const [curated, setCurated] = useState<XrplCollection[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(false);
  const [collections, setCollections] = useState<XrplCollection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [trending, setTrending] = useState<AggregatorResult | null>(null);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [listedNetwork, setListedNetwork] = useState<XrplNetwork>('devnet');
  const [listedNfts, setListedNfts] = useState<Array<{ nft: XRPLNFT; offers: XRPLSellOffer[] }>>([]);
  const [loadingListed, setLoadingListed] = useState(false);
  const [fetchedListed, setFetchedListed] = useState(false);
  const [midnightListings, setMidnightListings] = useState<MidnightListing[]>([]);
  const [loadingMidnight, setLoadingMidnight] = useState(false);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);

  const refreshCurated = useCallback(async () => {
    setLoadingCurated(true);
    try {
      setCurated(await getCuratedCollections());
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingCurated(false);
    }
  }, []);

  const refreshCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      setCollections(await getCollections());
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  const refreshTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      setTrending(await getTrendingNFTs());
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  const refreshListed = useCallback(async () => {
    if (!app.xrplAccount) return;
    setLoadingListed(true);
    try {
      const nfts = await getNFTs(app.xrplAccount, listedNetwork);
      const withOffers = await Promise.all(
        nfts.map(async (nft) => ({
          nft,
          offers: await getNFTSellOffers(nft.NFTokenID, listedNetwork).catch(() => [] as XRPLSellOffer[]),
        }))
      );
      setListedNfts(withOffers.filter((x) => x.offers.length > 0));
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingListed(false);
      setFetchedListed(true);
    }
  }, [app.xrplAccount, listedNetwork]);

  const refreshMidnight = useCallback(async () => {
    if (!app.midnight || !app.marketplaceAddress) return;
    setLoadingMidnight(true);
    try {
      setMidnightListings(
        await getMarketplaceListings(app.midnight, app.marketplaceAddress, app.nftAddress ?? undefined),
      );
    } catch (e) {
      app.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMidnight(false);
    }
  }, [app.midnight, app.marketplaceAddress, app.nftAddress]);

  const refreshAuctions = useCallback(async () => {
    setLoadingAuctions(true);
    try { setAuctions(await getAuctions()); }
    catch { /* silent */ } finally { setLoadingAuctions(false); }
  }, []);

  const refreshRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      setRecentListings(await getRecentXrplListings());
    } catch { /* silent */ } finally {
      setLoadingRecent(false);
    }
  }, []);

  // Re-fetch when wallet connects or network switches
  useEffect(() => {
    setFetchedListed(false);
    void refreshListed();
  }, [refreshListed]);

  useEffect(() => {
    void refreshCurated();
    void refreshCollections();
    void refreshTrending();
    void refreshMidnight();
    void refreshRecent();
    void refreshAuctions();
    // Auto-refresh recent listings + auctions every 30 s
    const t = setInterval(() => { void refreshRecent(); void refreshAuctions(); }, 30_000);
    return () => clearInterval(t);
  }, [refreshCurated, refreshCollections, refreshTrending, refreshMidnight, refreshRecent, refreshAuctions]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Newly Listed on laylaa (XRPL)                                         */}
      {/* ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------ */}
      {/* Live Auctions                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Gavel className="h-5 w-5" /> Live Auctions
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={refreshAuctions} disabled={loadingAuctions}
              className="text-amber-400 hover:text-amber-400">
              <RefreshCw className={`h-4 w-4 ${loadingAuctions ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>Time-limited XRPL NFT auctions — place a public or private bid.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAuctions && auctions.length === 0 && (
            <p className="text-sm text-muted-foreground animate-pulse">Loading auctions…</p>
          )}
          {!loadingAuctions && auctions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No live auctions — put an NFT up for auction from the <span className="font-medium">My NFTs</span> tab.
            </p>
          )}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.map((a) => (
              <AuctionCard key={a.id} auction={a} callerAddress={app.xrplAccount ?? undefined}
                onRefresh={refreshAuctions} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-accent">
              <Zap className="h-5 w-5" /> Newly Listed on laylaa
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={refreshRecent} disabled={loadingRecent}
              className="text-accent hover:text-accent">
              <RefreshCw className={`h-4 w-4 ${loadingRecent ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>XRPL NFTs freshly listed on this platform — updates every 30s.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRecent && recentListings.length === 0 && (
            <p className="text-sm text-muted-foreground animate-pulse">Loading recent listings…</p>
          )}
          {!loadingRecent && recentListings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No listings yet — list an NFT from the <span className="font-medium">My NFTs</span> tab to appear here.
            </p>
          )}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {recentListings.map((l) => (
              <NewlyListedCard key={l.id} listing={l} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Curated List — hand-picked featured collections (live from mainnet) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-accent" /> Curated List
          </CardTitle>
          <CardDescription>
            Hand-picked XRPL collections, pulled live from mainnet by issuer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {curated.length} collection{curated.length === 1 ? '' : 's'}
            </span>
            <Button size="sm" variant="ghost" onClick={refreshCurated} disabled={loadingCurated}>
              <RefreshCw className={`h-4 w-4 ${loadingCurated ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {curated.length === 0 && !loadingCurated && (
            <p className="text-sm text-muted-foreground">No curated collections available right now.</p>
          )}
          <div className="space-y-5">
            {curated.map((col) => (
              <div key={col.id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{shorten(col.issuer, 8, 6)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {col.nfts.slice(0, 3).map((n) => (
                    <CollectionTile key={n.nftId} image={n.image} nftId={n.nftId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Featured XRPL collections (live from mainnet) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> XRPL Collections
          </CardTitle>
          <CardDescription>
            NFT collections pulled live from XRPL mainnet by issuer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {collections.length} collection{collections.length === 1 ? '' : 's'}
            </span>
            <Button size="sm" variant="ghost" onClick={refreshCollections} disabled={loadingCollections}>
              <RefreshCw className={`h-4 w-4 ${loadingCollections ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {collections.length === 0 && !loadingCollections && (
            <p className="text-sm text-muted-foreground">
              No live collections found. Set <code className="font-mono">COLLECTION_ISSUERS</code> in the backend
              <code className="font-mono"> .env</code> (format <code className="font-mono">Name:rIssuer[:taxon]</code>) to feature collections.
            </p>
          )}
          <div className="space-y-5">
            {collections.map((col) => (
              <div key={col.id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{shorten(col.issuer, 8, 6)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {col.nfts.slice(0, 3).map((n) => (
                    <CollectionTile key={n.nftId} image={n.image} nftId={n.nftId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wallet's listed-for-sale NFTs on current network */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Your Listed NFTs
          </CardTitle>
          <CardDescription>
            NFTs in your connected wallet that are actively listed for sale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!app.xrplAccount ? (
            <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
              Connect your Xaman wallet in the Wallets tab to see your listings.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fetchedListed
                      ? `${listedNfts.length} listed`
                      : 'Loading…'}
                  </span>
                  {/* Network switcher */}
                  <div className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/50 p-0.5 text-xs">
                    {(['devnet', 'testnet', 'mainnet'] as XrplNetwork[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => { setListedNetwork(n); setFetchedListed(false); }}
                        className={`rounded-full px-2 py-0.5 capitalize transition-colors ${
                          listedNetwork === n
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={refreshListed} disabled={loadingListed}>
                  <RefreshCw className={`h-4 w-4 ${loadingListed ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {fetchedListed && listedNfts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active listings found on {listedNetwork}. List an NFT from the{' '}
                  <span className="font-medium">My NFTs</span> tab.
                </p>
              )}
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {listedNfts.map(({ nft, offers }) => (
                  <ListedNftCard key={nft.NFTokenID} nft={nft} offers={offers} network={listedNetwork} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trending / aggregated feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" /> Trending
          </CardTitle>
          <CardDescription>
            {trending?.source === 'bithomp'
              ? 'Trending XRPL mainnet NFTs via Bithomp.'
              : 'Sample XRPL mainnet listings (configure VITE_BITHOMP_API_KEY for live data).'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {trending?.nfts.length ?? 0} listing{(trending?.nfts.length ?? 0) === 1 ? '' : 's'}
              </span>
              <Button size="sm" variant="ghost" onClick={refreshTrending} disabled={loadingTrending}>
                <RefreshCw className={`h-4 w-4 ${loadingTrending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {trending?.nfts.map((n) => (
                <UnifiedNftCard key={n.id} nft={n} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Midnight preview marketplace listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" /> Midnight Preview Listings
          </CardTitle>
          <CardDescription>
            Active listings from the Midnight marketplace contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!app.marketplaceAddress && (
            <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">
              Connect Lace in the Wallets tab — the Midnight marketplace contract connects automatically.
            </p>
          )}
          {app.marketplaceAddress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {midnightListings.filter((l) => l.status === 'active').length} active
                </span>
                <Button size="sm" variant="ghost" onClick={refreshMidnight} disabled={loadingMidnight}>
                  <RefreshCw className={`h-4 w-4 ${loadingMidnight ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {midnightListings.length === 0 && !loadingMidnight && (
                <p className="text-sm text-muted-foreground">No Midnight listings found.</p>
              )}
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {midnightListings.map((l) => (
                  <MidnightListingCard key={l.id} listing={l} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MidnightListingCard({ listing }: { listing: MidnightListing }) {
  const app = useApp();
  const [imgFailed, setImgFailed] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMsg, setBidMsg] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bids, setBids] = useState<MidnightBid[]>([]);

  useEffect(() => {
    if (listing.status !== 'active') return;
    getMidnightBids(listing.id).then(setBids).catch(() => {});
  }, [listing.id, listing.status]);

  const priceNight = listing.price
    ? `${(Number(listing.price) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} NIGHT`
    : '—';

  async function handleBid() {
    const parsed = parseFloat(bidPrice);
    if (isNaN(parsed) || parsed <= 0) { setBidError('Enter a valid NIGHT amount.'); return; }
    const address = app.midnight?.coinPublicKeyHex ?? app.midnight?.address;
    if (!address) { setBidError('Connect Lace wallet to place a bid.'); return; }
    setPlacing(true); setBidError(null);
    try {
      const newBid = await placeMidnightBid(listing.id, address, String(parsed), bidMsg || undefined);
      setBids((prev) => [...prev, newBid]);
      setPlaced(true); setShowBid(false);
    } catch (e) {
      setBidError(e instanceof Error ? e.message : String(e));
    } finally { setPlacing(false); }
  }

  async function handleCancelBid(bidId: string) {
    await deleteMidnightBid(bidId).catch(() => {});
    setBids((prev) => prev.filter((b) => b.id !== bidId));
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-secondary/30 transition-colors hover:bg-secondary/60">
      <div className="flex aspect-square items-center justify-center bg-secondary/50">
        {listing.imageUrl && !imgFailed ? (
          <img src={listing.imageUrl} alt={listing.tokenId} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <Moon className="h-8 w-8 text-primary/40" />
        )}
      </div>
      <div className="space-y-1 px-2 py-1.5">
        <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(listing.tokenId, 8, 6)}</div>
        <div className="text-xs font-semibold text-foreground">{priceNight}</div>
        <div className={`text-[10px] font-medium ${listing.status === 'active' ? 'text-accent' : 'text-muted-foreground'}`}>
          {listing.status}
        </div>

        {listing.status === 'active' && (
          <>
            {/* Existing bids */}
            {bids.length > 0 && (
              <div className="space-y-0.5 pt-0.5">
                <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Bids ({bids.length})</div>
                {bids.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-1 text-[9px]">
                    <span className="text-foreground font-medium">{b.priceNight} NIGHT</span>
                    <span className="truncate text-muted-foreground max-w-[60px]" title={b.bidderAddress}>
                      {b.bidderAddress.slice(0, 6)}…
                    </span>
                    {app.midnight?.coinPublicKeyHex === b.bidderAddress && (
                      <button onClick={() => handleCancelBid(b.id)}
                        className="text-destructive hover:underline">withdraw</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {placed ? (
              <div className="flex items-center gap-1 text-[10px] text-accent">
                <CheckCircle2 className="h-3 w-3" /> Bid placed
              </div>
            ) : (
              <button onClick={() => setShowBid((v) => !v)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:underline">
                <Tag className="h-3 w-3" /> Place bid
                {showBid ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {showBid && !placed && (
              <div className="space-y-1 pt-1 border-t border-border">
                <input value={bidPrice} onChange={(e) => setBidPrice(e.target.value)}
                  placeholder="Bid in NIGHT" type="number" min="0" step="0.000001"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-ring" />
                <input value={bidMsg} onChange={(e) => setBidMsg(e.target.value)}
                  placeholder="Message (optional)"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-ring" />
                <p className="text-[9px] text-muted-foreground">Bids are private — only visible to parties with the listing ID.</p>
                {bidError && <p className="text-[10px] text-destructive">{bidError}</p>}
                <button onClick={handleBid} disabled={placing}
                  className="w-full rounded bg-primary py-1 text-[10px] font-medium text-primary-foreground disabled:opacity-50">
                  {placing ? 'Submitting…' : 'Submit bid'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CollectionTile({ image, nftId }: { image?: string; nftId: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="group overflow-hidden rounded-md border border-border bg-secondary/30">
      <div className="flex aspect-square items-center justify-center bg-secondary/50">
        {image && !failed ? (
          <img
            src={image}
            alt={nftId}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="truncate px-2 py-1 font-mono text-[10px] text-muted-foreground">{shorten(nftId, 6, 4)}</div>
    </div>
  );
}

function NftCard({ nft, network }: { nft: XRPLNFT; network: XrplNetwork }) {
  const [offers, setOffers] = useState<string>('—');
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    getNFTSellOffers(nft.NFTokenID, network)
      .then((o) => setOffers(o.length > 0 ? `${o.length} offer(s)` : 'Not listed'))
      .catch(() => setOffers('—'));
  }, [nft.NFTokenID, network]);

  useEffect(() => {
    if (!nft.URI) return;
    const uri = nft.URI;
    const toHttp = (u: string) =>
      u.startsWith('ipfs://')
        ? `https://gateway.pinata.cloud/ipfs/${u.slice(7)}`
        : /^Qm[1-9A-Za-z]{44}|^bafy/.test(u)
        ? `https://gateway.pinata.cloud/ipfs/${u}`
        : u;
    const httpUri = toHttp(uri);
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(httpUri)) {
      setImgSrc(httpUri);
      return;
    }
    const ctrl = new AbortController();
    fetch(httpUri, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const ct = r.headers.get('content-type') ?? '';
        if (ct.startsWith('image/')) { setImgSrc(httpUri); return; }
        if (!ct.includes('json')) return;
        const meta = await r.json() as Record<string, unknown>;
        const img = (meta.image ?? meta.image_url) as string | undefined;
        if (img) setImgSrc(toHttp(img));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [nft.URI]);

  return (
    <div className="rounded-md border border-border overflow-hidden text-sm transition-colors hover:bg-secondary/50">
      <div className="flex aspect-square w-full items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={nft.NFTokenID}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="px-1.5 py-1">
        <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(nft.NFTokenID, 6, 4)}</div>
        <div className="text-[10px] text-accent">{offers}</div>
      </div>
    </div>
  );
}

function UnifiedNftCard({ nft }: { nft: UnifiedNFT }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm transition-colors hover:bg-secondary/50">
      <div className="font-medium">{nft.name}</div>
      {nft.description && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{nft.description}</div>}
      {nft.collection && <div className="mt-1 text-xs">Collection: {nft.collection}</div>}
      {nft.price && (
        <div className="mt-2 text-xs font-medium text-accent">
          {nft.price} {nft.currency}
        </div>
      )}
      <div className="mt-1 text-xs text-muted-foreground">{nft.source}</div>
    </div>
  );
}

function ListedNftCard({ nft, offers, network }: { nft: XRPLNFT; offers: XRPLSellOffer[]; network: XrplNetwork }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [nftName, setNftName] = useState<string | undefined>();
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!nft.URI) return;
    const toHttp = (u: string) =>
      u.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${u.slice(7)}`
      : /^Qm[1-9A-Za-z]{44}|^bafy/.test(u) ? `https://gateway.pinata.cloud/ipfs/${u}`
      : u;
    const http = toHttp(nft.URI);
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(http)) { setImgSrc(http); return; }
    const ctrl = new AbortController();
    fetch(http, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const ct = r.headers.get('content-type') ?? '';
        if (ct.startsWith('image/')) { setImgSrc(http); return; }
        if (!ct.includes('json')) return;
        const meta = await r.json() as Record<string, unknown>;
        if (meta.name) setNftName(String(meta.name));
        const img = (meta.image ?? meta.image_url) as string | undefined;
        if (img) setImgSrc(toHttp(img));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [nft.URI]);

  // Lowest public ask price in XRP
  const lowestDrops = offers
    .map((o) => (typeof o.amount === 'string' ? parseInt(o.amount, 10) : NaN))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)[0];
  const priceXrp = lowestDrops !== undefined ? (lowestDrops / 1_000_000).toString() : null;

  const networkColor = network === 'mainnet'
    ? 'bg-green-500/20 text-green-400'
    : network === 'testnet'
    ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-blue-500/20 text-blue-400';

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background transition-colors hover:border-primary/40 hover:bg-secondary/30">
      <div className="relative flex aspect-square items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={nftName ?? nft.NFTokenID} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-7 w-7 text-muted-foreground/40" />
        )}
        <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[8px] font-semibold capitalize ${networkColor}`}>
          {network}
        </span>
        {offers.length > 1 && (
          <span className="absolute top-1 right-1 rounded bg-primary/20 px-1 py-0.5 text-[8px] font-semibold text-primary">
            {offers.length} offers
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 space-y-0.5">
        {nftName ? (
          <div className="truncate text-xs font-medium leading-tight">{nftName}</div>
        ) : (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(nft.NFTokenID, 6, 4)}</div>
        )}
        {priceXrp !== null ? (
          <div className="text-xs font-semibold text-accent">{priceXrp} XRP</div>
        ) : (
          <div className="text-[10px] text-muted-foreground">Price on ledger</div>
        )}
        {nft.nft_serial !== undefined && (
          <div className="text-[9px] text-muted-foreground">#{nft.nft_serial}</div>
        )}
      </div>
    </div>
  );
}

function useCountdown(endsAt: number): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const ms = endsAt - Date.now();
      if (ms <= 0) { setLabel('Ended'); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [endsAt]);
  return label;
}

function AuctionCard({ auction, callerAddress, onRefresh }: {
  auction: Auction;
  callerAddress?: string;
  onRefresh: () => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(auction.imageUrl);
  const [imgFailed, setImgFailed] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidPrivate, setBidPrivate] = useState(false);
  const [bidMsg, setBidMsg] = useState('');
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidDone, setBidDone] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptDone, setAcceptDone] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const countdown = useCountdown(auction.endsAt);
  const isSeller = !!callerAddress && callerAddress === auction.seller;
  const ended = auction.endsAt < Date.now();

  useEffect(() => {
    if (auction.imageUrl || !auction.metadataUri) return;
    const http = toHttp(auction.metadataUri);
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(http)) { setImgSrc(http); return; }
    const ctrl = new AbortController();
    fetch(http, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const ct = r.headers.get('content-type') ?? '';
        if (ct.startsWith('image/')) { setImgSrc(http); return; }
        if (!ct.includes('json')) return;
        const meta = await r.json() as Record<string, unknown>;
        const img = (meta.image ?? meta.image_url) as string | undefined;
        if (img) setImgSrc(toHttp(img));
      }).catch(() => {});
    return () => ctrl.abort();
  }, [auction.imageUrl, auction.metadataUri]);

  const confirmedBids = auction.bids.filter((b) =>
    b.confirmed && (!b.isPrivate || isSeller),
  );
  const highestBid = confirmedBids.reduce<string | null>((best, b) =>
    best === null || parseFloat(b.amountXrp) > parseFloat(best) ? b.amountXrp : best, null);

  async function handleBid() {
    const parsed = parseFloat(bidAmount);
    if (isNaN(parsed) || parsed <= 0) { setBidError('Enter a valid XRP amount.'); return; }
    if (parseFloat(auction.reserveXrp) > 0 && parsed < parseFloat(auction.reserveXrp)) {
      setBidError(`Bid must be ≥ reserve price of ${auction.reserveXrp} XRP.`); return;
    }
    setBidding(true); setBidError(null);
    try {
      const status = await placeAuctionBid(auction.id, bidAmount, {
        isPrivate: bidPrivate,
        message: bidMsg.trim() || undefined,
        bidderLabel: callerAddress ?? 'anonymous',
      });
      if (status.signed) { setBidDone(true); setShowBid(false); onRefresh(); }
      else setBidError('Not signed — try again.');
    } catch (e) {
      setBidError(e instanceof Error ? e.message : String(e));
    } finally { setBidding(false); }
  }

  async function handleCancel() {
    if (!callerAddress) return;
    setCancelling(true);
    try { await cancelAuction(auction.id, callerAddress); onRefresh(); }
    catch { /* silent */ } finally { setCancelling(false); }
  }

  async function handleAccept(bid: AuctionBid) {
    if (!bid.xamanOfferId) { setAcceptError('No on-chain offer ID for this bid.'); return; }
    setAccepting(true); setAcceptError(null);
    try {
      const status = await acceptAuctionBid(auction.id, bid.xamanOfferId, auction.nftName);
      if (status.signed) { setAcceptDone(true); onRefresh(); }
      else setAcceptError('Not signed — try again.');
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : String(e));
    } finally { setAccepting(false); }
  }

  const networkColor = auction.network === 'mainnet'
    ? 'bg-green-500/20 text-green-400'
    : auction.network === 'testnet'
    ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-blue-500/20 text-blue-400';

  return (
    <div className="overflow-hidden rounded-lg border border-amber-500/25 bg-background">
      {/* Image strip */}
      <div className="relative flex h-32 items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={auction.nftName ?? auction.nftId} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-8 w-8 text-muted-foreground/40" />
        )}
        <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[8px] font-semibold capitalize ${networkColor}`}>
          {auction.network}
        </span>
        {!auction.isPublic && (
          <span className="absolute top-1 right-1 flex items-center gap-0.5 rounded bg-purple-500/20 px-1 py-0.5 text-[8px] font-semibold text-purple-400">
            <Lock className="h-2.5 w-2.5" /> Private
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Title + countdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {auction.nftName ? (
              <div className="truncate text-sm font-medium">{auction.nftName}</div>
            ) : (
              <div className="truncate font-mono text-xs text-muted-foreground">{shorten(auction.nftId, 8, 6)}</div>
            )}
            <div className="text-[10px] text-muted-foreground">by {shorten(auction.seller, 6, 4)}</div>
          </div>
          <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono whitespace-nowrap ${ended ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
            <Clock className="h-3 w-3" /> {countdown}
          </div>
        </div>

        {/* Reserve + current high bid */}
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Reserve </span>
            <span className="font-medium">{parseFloat(auction.reserveXrp) > 0 ? `${auction.reserveXrp} XRP` : 'None'}</span>
          </div>
          {highestBid && (
            <div>
              <span className="text-muted-foreground">Top bid </span>
              <span className="font-semibold text-amber-400">{highestBid} XRP</span>
            </div>
          )}
          <div className="text-muted-foreground ml-auto">
            {confirmedBids.length} bid{confirmedBids.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Public confirmed bids list */}
        {confirmedBids.length > 0 && (
          <div className="max-h-24 overflow-y-auto space-y-0.5 rounded border border-border bg-secondary/30 px-2 py-1">
            {confirmedBids
              .sort((a, b) => parseFloat(b.amountXrp) - parseFloat(a.amountXrp))
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {b.isPrivate && <Lock className="h-2.5 w-2.5 text-purple-400" />}
                    {shorten(b.bidder, 5, 4)}
                    {b.message && <span className="italic"> — {b.message}</span>}
                  </span>
                  <span className="font-semibold text-amber-400">{b.amountXrp} XRP</span>
                </div>
              ))}
          </div>
        )}

        {/* Place bid */}
        {!ended && !isSeller && (
          <>
            {bidDone ? (
              <div className="flex items-center gap-1 text-xs text-amber-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Bid placed!
              </div>
            ) : (
              <button onClick={() => setShowBid((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 hover:underline">
                <Tag className="h-3.5 w-3.5" />
                Place a bid
                {showBid ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            {showBid && !bidDone && (
              <div className="space-y-1.5 border-t border-border pt-2">
                <input value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Amount in XRP${parseFloat(auction.reserveXrp) > 0 ? ` (min ${auction.reserveXrp})` : ''}`}
                  type="number" min="0" step="0.000001"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                <input value={bidMsg} onChange={(e) => setBidMsg(e.target.value)}
                  placeholder="Message to seller (optional)"
                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
                <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none">
                  <input type="checkbox" checked={bidPrivate} onChange={(e) => setBidPrivate(e.target.checked)} className="accent-primary" />
                  Private bid (only seller sees it)
                </label>
                {bidError && <p className="text-[10px] text-destructive">{bidError}</p>}
                <Button size="sm" onClick={handleBid} disabled={bidding}
                  className="w-full h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white border-0">
                  {bidding ? 'Opening Xaman…' : 'Sign bid in Xaman'}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Seller controls */}
        {isSeller && (
          <div className="space-y-1 border-t border-border pt-2">
            {acceptError && <p className="text-[10px] text-destructive">{acceptError}</p>}
            {acceptDone ? (
              <div className="flex items-center gap-1 text-[10px] text-amber-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Winning bid accepted!
              </div>
            ) : confirmedBids.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  const winner = confirmedBids.sort(
                    (a, b) => parseFloat(b.amountXrp) - parseFloat(a.amountXrp)
                  )[0];
                  if (winner) void handleAccept(winner);
                }}
                disabled={accepting}
                className="w-full h-7 text-[10px] bg-amber-500 hover:bg-amber-600 text-white border-0"
              >
                {accepting ? 'Opening Xaman…' : `Accept highest bid (${highestBid} XRP)`}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={cancelling || accepting}
              className="w-full h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
              {cancelling ? 'Cancelling…' : 'Cancel auction'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function toHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
  if (/^Qm[1-9A-Za-z]{44}|^bafy/.test(uri)) return `https://gateway.pinata.cloud/ipfs/${uri}`;
  return uri;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function NewlyListedCard({ listing }: { listing: RecentListing }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(listing.imageUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (listing.imageUrl) { setImgSrc(listing.imageUrl); return; }
    if (!listing.metadataUri) return;
    const http = toHttp(listing.metadataUri);
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(http)) { setImgSrc(http); return; }
    const ctrl = new AbortController();
    fetch(http, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) return;
        const ct = r.headers.get('content-type') ?? '';
        if (ct.startsWith('image/')) { setImgSrc(http); return; }
        if (!ct.includes('json')) return;
        const meta = await r.json() as Record<string, unknown>;
        const img = (meta.image ?? meta.image_url) as string | undefined;
        if (img) setImgSrc(toHttp(img));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [listing.imageUrl, listing.metadataUri]);

  const networkLabel = listing.network === 'mainnet' ? 'Mainnet'
    : listing.network === 'testnet' ? 'Testnet' : 'Devnet';
  const networkColor = listing.network === 'mainnet'
    ? 'bg-green-500/20 text-green-400'
    : listing.network === 'testnet'
    ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-blue-500/20 text-blue-400';

  return (
    <div className="overflow-hidden rounded-md border border-accent/20 bg-background transition-colors hover:border-accent/60 hover:bg-accent/5">
      <div className="relative flex aspect-square items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={listing.nftName ?? listing.nftId} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-7 w-7 text-muted-foreground/40" />
        )}
        {/* Network badge */}
        <span className={`absolute top-1 left-1 rounded px-1 py-0.5 text-[8px] font-semibold ${networkColor}`}>
          {networkLabel}
        </span>
        {listing.isPrivate && (
          <span className="absolute top-1 right-1 rounded bg-purple-500/20 px-1 py-0.5 text-[8px] font-semibold text-purple-400">
            Private
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 space-y-0.5">
        {listing.nftName ? (
          <div className="truncate text-xs font-medium leading-tight">{listing.nftName}</div>
        ) : (
          <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(listing.nftId, 6, 4)}</div>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-accent">{listing.priceXrp} XRP</span>
          <span className="text-[9px] text-muted-foreground">{timeAgo(listing.listedAt)}</span>
        </div>
        {listing.seller && (
          <div className="truncate font-mono text-[9px] text-muted-foreground">{shorten(listing.seller, 5, 4)}</div>
        )}
      </div>
    </div>
  );
}
