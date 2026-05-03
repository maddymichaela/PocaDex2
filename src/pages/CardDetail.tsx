import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Edit3, Copy, Heart, Truck, Plus } from 'lucide-react';
import { formatPhotocardMembers, getPhotocardCategory, Photocard } from '../types';
import { placeholderImage } from '../lib/assets';
import { fetchWishlistCountForCard } from '../lib/social';

interface CardDetailProps {
  photocard: Photocard;
  onBack: () => void;
  onEdit: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isOwner?: boolean;
  onAddToCollection?: (card: Photocard) => void;
  onRequireAuth?: () => void;
  isInCollection?: boolean;
}

export default function CardDetail({
  photocard,
  onBack,
  onEdit,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  isOwner = true,
  onAddToCollection,
  onRequireAuth,
  isInCollection = false,
}: CardDetailProps) {
  const category = getPhotocardCategory(photocard);
  const memberLabel = formatPhotocardMembers(photocard);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    fetchWishlistCountForCard(photocard)
      .then((count) => {
        if (isCurrent) setWishlistCount(count);
      })
      .catch(() => {
        if (isCurrent) setWishlistCount(0);
      });
    return () => {
      isCurrent = false;
    };
  }, [photocard]);

  return (
    <div className="bg-gray-50/30">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-2 py-2 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-0.5">
            <button
              onClick={onBack}
              className="group flex items-center gap-1.5 rounded-xl px-2 py-2 transition-all hover:bg-gray-100 md:gap-2 md:rounded-2xl md:px-4"
            >
              <ChevronLeft size={18} className="shrink-0 text-foreground/40 transition-colors group-hover:text-primary md:size-6" />
              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-foreground/40 group-hover:text-foreground sm:text-[10px] sm:tracking-[0.2em]">
                Back<span className="hidden sm:inline"> to Binder</span>
              </span>
            </button>

            <div className="ml-0.5 flex items-center gap-0.5 border-l border-gray-100 pl-1 md:ml-1">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous card"
                className="rounded-xl p-1.5 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-25 md:p-2"
              >
                <ChevronLeft size={16} className="text-foreground/50" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next card"
                className="rounded-xl p-1.5 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-25 md:p-2"
              >
                <ChevronRight size={16} className="text-foreground/50" />
              </button>
            </div>
          </div>

          {isOwner ? (
            <button
              onClick={onEdit}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-primary/20 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-primary shadow-sm transition-all hover:bg-primary hover:text-white sm:text-[10px] sm:tracking-widest md:gap-2 md:px-5 md:py-2.5"
            >
              <Edit3 size={14} />
              Edit<span className="hidden sm:inline"> Card</span>
            </button>
          ) : (
            <button
              disabled={isInCollection}
              onClick={() => onAddToCollection ? onAddToCollection(photocard) : onRequireAuth?.()}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] shadow-sm sm:text-[10px] sm:tracking-widest md:gap-2 md:px-5 md:py-2.5 ${
                isInCollection
                  ? 'border-primary/15 bg-white text-primary ring-2 ring-primary/10'
                  : 'btn-primary-pink border-white/20'
              }`}
            >
              {!isInCollection && <Plus size={14} />}
              <span className="hidden sm:inline">{isInCollection ? 'In Collection' : 'Add to My Collection'}</span>
              <span className="sm:hidden">{isInCollection ? 'Saved' : 'Add'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-5 md:px-6 md:py-8 xl:p-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 xl:gap-20 items-start">

          {/* Left Column: Image */}
          <div className="md:col-span-5 md:sticky md:top-32">
            <div className="relative aspect-[650/1000] w-full rounded-[48px] overflow-hidden shadow-2xl border-[12px] border-white ring-1 ring-black/5 group">
              <img
                src={photocard.imageUrl || placeholderImage}
                className={`w-full h-full object-cover transition-all duration-500 ${!photocard.imageUrl ? 'scale-[1.02] opacity-20 blur-[1px]' : 'group-hover:scale-[1.03]'}`}
                referrerPolicy="no-referrer"
              />
              {!photocard.imageUrl && (
                <div className="absolute inset-2 flex flex-col items-center justify-center gap-5 rounded-[40px] border-[3px] border-dashed border-primary/20 bg-white/35 backdrop-blur-[1px]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-xl shadow-primary/10 ring-1 ring-primary/10">
                    <ImageIcon size={34} className="text-primary/35" />
                  </div>
                  <p className="font-heading text-2xl font-bold tracking-tight text-primary/45">No Photo Yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="md:col-span-7 flex flex-col gap-6 md:pt-4">

            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest">
                {photocard.group || 'SOLOIST'}
                <span className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
                {photocard.year}
              </div>
              <h1 className="break-words text-4xl font-bold tracking-tight text-foreground md:text-5xl">{memberLabel}</h1>
              <div className="h-1 w-20 bg-primary/60 rounded-full mt-4" />
            </div>

            {/* Status badges */}
            <div className="-mt-2 flex flex-wrap gap-2">
              {photocard.status === 'owned' && photocard.condition && (
                <span className="rounded-full bg-accent-green/15 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-accent-green">
                  {photocard.condition.replace(/_/g, ' ')}
                </span>
              )}
              {photocard.status === 'on_the_way' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/15 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-accent-blue">
                  <Truck className="h-3 w-3" /> On the way
                </span>
              )}
              {photocard.status === 'wishlist' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-secondary">
                  <Heart className="h-3 w-3 fill-current" /> Wishlist
                </span>
              )}
              {wishlistCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wishlist-red)]/10 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[var(--wishlist-red)]">
                  <Heart className="h-3 w-3 fill-current" /> Wishlisted by {wishlistCount} {wishlistCount === 1 ? 'collector' : 'collectors'}
                </span>
              )}
              {photocard.isDuplicate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary">
                  <Copy className="h-3 w-3" /> Duplicate
                </span>
              )}
            </div>

            {/* Details card — only renders fields that have values */}
            {(category || photocard.source || photocard.album || photocard.era || photocard.version || photocard.cardName) && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Category</div>
                    <p className="text-base font-medium text-foreground/85">{category}</p>
                  </div>
                  {category === 'Album' && photocard.album && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Album</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.album}</p>
                    </div>
                  )}
                  {category !== 'Album' && photocard.source && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Source</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.source}</p>
                    </div>
                  )}
                  {photocard.era && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Era</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.era}</p>
                    </div>
                  )}
                  {photocard.version && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Version</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.version}</p>
                    </div>
                  )}
                  {photocard.cardName && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Photocard Name</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.cardName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {photocard.notes && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-3xl p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-foreground uppercase tracking-wider">Notes</div>
                <p className="text-foreground/80 whitespace-pre-wrap">{photocard.notes}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
