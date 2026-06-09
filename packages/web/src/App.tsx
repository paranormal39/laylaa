import { useState, useEffect } from 'react';
import { XamanModal } from '@/components/XamanModal';
import { AlertTriangle, X, Store, Sparkles, Flame, Wallet2, CheckCircle2, LayoutGrid, Sun, Moon } from 'lucide-react';
import { MarketplacePage } from '@/components/pages/MarketplacePage';
import { CreatePage } from '@/components/pages/CreatePage';
import { BridgePage } from '@/components/pages/BridgePage';
import { WalletsPage } from '@/components/pages/WalletsPage';
import { MyNFTsPage } from '@/components/pages/MyNFTsPage';
import { useApp } from '@/context/AppContext';
import { cn, shorten } from '@/lib/utils';

type TabKey = 'market' | 'create' | 'mynfts' | 'bridge' | 'wallets';

const TABS: { key: TabKey; label: string; icon: typeof Store }[] = [
  { key: 'market',  label: 'Market',   icon: Store      },
  { key: 'create',  label: 'Create',   icon: Sparkles   },
  { key: 'mynfts',  label: 'My NFTs',  icon: LayoutGrid },
  { key: 'bridge',  label: 'Burn',     icon: Flame      },
  { key: 'wallets', label: 'Wallets',  icon: Wallet2    },
];

function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem('laylaa-theme') === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add('dark');    localStorage.setItem('laylaa-theme', 'dark');  }
    else       { root.classList.remove('dark'); localStorage.setItem('laylaa-theme', 'light'); }
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

export default function App() {
  const { error, setError, midnight, xrplAccount } = useApp();
  const [tab, setTab] = useState<TabKey>('market');
  const [dark, toggleDark] = useDarkMode();

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/laylaa-logo.png"
              alt="laylaa"
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-border"
            />
            <div className="leading-none">
              <p className="font-serif text-xl font-normal tracking-tight text-foreground">laylaa</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">The XRPL Midnight NFT Marketplace</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ConnectionChip label="Lace"  on={Boolean(midnight)}     detail={midnight     ? shorten(midnight.address) : 'preview'}       />
            <ConnectionChip label="Xaman" on={Boolean(xrplAccount)}  detail={xrplAccount  ? shorten(xrplAccount)      : 'mainnet/testnet'} />
            <button
              onClick={toggleDark}
              aria-label="Toggle dark mode"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="mx-auto flex max-w-6xl gap-0 overflow-x-auto px-4">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </span>
            <button onClick={() => setError(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </div>
        )}

        {tab === 'market'  && <MarketplacePage />}
        {tab === 'create'  && <CreatePage />}
        {tab === 'mynfts'  && <MyNFTsPage />}
        {tab === 'bridge'  && <BridgePage />}
        {tab === 'wallets' && <WalletsPage />}

        <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          laylaa &nbsp;·&nbsp; Built on Midnight &nbsp;·&nbsp; Powered by XRPL &nbsp;·&nbsp; Curated with Soul
        </footer>
      </main>

      <XamanModal />
    </div>
  );
}

function ConnectionChip({ label, on, detail }: { label: string; on: boolean; detail: string }) {
  return (
    <span className={cn(
      'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      on
        ? 'border-accent/50 bg-accent/10 text-foreground'
        : 'border-border bg-card text-muted-foreground',
    )}>
      {on && <CheckCircle2 className="h-3 w-3 text-accent" />}
      {label}
      <span className="font-mono opacity-60">{detail}</span>
    </span>
  );
}
