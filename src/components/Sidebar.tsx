/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CollectionStats } from '../types';
import { STATUS_COLORS } from '../lib/statusStyles';

const SOFT_PRIMARY_MIX = 'color-mix(in oklab, var(--color-primary) 70%, transparent)';

interface StatCardProps {
  label: string;
  value: string | number;
  highlightColor?: string;
  isWishlist?: boolean;
}

export function StatCard({ label, value, highlightColor, isWishlist }: StatCardProps) {
  return (
    <div
      className={`glass-card p-6 rounded-3xl shadow-sm border-2 ${isWishlist ? 'border-secondary/20' : 'border-white/50'} h-fit`}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">
        {label}
      </div>
      <div
        className="text-3xl font-black text-foreground tracking-tighter"
        style={{ color: highlightColor ? highlightColor : 'inherit' }}
      >
        {value}
      </div>
    </div>
  );
}

export function Sidebar({ stats }: { stats: CollectionStats }) {
  return (
    <aside className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
      <StatCard
        label="Total Cards"
        value={(stats.totalCollected + stats.onTheWay + stats.wishlistGoals).toLocaleString()}
        highlightColor={SOFT_PRIMARY_MIX}
      />
      <StatCard
        label="Added This Week"
        value={(stats.cardsAddedThisWeek ?? 0).toLocaleString()}
        highlightColor={SOFT_PRIMARY_MIX}
      />
      <StatCard
        label="Wishlist"
        value={stats.wishlistGoals.toLocaleString()}
        highlightColor={STATUS_COLORS.wishlist.css}
        isWishlist
      />
      <StatCard
        label="On The Way"
        value={stats.onTheWay.toLocaleString()}
        highlightColor={STATUS_COLORS.onTheWay.css}
      />
      {/* <StatCard 
        label="Est. Value" 
        value={`$${stats.collectionValue.toLocaleString()}`} 
        highlightColor="var(--primary)" 
      /> */}
    </aside>
  );
}
