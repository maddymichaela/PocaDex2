/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Heart, Copy, Truck } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Photocard } from '../types';
import { placeholderImage } from '../lib/assets';

interface PhotocardCardProps {
  photocard: Photocard;
  index?: number;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (pc: Photocard) => void;
  key?: string;
}

export function PhotocardCard({
  photocard,
  index = 0,
  selectMode = false,
  isSelected = false,
  onToggle,
  onClick
}: PhotocardCardProps) {
  const isWishlist = photocard.status === 'wishlist';
  const isOnTheWay = photocard.status === 'on_the_way';
  const isDuplicate = !!photocard.isDuplicate;
  const delay = Math.min(index * 0.05, 0.5);
  const [hasImageError, setHasImageError] = useState(false);
  const showPlaceholder = !photocard.imageUrl || hasImageError;

  useEffect(() => {
    setHasImageError(false);
  }, [photocard.imageUrl]);

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case 'mint': return 'MINT';
      case 'near_mint': return 'N.MINT';
      case 'good': return 'GOOD';
      case 'damaged': return 'DMG';
      default: return condition?.toUpperCase() || null;
    }
  };

  const conditionLabel = getConditionLabel(photocard.condition);

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
      className={`glass-card rounded-[28px] shadow-md flex flex-col relative overflow-hidden group cursor-pointer border-2 transition-all hover:shadow-xl hover:shadow-primary/5 ${selectMode && isSelected ? 'border-primary ring-4 ring-primary/10' : 'border-white/50'
        } ${isWishlist ? 'opacity-90 grayscale-[0.2]' : ''}`}
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
          <div className="bg-red-400 text-white p-2 rounded-full shadow-xl scale-90 md:scale-100">
            <Heart size={14} className="fill-current" />
          </div>
        )}
        {isOnTheWay && (
          <div className="bg-amber-400 text-white p-2 rounded-full shadow-xl scale-90 md:scale-100">
            <Truck size={14} />
          </div>
        )}
        {isDuplicate && (
          <div className="bg-purple-400 text-white p-2 rounded-full shadow-xl scale-90 md:scale-100">
            <Copy size={14} />
          </div>
        )}
      </div>

      {/* Photo Stage */}
      <div
        className="w-full aspect-[1/1.5] rounded-t-[26px] flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest font-medium overflow-hidden relative bg-white ring-1 ring-black/5"
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
              {photocard.member}
            </span>
          </div>
        )}

        {/* Hover Gradient Mask */}
        {!selectMode && (
          <div className="absolute inset-0 from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>

      {/* Information Area */}
      <div className="px-3 pb-3 pt-3 md:px-4 md:pb-4 space-y-1">
        <div className="flex flex-col">
          {photocard.group && (
            <span className="text-[11px] font-semibold text-primary/70 leading-relaxed pb-1 truncate">
              {photocard.group}
            </span>
          )}
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-foreground leading-none truncate">{photocard.member}</h3>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="text-xs font-medium text-foreground/50 line-clamp-1">
            {photocard.album}
            {photocard.era && <span className="opacity-60 ml-1">• {photocard.era}</span>}
          </div>
          <div className="text-xs font-medium text-foreground/80 truncate tracking-normal">
            {photocard.cardName}
            {photocard.version && <span className="text-foreground/50"> • {photocard.version}</span>}
          </div>
        </div>
      </div>
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
      className={`grid gap-3 md:gap-6 animate-in fade-in duration-500 fill-mode-both ${layout === 'auto-fit'
        ? 'grid-cols-1 md:grid-cols-2'
        : layout === 'four-up'
          ? 'grid-cols-2 xl:grid-cols-4'
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
