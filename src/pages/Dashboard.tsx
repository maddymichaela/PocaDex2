/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Photocard, CollectionStats, getPhotocardMembers } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import { Sidebar } from '../components/Sidebar';
import BackupControls from '../components/BackupControls';
import { STATUS_COLORS } from '../lib/statusStyles';

interface DashboardProps {
  photocards: Photocard[];
  onEdit: (pc: Photocard) => void;
  onImport: (newData: Photocard[], mode: 'replace' | 'merge') => void;
}

export default function Dashboard({ photocards, onEdit, onImport }: DashboardProps) {
  const softPrimaryMix = 'color-mix(in oklab, var(--color-primary) 70%, transparent)';
  const mostCollectedBarClass = 'bg-sky-300/70';

  const recentPhotocards = useMemo(() =>
    [...photocards].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
    [photocards]
  );

  const ownedCount = photocards.filter(p => p.status === 'owned').length;
  const onTheWayCount = photocards.filter(p => p.status === 'on_the_way').length;
  const wishlistCount = photocards.filter(p => p.status === 'wishlist').length;
  const duplicateCount = photocards.filter(p => p.isDuplicate).length;
  const totalCards = ownedCount + onTheWayCount + wishlistCount;
  const hasCards = totalCards > 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cardsAddedThisWeek = photocards.filter(p => p.createdAt >= weekAgo).length;

  const progressSegments = [
    { key: 'owned', label: 'Owned', count: ownedCount, colorClass: '', colorStyle: softPrimaryMix },
    { key: 'on-the-way', label: 'On the Way', count: onTheWayCount, colorClass: STATUS_COLORS.onTheWay.bgClass },
    { key: 'wishlist', label: 'Wishlist', count: wishlistCount, colorClass: STATUS_COLORS.wishlist.bgClass },
  ].map(segment => ({
    ...segment,
    percentage: totalCards > 0 ? (segment.count / totalCards) * 100 : 0,
  }));

  const visibleProgressSegments = progressSegments.filter(segment => segment.count > 0);
  const duplicatePercentage = totalCards > 0 ? (duplicateCount / totalCards) * 100 : 0;
  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  const stats: CollectionStats = {
    totalCollected: ownedCount,
    onTheWay: onTheWayCount,
    wishlistGoals: wishlistCount,
    duplicates: duplicateCount,
    collectionValue: ownedCount * 25,
    cardsAddedThisWeek,
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

  const memberCompletion = useMemo(() => {
    const map = new Map<string, { owned: number; onTheWay: number; wishlist: number }>();
    photocards.forEach((card) => {
      const members = getPhotocardMembers(card);
      members.forEach((member) => {
        const current = map.get(member) ?? { owned: 0, onTheWay: 0, wishlist: 0 };
        if (card.status === 'owned') current.owned += 1;
        if (card.status === 'on_the_way') current.onTheWay += 1;
        if (card.status === 'wishlist') current.wishlist += 1;
        map.set(member, current);
      });
    });

    return Array.from(map.entries())
      .map(([member, counts]) => {
        const secured = counts.owned + counts.onTheWay;
        const total = secured + counts.wishlist;
        return {
          member,
          secured,
          total,
          percentage: total > 0 ? (secured / total) * 100 : 0,
        };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total || b.percentage - a.percentage || a.member.localeCompare(b.member))
      .slice(0, 8);
  }, [photocards]);

  const mostCollectedMembers = useMemo(() => {
    const weights = new Map<string, number>();
    photocards
      .filter(card => card.status === 'owned' || card.status === 'on_the_way')
      .forEach((card) => {
        const members = getPhotocardMembers(card);
        if (members.length === 0) return;
        const weight = 1 / members.length;
        members.forEach((member) => {
          weights.set(member, (weights.get(member) ?? 0) + weight);
        });
      });

    const totalWeight = Array.from(weights.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(weights.entries())
      .map(([member, weight]) => ({
        member,
        weight,
        percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage || a.member.localeCompare(b.member))
      .slice(0, 8);
  }, [photocards]);

  const formatWeightedCount = (value: number) => (
    Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 })
  );

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
                      className={`${segment.colorClass} h-full shrink-0 transition-all duration-1000`}
                      style={{
                        flex: `0 0 ${segment.percentage}%`,
                        ...(segment.colorStyle ? { backgroundColor: segment.colorStyle } : {}),
                      }}
                      title={`${segment.label}: ${segment.count.toLocaleString()} (${formatPercentage(segment.percentage)})`}
                    />
                  ))}
                </div>
                {duplicateCount > 0 && (
                  <div
                    className="absolute inset-y-1 right-1 rounded-r-full border-l border-white/60 opacity-70"
                    style={{
                      width: `min(${duplicatePercentage}%, calc(100% - 0.5rem))`,
                      backgroundColor: STATUS_COLORS.duplicates.css,
                      backgroundImage: 'repeating-linear-gradient(135deg, rgba(40, 23, 54, 0.18) 0 4px, rgba(255, 255, 255, 0.22) 4px 8px)',
                    }}
                    title={`Duplicates: ${duplicateCount.toLocaleString()}`}
                  />
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {progressSegments.map(segment => (
                  <div key={segment.key} className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-3 w-3 rounded-full ${segment.colorClass} shrink-0`}
                      style={segment.colorStyle ? { backgroundColor: segment.colorStyle } : undefined}
                    />
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
                  <span className={`h-3 w-3 rounded-full ${STATUS_COLORS.duplicates.bgClass} ring-2 ring-white shrink-0`} />
                  <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-foreground/45">
                    Duplicates ({duplicateCount.toLocaleString()})
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {(memberCompletion.length > 0 || mostCollectedMembers.length > 0) && (
          <div className="grid gap-5 lg:grid-cols-2">
            {memberCompletion.length > 0 && (
              <section className="glass-card rounded-[28px] border-2 border-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Completion by Member</h3>
                  <p className="text-xs font-semibold text-foreground/40">Owned and on-the-way progress against each member wishlist.</p>
                </div>
                <div className="grid gap-3">
                  {memberCompletion.map(item => (
                    <div key={item.member} className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-black text-foreground">{item.member}</span>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                          {item.secured.toLocaleString()}/{item.total.toLocaleString()} · {formatPercentage(item.percentage)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/70">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: softPrimaryMix,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {mostCollectedMembers.length > 0 && (
              <section className="glass-card rounded-[28px] border-2 border-white p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">Most Collected Members</h3>
                  <p className="text-xs font-semibold text-foreground/40">Share of owned and on-the-way cards.</p>
                </div>
                <div className="grid gap-3">
                  {mostCollectedMembers.map(item => (
                    <div key={item.member} className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-black text-foreground">{item.member}</span>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                          {formatPercentage(item.percentage)} · {formatWeightedCount(item.weight)} cards
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/70">
                        <div className={`${mostCollectedBarClass} h-full rounded-full`} style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <BackupControls photocards={photocards} onImport={onImport} />
      </div>
    </div>
  );
}
