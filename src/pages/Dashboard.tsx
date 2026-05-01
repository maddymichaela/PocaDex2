/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Photocard } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import { Sidebar } from '../components/Sidebar';
import BackupControls from '../components/BackupControls';

interface DashboardProps {
  photocards: Photocard[];
  onEdit: (pc: Photocard) => void;
  onDelete: (id: string) => void;
  onImport: (newData: Photocard[], mode: 'replace' | 'merge') => void;
}

export default function Dashboard({ photocards, onEdit, onDelete, onImport }: DashboardProps) {
  const recentPhotocards = useMemo(() =>
    [...photocards].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
    [photocards]
  );

  const totalCards = photocards.length;
  const ownedCount = photocards.filter(p => p.status === 'owned').length;
  const onTheWayCount = photocards.filter(p => p.status === 'on_the_way').length;
  const wishlistCount = photocards.filter(p => p.status === 'wishlist').length;
  const duplicateCount = photocards.filter(p => p.isDuplicate).length;
  const hasCards = totalCards > 0;

  const progressSegments = [
    { key: 'owned', label: 'Owned', count: ownedCount, colorClass: 'bg-primary' },
    { key: 'on-the-way', label: 'On the Way', count: onTheWayCount, colorClass: 'bg-secondary' },
    { key: 'wishlist', label: 'Wishlist', count: wishlistCount, colorClass: 'bg-foreground/25' },
  ].map(segment => ({
    ...segment,
    percentage: totalCards > 0 ? (segment.count / totalCards) * 100 : 0,
  }));

  const visibleProgressSegments = progressSegments.filter(segment => segment.count > 0);
  const duplicatePercentage = totalCards > 0 ? (duplicateCount / totalCards) * 100 : 0;
  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  const stats = {
    totalCollected: ownedCount,
    onTheWay: onTheWayCount,
    wishlistGoals: wishlistCount,
    duplicates: duplicateCount,
    collectionValue: ownedCount * 25,
  };

  const groupStats = useMemo(() => {
    const map = new Map<string, { count: number; imageUrl?: string }>();
    photocards.forEach(pc => {
      if (!pc.group) return;
      const existing = map.get(pc.group) || { count: 0 };
      map.set(pc.group, {
        count: existing.count + 1,
        imageUrl: existing.imageUrl || pc.imageUrl,
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [photocards]);

  return (
    <div className="flex flex-col gap-8 w-full">
      <Sidebar stats={stats} />

      {/* Groups */}
      {groupStats.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4 tracking-tight">My Groups</h2>
          <div className="flex flex-wrap gap-3">
            {groupStats.map(g => (
              <div
                key={g.name}
                className="glass-card rounded-2xl border-2 border-white shadow-sm flex items-center gap-3 px-4 py-3"
              >
                {g.imageUrl && (
                  <img
                    src={g.imageUrl}
                    alt={g.name}
                    className="w-8 aspect-[650/1000] rounded-lg object-cover shrink-0 ring-1 ring-black/5"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <p className="font-bold text-foreground text-sm leading-none">{g.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mt-1">
                    {g.count} {g.count === 1 ? 'card' : 'cards'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {hasCards && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6 tracking-tight">Recently Added</h2>
            <PhotocardGrid
              photocards={recentPhotocards}
              onCardClick={onEdit}
              layout="four-up"
            />
          </div>
        )}

        {hasCards && (
          <div className="glass-card p-6 md:p-10 rounded-[32px] border-2 border-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-sm font-bold text-foreground tracking-tight opacity-60">Collection Progress</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {totalCards.toLocaleString()} Total {totalCards === 1 ? 'Card' : 'Cards'}
                </p>
              </div>

              <div className="relative w-full h-7 bg-white/60 rounded-full border-2 border-white overflow-hidden p-1 shadow-inner">
                <div className="flex h-full w-full overflow-hidden rounded-full bg-white/60">
                  {visibleProgressSegments.map(segment => (
                    <div
                      key={segment.key}
                      className={`${segment.colorClass} h-full min-w-3 transition-all duration-1000`}
                      style={{ flexBasis: `${segment.percentage}%` }}
                      title={`${segment.label}: ${segment.count.toLocaleString()} (${formatPercentage(segment.percentage)})`}
                    />
                  ))}
                </div>
                {duplicateCount > 0 && (
                  <div
                    className="absolute bottom-1 left-1 h-1 rounded-full bg-foreground/25"
                    style={{ width: `${duplicatePercentage}%`, maxWidth: 'calc(100% - 0.5rem)' }}
                    title={`Duplicates: ${duplicateCount.toLocaleString()} (${formatPercentage(duplicatePercentage)})`}
                  />
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {progressSegments.map(segment => (
                  <div key={segment.key} className="flex items-center gap-2 min-w-0">
                    <span className={`h-3 w-3 rounded-full ${segment.colorClass} shrink-0`} />
                    <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-foreground/45">
                      {segment.label} ({segment.count.toLocaleString()})
                    </span>
                    {segment.count > 0 && (
                      <span className="ml-auto shrink-0 text-[10px] font-black text-foreground/35">
                        {formatPercentage(segment.percentage)}
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-3 w-3 rounded-full bg-foreground/25 ring-2 ring-white shrink-0" />
                  <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-foreground/45">
                    Duplicates ({duplicateCount.toLocaleString()})
                  </span>
                  {duplicateCount > 0 && (
                    <span className="ml-auto shrink-0 text-[10px] font-black text-foreground/35">
                      {formatPercentage(duplicatePercentage)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <BackupControls photocards={photocards} onImport={onImport} />
      </div>
    </div>
  );
}
