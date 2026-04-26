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

  const ownedCount = photocards.filter(p => p.status === 'owned').length;
  const onTheWayCount = photocards.filter(p => p.status === 'on_the_way').length;
  const wishlistCount = photocards.filter(p => p.status === 'wishlist').length;
  const duplicateCount = photocards.filter(p => p.isDuplicate).length;

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
                    className="w-8 h-11 rounded-lg object-cover shrink-0 ring-1 ring-black/5"
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
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 tracking-tight">Recently Added</h2>
          <PhotocardGrid
            photocards={recentPhotocards}
            onCardClick={onEdit}
            layout="four-up"
          />
        </div>

        <div className="glass-card p-10 rounded-[32px] border-2 border-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h3 className="text-sm font-bold text-foreground mb-6 tracking-tight opacity-60">Collection Progress</h3>
          <div className="w-full h-6 bg-white/50 rounded-full border-2 border-white overflow-hidden p-1 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg shadow-primary/20 transition-all duration-1000"
              style={{ width: `${Math.min(Math.round((ownedCount / 2000) * 100), 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-4 text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">
            <span>{ownedCount.toLocaleString()} Added</span>
            <span className="text-secondary">{Math.round((ownedCount / 2000) * 100)}% Complete</span>
            <span>2,000 Target</span>
          </div>
        </div>

        <BackupControls photocards={photocards} onImport={onImport} />
      </div>
    </div>
  );
}
