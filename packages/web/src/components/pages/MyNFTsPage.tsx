import { useState, useCallback, useEffect } from 'react';
import {
  Moon, Droplets, RefreshCw, Tag, ImageOff, ExternalLink, ShoppingBag,
  ChevronDown, ChevronUp, CheckCircle2, Download, Inbox, Gavel, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import {
  getOwnedTokens,
  getTokenMetadataMap,
  createListing,
  hexHashToBytes32,
} from '@/lib/midnight';
import { getNFTs, getIncomingOffers, type XRPLNFT, type XrplNetwork, type IncomingOffer } from '@/lib/xrpl';
import { acceptNftOffer, createXrplSellOffer, createXrplBuyOffer, createAuction } from '@/lib/xaman';
import { shorten } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toHttp(uri?: string): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith('ipfs://'))
    return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
  if (/^Qm[1-9A-Za-z]{44}|^bafy/.test(uri))
    return `https://gateway.pinata.cloud/ipfs/${uri}`;
  return uri;
}

function randomHex32(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Incoming offer card — lets the user accept a pending NFT transfer via Xaman
// ---------------------------------------------------------------------------
function IncomingOfferCard({ offer, onAccepted }: { offer: IncomingOffer; onAccepted: () => void }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [nftName, setNftName] = useState<string | undefined>();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offer.metadataUri) return;
    const http = toHttp(offer.metadataUri);
    if (!http) return;
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
  }, [offer.metadataUri]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const status = await acceptNftOffer(offer.offerId, nftName ?? offer.nftId.slice(0, 12));
      if (status.signed) {
        setAccepted(true);
        onAccepted();
      } else {
        setError('Not signed — open Xaman and try again.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="rounded-md border border-accent/40 bg-accent/5 overflow-hidden text-sm">
      <div className="flex aspect-square items-center justify-center bg-secondary/50 relative">
        {imgSrc ? (
          <img src={imgSrc} alt={nftName ?? offer.nftId} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/50" />
        )}
        <span className="absolute top-1 right-1 rounded bg-accent/80 px-1 py-0.5 text-[9px] font-medium text-accent-foreground">Incoming</span>
      </div>
      <div className="px-2 py-1.5 space-y-1.5">
        {nftName && <div className="truncate text-xs font-medium">{nftName}</div>}
        <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(offer.nftId, 6, 4)}</div>
        {accepted ? (
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <CheckCircle2 className="h-3 w-3" /> Accepted!
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={accepting}
            className="w-full h-7 text-xs gap-1"
          >
            <Download className="h-3 w-3" />
            {accepting ? 'Opening Xaman…' : 'Accept in Xaman'}
          </Button>
        )}
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XRPL NFT card — list for sale in XRP on XRPL, or place a private bid
// ---------------------------------------------------------------------------
function XrplNftCard({ nft, network }: { nft: XRPLNFT; network: XrplNetwork }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [nftName, setNftName] = useState<string | undefined>();
  const [imgFailed, setImgFailed] = useState(false);

  // List for sale state
  const [showList, setShowList] = useState(false);
  const [listPrice, setListPrice] = useState('');
  const [listPrivateTo, setListPrivateTo] = useState('');
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Bid state
  const [showBid, setShowBid] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidOwner, setBidOwner] = useState('');
  const [bidPrivate, setBidPrivate] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [bid, setBid] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  // Auction state
  const app = useApp();
  const [showAuction, setShowAuction] = useState(false);
  const [auctionReserve, setAuctionReserve] = useState('');
  const [auctionHours, setAuctionHours] = useState('24');
  const [auctionPublic, setAuctionPublic] = useState(true);
  const [auctioning, setAuctioning] = useState(false);
  const [auctioned, setAuctioned] = useState(false);
  const [auctionError, setAuctionError] = useState<string | null>(null);

  useEffect(() => {
    if (!nft.URI) return;
    const uri = nft.URI;
    const http = toHttp(uri);
    if (!http) return;
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

  async function handleList() {
    const parsed = parseFloat(listPrice);
    if (isNaN(parsed) || parsed <= 0) { setListError('Enter a valid XRP price.'); return; }
    setListing(true); setListError(null);
    try {
      const status = await createXrplSellOffer(nft.NFTokenID, parsed, network, {
        nftName,
        destination: listPrivateTo.trim() || undefined,
        metadataUri: nft.URI ? toHttp(nft.URI) : undefined,
        imageUrl: imgSrc,
      });
      if (status.signed) { setListed(true); setShowList(false); }
      else setListError('Not signed — try again.');
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally { setListing(false); }
  }

  async function handleAuction() {
    if (!app.xrplAccount) { setAuctionError('Connect Xaman wallet first.'); return; }
    const reserve = auctionReserve.trim();
    const hours = parseFloat(auctionHours);
    if (isNaN(hours) || hours <= 0) { setAuctionError('Enter a valid duration.'); return; }
    setAuctioning(true); setAuctionError(null);
    try {
      await createAuction({
        nftId: nft.NFTokenID,
        network,
        seller: app.xrplAccount,
        nftName,
        imageUrl: imgSrc,
        metadataUri: nft.URI ? toHttp(nft.URI) : undefined,
        reserveXrp: reserve || '0',
        durationHours: hours,
        isPublic: auctionPublic,
      });
      setAuctioned(true); setShowAuction(false);
    } catch (e) {
      setAuctionError(e instanceof Error ? e.message : String(e));
    } finally { setAuctioning(false); }
  }

  async function handleBid() {
    const parsed = parseFloat(bidPrice);
    if (isNaN(parsed) || parsed <= 0) { setBidError('Enter a valid XRP amount.'); return; }
    const owner = bidOwner.trim() || nft.Issuer || '';
    if (!owner) { setBidError('Enter the current owner address.'); return; }
    setBidding(true); setBidError(null);
    try {
      const status = await createXrplBuyOffer(nft.NFTokenID, parsed, owner, network, {
        nftName,
        isPrivate: bidPrivate,
      });
      if (status.signed) { setBid(true); setShowBid(false); }
      else setBidError('Not signed — try again.');
    } catch (e) {
      setBidError(e instanceof Error ? e.message : String(e));
    } finally { setBidding(false); }
  }

  return (
    <div className="rounded-md border border-border overflow-hidden text-sm">
      <div className="flex aspect-square items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={nftName ?? nft.NFTokenID} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="px-2 py-1.5 space-y-1">
        {nftName && <div className="truncate text-xs font-medium">{nftName}</div>}
        <div className="truncate font-mono text-[10px] text-muted-foreground">{shorten(nft.NFTokenID, 8, 6)}</div>
        {nft.nft_serial !== undefined && (
          <div className="text-[10px] text-muted-foreground">#{nft.nft_serial}</div>
        )}

        {/* List for sale */}
        {listed ? (
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <CheckCircle2 className="h-3 w-3" /> Listed on {network.toUpperCase()}
          </div>
        ) : (
          <button onClick={() => { setShowList((v) => !v); setShowBid(false); }}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline">
            <ShoppingBag className="h-3 w-3" />
            List for XRP
            {showList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {showList && !listed && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <input value={listPrice} onChange={(e) => setListPrice(e.target.value)}
              placeholder="Price in XRP" type="number" min="0" step="0.000001"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
            <input value={listPrivateTo} onChange={(e) => setListPrivateTo(e.target.value)}
              placeholder="Private to address (optional)"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
            {listPrivateTo && <p className="text-[9px] text-muted-foreground">Only this address can accept the offer.</p>}
            {listError && <p className="text-[10px] text-destructive">{listError}</p>}
            <Button size="sm" onClick={handleList} disabled={listing} className="w-full h-6 text-xs">
              {listing ? 'Opening Xaman…' : 'Confirm in Xaman'}
            </Button>
          </div>
        )}

        {/* Private bid */}
        {bid ? (
          <div className="flex items-center gap-1 text-[10px] text-accent">
            <CheckCircle2 className="h-3 w-3" /> Bid placed
          </div>
        ) : (
          <button onClick={() => { setShowBid((v) => !v); setShowList(false); setShowAuction(false); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:underline">
            <Tag className="h-3 w-3" />
            Place bid
            {showBid ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {showBid && !bid && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <input value={bidPrice} onChange={(e) => setBidPrice(e.target.value)}
              placeholder="Bid amount in XRP" type="number" min="0" step="0.000001"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
            <input value={bidOwner} onChange={(e) => setBidOwner(e.target.value)}
              placeholder="Current owner address"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none">
              <input type="checkbox" checked={bidPrivate} onChange={(e) => setBidPrivate(e.target.checked)} className="accent-primary" />
              Private bid (only seller can accept)
            </label>
            {bidError && <p className="text-[10px] text-destructive">{bidError}</p>}
            <Button size="sm" onClick={handleBid} disabled={bidding} className="w-full h-6 text-xs">
              {bidding ? 'Opening Xaman…' : 'Submit bid in Xaman'}
            </Button>
          </div>
        )}

        {/* Put up for Auction */}
        {auctioned ? (
          <div className="flex items-center gap-1 text-[10px] text-amber-400">
            <Gavel className="h-3 w-3" /> Auction live!
          </div>
        ) : (
          <button onClick={() => { setShowAuction((v) => !v); setShowList(false); setShowBid(false); }}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-amber-400 hover:underline">
            <Gavel className="h-3 w-3" />
            Put up for auction
            {showAuction ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {showAuction && !auctioned && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            <input value={auctionReserve} onChange={(e) => setAuctionReserve(e.target.value)}
              placeholder="Reserve price XRP (0 = no reserve)" type="number" min="0" step="0.000001"
              className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <input value={auctionHours} onChange={(e) => setAuctionHours(e.target.value)}
                placeholder="Duration (hours)" type="number" min="1" step="1"
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">hrs</span>
            </div>
            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer select-none">
              <input type="checkbox" checked={auctionPublic} onChange={(e) => setAuctionPublic(e.target.checked)} className="accent-primary" />
              Public auction (visible to all)
            </label>
            {!auctionPublic && <p className="text-[9px] text-muted-foreground">Private — only bidders you share the link with can participate.</p>}
            {auctionError && <p className="text-[10px] text-destructive">{auctionError}</p>}
            <Button size="sm" onClick={handleAuction} disabled={auctioning}
              className="w-full h-6 text-xs bg-amber-500 hover:bg-amber-600 text-white border-0">
              {auctioning ? 'Creating…' : 'Start Auction'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Midnight NFT card with list-for-sale
// ---------------------------------------------------------------------------
function MidnightNftCard({ tokenId, metadataCid }: { tokenId: string; metadataCid?: string }) {
  const app = useApp();
  const [imgSrc, setImgSrc] = useState<string | undefined>();
  const [nftName, setNftName] = useState<string | undefined>();
  const [imgFailed, setImgFailed] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!metadataCid) return;
    const http = toHttp(metadataCid);
    if (!http) return;
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
  }, [metadataCid]);
  const [price, setPrice] = useState('');
  const [listing, setListing] = useState(false);
  const [listed, setListed] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function handleList() {
    if (!app.midnight || !app.marketplace || !app.nftAddress) {
      setListError('Connect Lace wallet first.');
      return;
    }
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) { setListError('Enter a valid price.'); return; }
    setListing(true);
    setListError(null);
    try {
      const listingId = hexHashToBytes32(randomHex32());
      const nftContractBytes = hexHashToBytes32(app.nftAddress.replace(/^0x/, '').padStart(64, '0'));
      const tokenIdBytes = hexHashToBytes32(tokenId.padStart(64, '0').slice(0, 64));
      const currency = new Uint8Array(10);
      const enc = new TextEncoder();
      currency.set(enc.encode('NIGHT').subarray(0, 10));
      const priceBig = BigInt(Math.round(parsed * 1_000_000));
      await createListing(app.marketplace, listingId, nftContractBytes, tokenIdBytes, priceBig, currency);
      setListed(true);
      setShowList(false);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setListing(false);
    }
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-secondary/30">
      <div className="flex aspect-square items-center justify-center bg-secondary/50">
        {imgSrc && !imgFailed ? (
          <img src={imgSrc} alt={nftName ?? tokenId} loading="lazy"
            onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <Moon className="h-6 w-6 text-primary/30" />
        )}
      </div>
      <div className="p-2 space-y-1.5">
        {nftName && <div className="truncate text-xs font-medium">{nftName}</div>}
        <div className="flex items-center gap-1.5">
          <Moon className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate font-mono text-[10px] text-muted-foreground">{shorten(tokenId, 6, 4)}</span>
        </div>
      <a
        href={`https://preview.midnightexplorer.com/contracts/${app.nftAddress}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> Explorer
      </a>
      {listed ? (
        <div className="flex items-center gap-1 text-[10px] text-accent">
          <CheckCircle2 className="h-3 w-3" /> Listed
        </div>
      ) : (
        <button
          onClick={() => setShowList((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          <ShoppingBag className="h-3 w-3" />
          List for sale
          {showList ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
      {showList && !listed && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price in NIGHT"
            type="number"
            min="0"
            className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          {listError && <p className="text-[10px] text-destructive">{listError}</p>}
          <Button size="sm" onClick={handleList} disabled={listing} className="w-full h-6 text-xs">
            {listing ? 'Listing…' : 'Confirm'}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function MyNFTsPage() {
  const app = useApp();

  // Midnight NFTs
  const [midnightTokens, setMidnightTokens] = useState<string[]>([]);
  const [midnightMeta, setMidnightMeta] = useState<Map<string, string>>(new Map());
  const [loadingMidnight, setLoadingMidnight] = useState(false);
  const [fetchedMidnight, setFetchedMidnight] = useState(false);

  // XRPL NFTs
  const [xrplNfts, setXrplNfts] = useState<XRPLNFT[]>([]);
  const [loadingXrpl, setLoadingXrpl] = useState(false);
  const [fetchedXrpl, setFetchedXrpl] = useState(false);
  const [xrplNetwork, setXrplNetwork] = useState<XrplNetwork>('devnet');

  // Incoming NFT offers
  const [incomingOffers, setIncomingOffers] = useState<IncomingOffer[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);

  const fetchMidnight = useCallback(async () => {
    if (!app.midnight || !app.nftAddress) return;
    setLoadingMidnight(true);
    try {
      const [owned, meta] = await Promise.all([
        getOwnedTokens(app.midnight, app.nftAddress, app.midnight.coinPublicKeyHex),
        getTokenMetadataMap(app.midnight, app.nftAddress),
      ]);
      setMidnightTokens(owned);
      setMidnightMeta(meta);
    } catch { /* best-effort */ } finally {
      setLoadingMidnight(false);
      setFetchedMidnight(true);
    }
  }, [app.midnight, app.nftAddress]);

  const fetchIncoming = useCallback(async () => {
    if (!app.xrplAccount) return;
    setLoadingIncoming(true);
    try {
      setIncomingOffers(await getIncomingOffers(app.xrplAccount, 'devnet'));
    } catch { /* best-effort */ } finally {
      setLoadingIncoming(false);
    }
  }, [app.xrplAccount]);

  const fetchXrpl = useCallback(async () => {
    if (!app.xrplAccount) return;
    setLoadingXrpl(true);
    try {
      setXrplNfts(await getNFTs(app.xrplAccount, xrplNetwork));
    } catch { /* best-effort */ } finally {
      setLoadingXrpl(false);
      setFetchedXrpl(true);
    }
  }, [app.xrplAccount, xrplNetwork]);

  useEffect(() => { void fetchMidnight(); }, [fetchMidnight]);
  useEffect(() => { void fetchXrpl(); }, [fetchXrpl]);
  useEffect(() => { void fetchIncoming(); }, [fetchIncoming]);

  return (
    <div className="space-y-6">
      {/* Midnight NFTs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" /> My Midnight NFTs
          </CardTitle>
          <CardDescription>
            NFTs you own on the Midnight Preview network. List them for sale on the marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!app.midnight ? (
            <p className="text-sm text-muted-foreground">Connect your Lace wallet in the Wallets tab to view your Midnight NFTs.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {fetchedMidnight ? `${midnightTokens.length} NFT${midnightTokens.length === 1 ? '' : 's'}` : 'Loading…'}
                </span>
                <Button size="sm" variant="ghost" onClick={fetchMidnight} disabled={loadingMidnight}>
                  <RefreshCw className={`h-4 w-4 ${loadingMidnight ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {fetchedMidnight && midnightTokens.length === 0 && (
                <p className="text-sm text-muted-foreground">No Midnight NFTs found for this wallet.</p>
              )}
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {midnightTokens.map((id) => (
                  <MidnightNftCard key={id} tokenId={id} metadataCid={midnightMeta.get(id)} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incoming NFT Offers */}
      {app.xrplAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-accent" /> Incoming NFTs
            </CardTitle>
            <CardDescription>
              NFTs being sent to your wallet — open Xaman to accept each transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {incomingOffers.length === 0 ? 'No pending transfers' : `${incomingOffers.length} pending`}
                </span>
                <Button size="sm" variant="ghost" onClick={fetchIncoming} disabled={loadingIncoming}>
                  <RefreshCw className={`h-4 w-4 ${loadingIncoming ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {incomingOffers.length > 0 && (
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {incomingOffers.map((o) => (
                    <IncomingOfferCard
                      key={o.offerId}
                      offer={o}
                      onAccepted={fetchIncoming}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* XRPL NFTs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-accent" /> My XRPL NFTs
          </CardTitle>
          <CardDescription>
            NFTs in your XRPL wallet. List them for sale in XRP or place a private bid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!app.xrplAccount ? (
            <p className="text-sm text-muted-foreground">Connect your Xaman wallet in the Wallets tab to view your XRPL NFTs.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fetchedXrpl ? `${xrplNfts.length} NFT${xrplNfts.length === 1 ? '' : 's'}` : 'Loading…'}
                  </span>
                  <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-0.5 text-xs">
                    {(['devnet', 'testnet', 'mainnet'] as XrplNetwork[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setXrplNetwork(n)}
                        className={`rounded-full px-2 py-0.5 capitalize transition-colors ${
                          xrplNetwork === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={fetchXrpl} disabled={loadingXrpl}>
                  <RefreshCw className={`h-4 w-4 ${loadingXrpl ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {fetchedXrpl && xrplNfts.length === 0 && (
                <p className="text-sm text-muted-foreground">No XRPL NFTs found on {xrplNetwork}.</p>
              )}
              <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
                {xrplNfts.map((n) => (
                  <XrplNftCard key={n.NFTokenID} nft={n} network={xrplNetwork} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
