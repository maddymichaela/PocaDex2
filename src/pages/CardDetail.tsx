import { ChevronLeft, ChevronRight, Image as ImageIcon, Edit3, Copy, Heart, Truck } from 'lucide-react';
import { Photocard } from '../types';
import { placeholderImage } from '../lib/assets';

interface CardDetailProps {
  photocard: Photocard;
  onBack: () => void;
  onEdit: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function CardDetail({ photocard, onBack, onEdit, hasPrev, hasNext, onPrev, onNext }: CardDetailProps) {
  return (
    <div className="bg-gray-50/30">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={onBack}
              className="flex items-center gap-2 group px-4 py-2 hover:bg-gray-100 rounded-2xl transition-all"
            >
              <ChevronLeft className="text-foreground/40 group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground">Back to Binder</span>
            </button>

            <div className="flex items-center gap-0.5 pl-1 border-l border-gray-100 ml-1">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous card"
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} className="text-foreground/50" />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Next card"
                className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} className="text-foreground/50" />
              </button>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Edit3 size={14} />
            Edit Card
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-5 md:px-6 md:py-8 xl:p-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 xl:gap-20 items-start">

          {/* Left Column: Image */}
          <div className="md:col-span-5 md:sticky md:top-32">
            <div className="relative aspect-[1/1.5] w-full rounded-[48px] overflow-hidden shadow-2xl border-[12px] border-white ring-1 ring-black/5 group">
              <img
                src={photocard.imageUrl || placeholderImage}
                className={`w-full h-full object-cover transition-all duration-500 ${!photocard.imageUrl ? 'scale-[1.02] opacity-20 blur-[1px]' : 'group-hover:scale-[1.03]'}`}
                referrerPolicy="no-referrer"
              />
              {!photocard.imageUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 border-[3px] border-dashed border-transparent bg-gray-50">
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
              <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-none">{photocard.member}</h1>
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
              {photocard.isDuplicate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary">
                  <Copy className="h-3 w-3" /> Duplicate
                </span>
              )}
            </div>

            {/* Details card — only renders fields that have values */}
            {(photocard.album || photocard.era || photocard.version || photocard.cardName) && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-6">
                  {photocard.album && (
                    <div>
                      <div className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Album</div>
                      <p className="text-base font-medium text-foreground/85">{photocard.album}</p>
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
