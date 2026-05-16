import { useMemo, useState } from 'react';
import { Heart, Search, X } from 'lucide-react';
import { Photocard } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import { STATUS_COLORS } from '../lib/statusStyles';

interface WishlistProps {
  photocards: Photocard[];
  onCardClick: (pc: Photocard) => void;
  onFindCards: () => void;
  onRemoveFromWishlist: (pc: Photocard) => void;
}

export default function Wishlist({ photocards, onCardClick, onFindCards, onRemoveFromWishlist }: WishlistProps) {
  const [search, setSearch] = useState('');

  const wishlistCards = useMemo(() => (
    photocards
      .filter(card => card.status === 'wishlist')
      .filter(card => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          card.cardName.toLowerCase().includes(query) ||
          card.version.toLowerCase().includes(query) ||
          card.members.join(' ').toLowerCase().includes(query) ||
          (card.group?.toLowerCase().includes(query)) ||
          (card.album?.toLowerCase().includes(query)) ||
          (card.source?.toLowerCase().includes(query))
        );
      })
  ), [photocards, search]);

  return (
    <div className="flex w-full flex-col gap-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--wishlist-red)]">
            <Heart size={20} className="fill-current" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Wishlist</h1>
          </div>
          <p className="max-w-2xl text-sm font-medium leading-6 text-foreground/45">
            Keep track of the photocards you're still hunting for.
          </p>
          <p className="text-xs font-semibold text-foreground/35">
            Save cards from Find Cards or other collectors' profiles.
          </p>
        </div>

        <button
          type="button"
          onClick={onFindCards}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-[var(--wishlist-red)] shadow-sm ring-2 ring-[var(--wishlist-red)]/10 transition-all hover:bg-[var(--wishlist-red)] hover:text-white"
        >
          <Search size={15} />
          Find Cards
        </button>
      </div>

      <div className="rounded-[24px] border-2 border-[var(--wishlist-red)]/10 bg-white/70 px-5 py-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--wishlist-red)]">
          {wishlistCards.length.toLocaleString()} card{wishlistCards.length === 1 ? '' : 's'} in wishlist
        </p>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--wishlist-red)]" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search wishlist..."
          className="h-11 w-full rounded-2xl border-2 border-white bg-white/85 pl-10 pr-10 text-sm font-semibold outline-none shadow-sm transition-all placeholder:text-foreground/25 focus:border-[var(--wishlist-red)]/30"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-foreground/30 transition-all hover:bg-[var(--wishlist-red)]/10 hover:text-[var(--wishlist-red)]"
            aria-label="Clear wishlist search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {wishlistCards.length > 0 ? (
        <PhotocardGrid
          photocards={wishlistCards}
          onCardClick={onCardClick}
          getWishlistToggle={(card) => ({
            isWishlisted: true,
            onToggle: onRemoveFromWishlist,
            label: 'Remove from Wishlist',
          })}
        />
      ) : (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[40px] border-2 border-white bg-white/75 px-6 py-16 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[28px] bg-[var(--wishlist-red)]/10 text-[var(--wishlist-red)]">
            <Heart size={28} className="fill-current" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">No wishlist cards yet</h2>
          <p className="mt-3 max-w-md text-sm font-medium leading-6 text-foreground/45">
            Tap the heart on cards you want to remember.
          </p>
          <button
            type="button"
            onClick={onFindCards}
            className={`mt-7 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg ${STATUS_COLORS.wishlist.bgClass}`}
          >
            <Search size={15} />
            Find Cards
          </button>
        </div>
      )}
    </div>
  );
}
