/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';

interface StatCardProps {
  label: string;
  value: string | number;
  highlightColor?: string;
  isWishlist?: boolean;
}

export function StatCard({ label, value, highlightColor, isWishlist }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`glass-card p-5 rounded-3xl shadow-sm border-2 transition-all hover:shadow-md active:scale-95 ${
        isWishlist ? 'border-secondary/20' : 'border-card/50'
      }`}
    >
      {/* Label uses Outfit (sans) — small, uppercase, muted */}
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </div>
      {/* Value uses Jua (serif) — display weight, visually distinctive */}
      <div
        className="text-3xl leading-none font-serif tracking-tight"
        style={{ color: highlightColor ? highlightColor : 'hsl(var(--foreground))' }}
      >
        {value}
      </div>
    </motion.div>
  );
}

export function Sidebar({ stats }: { stats: any }) {
  return (
    <aside className="w-full lg:w-60 flex flex-col gap-4 shrink-0">
      <StatCard
        label="Owned"
        value={stats.totalCollected.toLocaleString()}
        highlightColor="hsl(var(--accent-green))"
      />
      <StatCard
        label="On The Way"
        value={stats.onTheWay.toLocaleString()}
        highlightColor="hsl(var(--accent-blue))"
      />
      <StatCard
        label="Wishlist"
        value={stats.wishlistGoals}
        isWishlist
      />
      <StatCard
        label="Duplicates"
        value={stats.duplicates || 0}
        highlightColor="hsl(var(--secondary))"
      />
      <StatCard
        label="Est. Value"
        value={`$${stats.collectionValue.toLocaleString()}`}
        highlightColor="hsl(var(--primary))"
      />
    </aside>
  );
}
