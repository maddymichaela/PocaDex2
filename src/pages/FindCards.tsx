import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Heart, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { PhotocardCard } from '../components/PhotocardGrid';
import { Photocard } from '../types';
import { getCardIdentity, PublicCardTemplate, searchPublicCardTemplates } from '../lib/social';

interface FindCardsProps {
  ownPhotocards: Photocard[];
  onCopyCard: (card: Photocard, status: 'owned' | 'wishlist') => Promise<void>;
}

export default function FindCards({ ownPhotocards, onCopyCard }: FindCardsProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicCardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResults(await searchPublicCardTemplates(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load results.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const timeout = window.setTimeout(runSearch, 300);
    return () => window.clearTimeout(timeout);
  }, [query, runSearch]);

  const ownedIdentitySet = new Set(ownPhotocards.filter((c) => c.status === 'owned').map(getCardIdentity));
  const wishlistIdentitySet = new Set(ownPhotocards.filter((c) => c.status === 'wishlist').map(getCardIdentity));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Find Cards</h1>
        <p className="text-sm font-medium text-foreground/45">
          Search public photocards to add to your binder.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="h-12 w-full rounded-2xl border-2 border-white bg-white/85 pl-11 pr-4 text-sm font-semibold outline-none shadow-sm transition-all placeholder:text-foreground/25 focus:border-primary/30"
            placeholder="Search by member, group, album, era, version…"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/35 select-none">
          <SlidersHorizontal size={13} />
          member · group · album/era · shop/event · version
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:max-lg:gap-4 xl:grid-cols-5 lg:gap-6">
          {results.map((result, index) => {
            const identity = getCardIdentity(result.card);
            const inCollection = ownedIdentitySet.has(identity);
            const inWishlist = wishlistIdentitySet.has(identity);
            return (
              <div key={result.identity} className="flex flex-col gap-2">
                <div className="relative">
                  {result.wishlistCount > 0 && (
                    <div className="absolute left-3 top-3 z-20 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--wishlist-red)] shadow-sm">
                      {result.wishlistCount} {result.wishlistCount === 1 ? 'wish' : 'wishes'}
                    </div>
                  )}
                  <PhotocardCard photocard={result.card} index={index} />
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={inCollection || busyId === `${result.identity}:owned`}
                    onClick={async () => {
                      setBusyId(`${result.identity}:owned`);
                      try { await onCopyCard(result.card, 'owned'); } finally { setBusyId(null); }
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-primary px-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all disabled:bg-white disabled:text-primary disabled:ring-2 disabled:ring-primary/15"
                  >
                    {inCollection ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                    {inCollection ? 'In Collection' : 'Collect'}
                  </button>
                  <button
                    type="button"
                    disabled={inWishlist || busyId === `${result.identity}:wishlist`}
                    onClick={async () => {
                      setBusyId(`${result.identity}:wishlist`);
                      try { await onCopyCard(result.card, 'wishlist'); } finally { setBusyId(null); }
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-[var(--wishlist-red)] px-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all disabled:bg-white disabled:text-[var(--wishlist-red)] disabled:ring-2 disabled:ring-red-100"
                  >
                    <Heart size={13} className={inWishlist ? 'fill-current' : undefined} />
                    {inWishlist ? 'Wishlisted' : 'Wishlist'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[36px] border-2 border-white bg-white/75 px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Search size={24} />
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground/30">
            {query.trim() ? 'No cards found.' : 'Search for photocards to add to your binder.'}
          </p>
        </div>
      )}
    </div>
  );
}
