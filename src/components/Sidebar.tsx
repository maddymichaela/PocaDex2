/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { STATUS_COLORS } from '../lib/statusStyles';


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

export function Sidebar({ stats }: { stats: any }) {
  return (
    <aside className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
      <StatCard
        label="Owned"
        value={stats.totalCollected.toLocaleString()}
        highlightColor={STATUS_COLORS.owned.css}
      />
      <StatCard
        label="On The Way"
        value={stats.onTheWay.toLocaleString()}
        highlightColor={STATUS_COLORS.onTheWay.css}
      />
      <StatCard
        label="Wishlist"
        value={stats.wishlistGoals}
        highlightColor={STATUS_COLORS.wishlist.css}
        isWishlist
      />
      <StatCard
        label="Duplicates"
        value={stats.duplicates || 0}
        highlightColor={STATUS_COLORS.duplicates.css}
      />
      {/* <StatCard 
        label="Est. Value" 
        value={`$${stats.collectionValue.toLocaleString()}`} 
        highlightColor="var(--primary)" 
      /> */}
    </aside>
  );
}
