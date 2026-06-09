import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  connectLace,
  isLaceAvailable,
  joinNFT,
  joinBridge,
  joinMarketplace,
  DEFAULT_CONTRACTS,
  type MidnightConnection,
} from '@/lib/midnight';
import { createSignIn, openAndAwait } from '@/lib/xaman';

interface AppState {
  // Midnight (Lace)
  laceAvailable: boolean;
  midnight: MidnightConnection | null;
  connectingLace: boolean;
  connectMidnight: () => Promise<void>;
  // contracts (addresses + live handles)
  nftAddress: string | null;
  bridgeAddress: string | null;
  marketplaceAddress: string | null;
  collectionAddress: string | null;
  nft: any | null;
  bridge: any | null;
  marketplace: any | null;
  autoJoining: boolean;
  bridgeJoinError: string | null;
  setNftAddress: (a: string | null) => void;
  setBridgeAddress: (a: string | null) => void;
  setMarketplaceAddress: (a: string | null) => void;
  setNft: (c: any | null) => void;
  setBridge: (c: any | null) => void;
  setMarketplace: (c: any | null) => void;
  // XRPL (Xaman)
  xrplAccount: string | null;
  connectingXrpl: boolean;
  connectXrpl: () => Promise<void>;
  // misc
  error: string | null;
  setError: (e: string | null) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [midnight, setMidnight] = useState<MidnightConnection | null>(null);
  const [connectingLace, setConnectingLace] = useState(false);
  const [laceAvailable, setLaceAvailable] = useState(isLaceAvailable());
  const [nftAddress, setNftAddress] = useState<string | null>(DEFAULT_CONTRACTS.nft);
  const [bridgeAddress, setBridgeAddress] = useState<string | null>(DEFAULT_CONTRACTS.bridge);
  const [marketplaceAddress, setMarketplaceAddress] = useState<string | null>(DEFAULT_CONTRACTS.marketplace);
  const [collectionAddress] = useState<string | null>(DEFAULT_CONTRACTS.collection);
  const [nft, setNft] = useState<any | null>(null);
  const [bridge, setBridge] = useState<any | null>(null);
  const [marketplace, setMarketplace] = useState<any | null>(null);
  const [autoJoining, setAutoJoining] = useState(false);
  const [bridgeJoinError, setBridgeJoinError] = useState<string | null>(null);
  const [xrplAccount, setXrplAccount] = useState<string | null>(null);
  const [connectingXrpl, setConnectingXrpl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The Lace extension injects window.midnight.mnLace asynchronously and may
  // not be present at first render. Poll briefly until it appears.
  useEffect(() => {
    if (laceAvailable) return;
    const started = Date.now();
    const timer = setInterval(() => {
      if (isLaceAvailable()) {
        setLaceAvailable(true);
        clearInterval(timer);
      } else if (Date.now() - started > 15000) {
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [laceAvailable]);

  const connectMidnight = useCallback(async () => {
    setError(null);
    setConnectingLace(true);
    try {
      const conn = await connectLace();
      setMidnight(conn);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnectingLace(false);
    }
  }, []);

  // Once connected, auto-join the default preview contracts so the marketplace,
  // create, and bridge flows have live handles without manual deploy/join.
  useEffect(() => {
    if (!midnight) return;
    let cancelled = false;
    (async () => {
      setAutoJoining(true);
      // Join each contract independently so a failure on one (e.g. the bridge's
      // known verifier-key mismatch) doesn't block the others. The marketplace
      // listings and NFT reads must keep working even if the bridge can't join.
      if (nftAddress && !nft) {
        try {
          const h = await joinNFT(midnight, nftAddress);
          if (!cancelled) setNft(h);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        }
      }
      if (bridgeAddress && !bridge) {
        try {
          const h = await joinBridge(midnight, bridgeAddress);
          if (!cancelled) {
            setBridge(h);
            setBridgeJoinError(null);
          }
        } catch (e) {
          // The bridge is only needed for burn-to-mint; keep it contained so the
          // rest of the app stays usable. Surface it in the Bridge panel instead.
          if (!cancelled) setBridgeJoinError(e instanceof Error ? e.message : String(e));
        }
      }
      if (marketplaceAddress && !marketplace) {
        try {
          const h = await joinMarketplace(midnight, marketplaceAddress);
          if (!cancelled) setMarketplace(h);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        }
      }
      if (!cancelled) setAutoJoining(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midnight]);

  const connectXrpl = useCallback(async () => {
    setError(null);
    setConnectingXrpl(true);
    try {
      const payload = await createSignIn();
      const status = await openAndAwait(payload);
      if (status.signed && status.account) {
        setXrplAccount(status.account);
      } else {
        setError('Xaman sign-in was not completed.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnectingXrpl(false);
    }
  }, []);

  const value = useMemo<AppState>(
    () => ({
      laceAvailable,
      midnight,
      connectingLace,
      connectMidnight,
      nftAddress,
      bridgeAddress,
      marketplaceAddress,
      collectionAddress,
      nft,
      bridge,
      marketplace,
      autoJoining,
      bridgeJoinError,
      setNftAddress,
      setBridgeAddress,
      setMarketplaceAddress,
      setNft,
      setBridge,
      setMarketplace,
      xrplAccount,
      connectingXrpl,
      connectXrpl,
      error,
      setError,
    }),
    [laceAvailable, midnight, connectingLace, connectMidnight, nftAddress, bridgeAddress, marketplaceAddress, collectionAddress, nft, bridge, marketplace, autoJoining, bridgeJoinError, xrplAccount, connectingXrpl, connectXrpl, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
