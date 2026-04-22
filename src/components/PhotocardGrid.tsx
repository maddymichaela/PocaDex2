/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Heart, Copy, Truck } from 'lucide-react';
import { Photocard } from '../types';

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
      className={`glass-card rounded-[28px] p-2.5 sm:p-3 shadow-md flex flex-col gap-3 relative overflow-hidden group cursor-pointer border-2 transition-all hover:shadow-xl hover:shadow-primary/5 ${
        selectMode && isSelected ? 'border-primary ring-4 ring-primary/10' : 'border-white/50'
      } ${isWishlist ? 'opacity-90 grayscale-[0.2]' : ''}`}
    >
      {/* Selection UI */}
      {selectMode && (
        <div className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
          isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' : 'bg-white/80 border-white'
        }`}>
          {isSelected && (
            <svg viewBox="0 0 10 8" className="w-3 h-3 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round">
              <path d="M1 4l3 3 5-6" />
            </svg>
          )}
        </div>
      )}

      {/* Status Badges Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {isWishlist && (
          <div className="bg-red-400 text-white p-2 rounded-full shadow-lg scale-90 sm:scale-100">
            <Heart size={14} className="fill-current" />
          </div>
        )}
        {isOnTheWay && (
          <div className="bg-amber-400 text-white p-2 rounded-full shadow-lg scale-90 sm:scale-100">
            <Truck size={14} />
          </div>
        )}
        {isDuplicate && (
          <div className="bg-purple-400 text-white p-2 rounded-full shadow-lg scale-90 sm:scale-100">
            <Copy size={14} />
          </div>
        )}
      </div>
      
      {/* Photo Stage */}
      <div 
        className="w-full aspect-[1/1.5] rounded-2xl flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest font-medium overflow-hidden relative bg-white ring-1 ring-black/5"
      >
        <img 
          src={photocard.imageUrl || "/placeholder.png"} 
          alt={photocard.cardName} 
          className={`w-full h-full object-cover transition-transform duration-700 ${!selectMode && 'group-hover:scale-110'} ${!photocard.imageUrl ? 'opacity-70 contrast-75 brightness-110' : ''}`}
          referrerPolicy="no-referrer"
        />
        
        {/* Condition Badge (Over Photo) */}
        {!selectMode && conditionLabel && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 backdrop-blur text-[8px] font-black tracking-widest text-foreground rounded-lg shadow-sm border border-black/5">
            {conditionLabel}
          </div>
        )}

        {!photocard.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-center px-4 font-black italic text-primary/60 text-base drop-shadow-sm">{photocard.member}</span>
          </div>
        )}

        {/* Hover Gradient Mask */}
        {!selectMode && (
          <div className="absolute inset-0 from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>
      
      {/* Information Area */}
      <div className="px-1 pb-1 space-y-1">
        <div className="flex flex-col">
          {photocard.group && (
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-[0.15em] leading-relaxed pb-1">
              {photocard.group}
            </span>
          )}
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-foreground tracking-tight leading-none truncate">{photocard.member}</h3>
            <span className="text-[10px] font-black text-foreground/40 mt-1">{photocard.year}</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-bold text-foreground/50 uppercase tracking-widest italic line-clamp-1">
            {photocard.album}
            {photocard.era && <span className="opacity-60 ml-1">• {photocard.era}</span>}
          </div>
          <div className="text-[11px] font-medium text-foreground opacity-80 truncate uppercase tracking-tighter">
            {photocard.cardName} {photocard.version && `(${photocard.version})`}
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
  onToggle 
}: { 
  photocards: Photocard[], 
  onCardClick?: (pc: Photocard) => void,
  selectMode?: boolean,
  selectedIds?: string[],
  onToggle?: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6 animate-in fade-in duration-500 fill-mode-both">
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
