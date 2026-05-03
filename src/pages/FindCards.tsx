import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PhotocardCard } from '../components/PhotocardGrid';
import PublicCardAction, { getPublicCardActionState } from '../components/PublicCardAction';
import { Photocard } from '../types';
import { PublicCardTemplate, searchPublicCardTemplates } from '../lib/social';
import { getCollectionMatchState } from '../lib/ownership';

const GLOBAL_SEARCH_STATE_KEY = 'pocadex:global-search-state:v1';

interface StoredGlobalSearchState {
  query: string;
  results: PublicCardTemplate[];
  scrollTop: number;
}

function readStoredGlobalSearchState(): StoredGlobalSearchState {
  if (typeof window === 'undefined') return { query: '', results: [], scrollTop: 0 };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(GLOBAL_SEARCH_STATE_KEY) || '{}') as Partial<StoredGlobalSearchState>;
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      results: Array.isArray(parsed.results) ? parsed.results : [],
      scrollTop: typeof parsed.scrollTop === 'number' ? parsed.scrollTop : 0,
    };
  } catch {
    return { query: '', results: [], scrollTop: 0 };
  }
}

function getSearchScrollContainer() {
  return document.querySelector('main') as HTMLElement | null;
}

export function clearGlobalSearchState(reason = 'left Find Cards flow') {
  if (typeof window === 'undefined') return;
  const stored = readStoredGlobalSearchState();
  window.sessionStorage.removeItem(GLOBAL_SEARCH_STATE_KEY);
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug('[PocaDex global search state debug]', {
      stateClearedWhenNavigatingAwayFromFindCards: true,
      reason,
      clearedQuery: stored.query,
      clearedResultCount: stored.results.length,
    });
  }
}

interface FindCardsProps {
  currentUserId?: string | null;
  ownPhotocards: Photocard[];
  onOpenCard?: (card: Photocard, visibleCards?: Photocard[]) => void;
  onAddToCollection: (card: Photocard) => void;
  onRequireAuth?: () => void;
}

export default function FindCards({ currentUserId, ownPhotocards, onOpenCard, onAddToCollection, onRequireAuth }: FindCardsProps) {
  const [query, setQuery] = useState(() => readStoredGlobalSearchState().query);
  const [results, setResults] = useState<PublicCardTemplate[]>(() => readStoredGlobalSearchState().results);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRequestIdRef = useRef(0);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextResults = await searchPublicCardTemplates(trimmed);
      if (searchRequestIdRef.current === requestId) setResults(nextResults);
    } catch (err) {
      if (searchRequestIdRef.current === requestId) setError(err instanceof Error ? err.message : 'Could not load results.');
    } finally {
      if (searchRequestIdRef.current === requestId) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      searchRequestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }
    const timeout = window.setTimeout(runSearch, 300);
    return () => window.clearTimeout(timeout);
  }, [query, runSearch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = readStoredGlobalSearchState();
    window.sessionStorage.setItem(GLOBAL_SEARCH_STATE_KEY, JSON.stringify({
      query,
      results,
      scrollTop: current.scrollTop,
    }));
  }, [query, results]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readStoredGlobalSearchState();
    window.setTimeout(() => {
      const scrollContainer = getSearchScrollContainer();
      if (scrollContainer) scrollContainer.scrollTop = stored.scrollTop;
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
        console.debug('[PocaDex global search state debug] restored search state after back', {
          queryRestoredAfterBackToSearch: stored.query,
          resultCountRestoredAfterBackToSearch: stored.results.length,
          restoredScrollTop: stored.scrollTop,
        });
      }
    }, 0);
  }, []);

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

      {loading && results.length === 0 ? (
        <div className="flex h-56 items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:max-lg:gap-4 xl:grid-cols-5 lg:gap-6">
          {results.map((result, index) => {
            const ownCard = getCollectionMatchState(result.card, ownPhotocards, currentUserId).matchedOwnedCard;
            const displayCard = ownCard ?? result.card;
            const visibleCards = results.map((nextResult) => {
              return getCollectionMatchState(nextResult.card, ownPhotocards, currentUserId).matchedOwnedCard ?? nextResult.card;
            });
            const actionState = getPublicCardActionState(displayCard, currentUserId, ownPhotocards);
            const handleOpenCard = (card: Photocard) => {
              const scrollTop = getSearchScrollContainer()?.scrollTop ?? 0;
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(GLOBAL_SEARCH_STATE_KEY, JSON.stringify({ query, results, scrollTop }));
              }
              if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
                console.debug('[PocaDex global search state debug] search state before card click', {
                  queryBeforeClickingCard: query,
                  resultCountBeforeClickingCard: results.length,
                  detailOpenedFromSource: 'global-search',
                  openedCardId: card.id,
                  scrollTop,
                });
              }
              onOpenCard?.(card, visibleCards);
            };
            if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
              console.debug('[PocaDex global search layout/action debug]', {
                identity: result.identity,
                cardId: displayCard.id,
                cardOwnerId: displayCard.ownerUserId,
                currentUserId,
                isOwnCard: actionState.isOwner,
                alreadyInCollection: actionState.alreadyInCollection,
                renderedActionLabel: actionState.actionLabel,
                cardHeightClassComponentUsed: 'PhotocardCard shared binder layout with global-search actionFooter',
                category: displayCard.category,
                source: displayCard.source,
              });
              console.debug('[PocaDex GLOBAL SEARCH RESULT DEBUG]', {
                id: displayCard.id,
                category: displayCard.category,
                album: displayCard.album,
                albumName: (displayCard as Photocard & Record<string, unknown>).albumName,
                source: displayCard.source,
                sourceName: (displayCard as Photocard & Record<string, unknown>).sourceName,
                shop: (displayCard as Photocard & Record<string, unknown>).shop,
                event: (displayCard as Photocard & Record<string, unknown>).event,
                card: displayCard,
              });
              console.debug('[PocaDex global search card display debug] mapped global search card props', {
                identity: result.identity,
                searchCard: result.card,
                displayCard,
                category: displayCard.category,
                album: displayCard.album,
                source: displayCard.source,
                era: displayCard.era,
                version: displayCard.version,
                cardName: displayCard.cardName,
              });
            }
            return (
              <div key={result.identity} className="relative h-full">
                  {result.wishlistCount > 0 && (
                    <div className="absolute left-3 top-3 z-20 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--wishlist-red)] shadow-sm">
                      {result.wishlistCount} {result.wishlistCount === 1 ? 'wish' : 'wishes'}
                    </div>
                  )}
                  <PhotocardCard
                    photocard={displayCard}
                    index={index}
                    onClick={handleOpenCard}
                    context="global-search"
                    actionFooter={(
                      <PublicCardAction
                        card={displayCard}
                        currentUserId={currentUserId}
                        ownPhotocards={ownPhotocards}
                        onAddToCollection={onAddToCollection}
                        onRequireAuth={onRequireAuth ?? (() => setError('Sign in or create an account to add cards to your collection.'))}
                        className="h-10 w-full rounded-xl bg-primary/95 text-[8px] shadow-sm backdrop-blur disabled:bg-white/95"
                      />
                    )}
                  />
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
