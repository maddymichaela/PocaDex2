/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Heart, Copy, Truck } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatPhotocardMembers, getPhotocardCategory, Photocard } from '../types';
import { placeholderImage } from '../lib/assets';
import { STATUS_COLORS } from '../lib/statusStyles';

interface PhotocardCardProps {
  photocard: Photocard;
  index?: number;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (pc: Photocard) => void;
  infoMode?: 'default' | 'public-profile';
  context?: 'binder' | 'global-search' | 'public-profile';
  actionFooter?: ReactNode;
  className?: string;
  key?: string;
}

function compactUnique(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values
    .map(value => value?.trim())
    .filter((value): value is string => {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function PhotocardCard({
  photocard,
  index = 0,
  selectMode = false,
  isSelected = false,
  onToggle,
  onClick,
  infoMode = 'default',
  context = 'binder',
  actionFooter,
  className = '',
}: PhotocardCardProps) {
  const isWishlist = photocard.status === 'wishlist';
  const isOnTheWay = photocard.status === 'on_the_way';
  const isDuplicate = !!photocard.isDuplicate;
  const delay = Math.min(index * 0.05, 0.5);
  const [hasImageError, setHasImageError] = useState(false);
  const showPlaceholder = !photocard.imageUrl || hasImageError;
  const hasAlbum = !!photocard.album?.trim();
  const hasSource = !!photocard.source?.trim();
  const hasEra = !!photocard.era?.trim();
  const category = getPhotocardCategory(photocard);
  const memberLabel = formatPhotocardMembers(photocard);
  const sourceOrAlbum = category === 'Album' ? photocard.album : photocard.source;
  const metadataParts = compactUnique([category, sourceOrAlbum, photocard.era]);
  const publicProfileDetail = compactUnique([sourceOrAlbum, photocard.cardName]).join(' · ');

  useEffect(() => {
    setHasImageError(false);
  }, [photocard.imageUrl]);

  useEffect(() => {
    if (context !== 'global-search' || !(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return;
    const cardOwnerId = photocard.ownerUserId ?? (photocard as Photocard & { user_id?: unknown; userId?: unknown }).user_id ?? (photocard as Photocard & { userId?: unknown }).userId;
    console.debug('[PocaDex global search layout/action debug]', {
      cardId: photocard.id,
      cardOwnerId,
      cardHeightClassComponentUsed: 'PhotocardCard shared binder layout with footer slot',
      imageAreaClass: 'aspect-[650/1000]',
      contentAreaClass: 'min-h-[82px] md:min-h-[90px]',
      footerAreaClass: actionFooter ? 'min-h-[52px] px-3 pb-3 md:px-4 md:pb-4' : null,
    });
  }, [actionFooter, context, photocard]);

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case 'mint': return 'MINT';
      case 'near_mint': return 'N.MINT';
      case 'good': return 'GOOD';
      case 'damaged': return 'DMG';
      default: return condition?.toUpperCase() || null;
    }
  };

  const conditionLabel = photocard.status === 'owned' ? getConditionLabel(photocard.condition) : null;
  const statusCardClass = isWishlist
    ? 'border-[var(--wishlist-red)]/25 bg-white/55 opacity-85 grayscale-[0.18] shadow-[0_8px_24px_rgba(248,113,113,0.08)]'
    : isOnTheWay
      ? 'border-accent-blue/40 bg-[color-mix(in_srgb,var(--accent-blue)_12%,white)] shadow-[0_8px_24px_rgba(125,190,220,0.14)]'
      : 'border-white/50';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={!selectMode ? { y: -8, rotate: -1 } : { scale: 0.98 }}
      onClick={() => {
        if (selectMode && onToggle) {
          onToggle(photocard.id);
        } else if (onClick) {
          onClick(photocard);
        }
      }}
      className={`glass-card rounded-[28px] shadow-md flex h-full flex-col relative overflow-hidden group cursor-pointer border-2 transition-all hover:shadow-xl hover:shadow-primary/5 ${selectMode && isSelected ? 'border-primary ring-4 ring-primary/10' : statusCardClass} ${className}`}
    >
      {/* Selection UI */}
      {selectMode && (
        <div className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110' : 'bg-white/80 border-white'
          }`}>
          {isSelected && (
            <svg viewBox="0 0 10 8" className="w-3 h-3 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round">
              <path d="M1 4l3 3 5-6" />
            </svg>
          )}
        </div>
      )}

      {/* Status Badges Overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {isWishlist && (
          <div className={`${STATUS_COLORS.wishlist.bgClass} text-white p-2 rounded-full shadow-xl shadow-red-300/20 scale-90 md:scale-100`} title="Wishlist">
            <Heart size={14} className="fill-current" />
          </div>
        )}
        {isOnTheWay && (
          <div className={`${STATUS_COLORS.onTheWay.bgClass} text-white p-2 rounded-full shadow-xl shadow-sky-300/20 scale-90 md:scale-100`} title="On the Way">
            <Truck size={14} />
          </div>
        )}
        {isDuplicate && (
          <div className={`${STATUS_COLORS.duplicates.bgClass} text-white p-2 rounded-full shadow-xl scale-90 md:scale-100`}>
            <Copy size={14} />
          </div>
        )}
      </div>

      {/* Photo Stage */}
      <div
        className="w-full aspect-[650/1000] rounded-t-[26px] flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest font-medium overflow-hidden relative bg-white ring-1 ring-black/5"
      >
        <img
          src={showPlaceholder ? placeholderImage : photocard.imageUrl}
          alt={photocard.cardName}
          className={`w-full h-full object-cover transition-transform duration-700 ${!selectMode && 'group-hover:scale-110'} ${showPlaceholder ? 'opacity-100 brightness-100 saturate-110' : ''}`}
          onError={() => setHasImageError(true)}
          loading={index < 8 ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={index < 4 ? 'high' : 'auto'}
          referrerPolicy="no-referrer"
        />

        {/* Condition Badge (Over Photo) */}
        {!selectMode && conditionLabel && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-white/90 backdrop-blur text-[8px] font-black tracking-widest text-foreground rounded-xl shadow-sm border border-black/5">
            {conditionLabel}
          </div>
        )}

        {showPlaceholder && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-center px-4 font-black italic text-primary/70 text-base drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {memberLabel}
            </span>
          </div>
        )}

        {/* Hover Gradient Mask */}
        {!selectMode && (
          <div className="absolute inset-0 from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Information Area */}
      <div className="flex min-h-[82px] flex-col justify-start px-3 pb-3 pt-3 md:min-h-[90px] md:px-4 md:pb-4 space-y-1">
        <div className="flex flex-col">
          {photocard.group && (
            <span className="text-[11px] font-semibold text-primary/70 leading-relaxed pb-1 truncate">
              {photocard.group}
            </span>
          )}
          <div className="flex justify-between items-start">
            <h3 className="min-w-0 truncate text-xl font-bold leading-none text-foreground">{memberLabel}</h3>
          </div>
        </div>

        {infoMode === 'public-profile' ? (
          publicProfileDetail && (
            <div className="text-xs font-medium text-foreground/80 truncate tracking-normal">
              {publicProfileDetail}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-0.5">
            {metadataParts.length > 0 && (
              <div className="text-xs font-medium text-foreground/50 line-clamp-1">
                {metadataParts.map((part, partIndex) => (
                  <span key={`${part}-${partIndex}`} className={partIndex > 0 ? 'opacity-60' : undefined}>
                    {partIndex > 0 && <span className="mx-1">•</span>}
                    {part}
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs font-medium text-foreground/80 truncate tracking-normal">
              {photocard.cardName}
              {photocard.version && <span className="text-foreground/50"> • {photocard.version}</span>}
            </div>
          </div>
        )}
      </div>

      {actionFooter && (
        <div className="mt-auto min-h-[52px] px-3 pb-3 md:px-4 md:pb-4">
          {actionFooter}
        </div>
      )}
    </motion.div>
  );
}

export function PhotocardGrid({
  photocards,
  onCardClick,
  selectMode = false,
  selectedIds = [],
  onToggle,
  layout = 'fixed',
}: {
  photocards: Photocard[],
  onCardClick?: (pc: Photocard) => void,
  selectMode?: boolean,
  selectedIds?: string[],
  onToggle?: (id: string) => void,
  layout?: 'fixed' | 'auto-fit' | 'four-up'
}) {
  const gridStyle: CSSProperties | undefined =
    layout === 'auto-fit'
      ? { gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }
      : undefined;

  return (
    <div
      className={`grid gap-3 md:max-lg:gap-4 lg:gap-6 animate-in fade-in duration-500 fill-mode-both ${layout === 'auto-fit'
        ? 'grid-cols-1 md:grid-cols-2'
        : layout === 'four-up'
          ? 'grid-cols-2 md:max-lg:grid-cols-4 xl:grid-cols-4'
          : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5'
        }`}
      style={gridStyle}
    >
      {photocards.map((pc, index) => (
        <PhotocardCard
          key={pc.id}
          photocard={pc}
          index={index}
          onClick={onCardClick}
          selectMode={selectMode}
          isSelected={selectedIds.includes(pc.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
