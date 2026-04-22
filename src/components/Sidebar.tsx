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
      className={`glass-card p-6 rounded-3xl shadow-sm border-2 transition-all hover:shadow-md active:scale-95 ${isWishlist ? 'border-secondary/20' : 'border-white/50'
        } h-fit`}
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
    </motion.div>
  );
}

export function Sidebar({ stats }: { stats: any }) {
  return (
    <aside className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
      <StatCard
        label="Owned"
        value={stats.totalCollected.toLocaleString()}
        highlightColor="var(--accent-green)"
      />
      <StatCard
        label="On The Way"
        value={stats.onTheWay.toLocaleString()}
        highlightColor="var(--accent-blue)"
      />
      <StatCard
        label="Wishlist"
        value={stats.wishlistGoals}
        isWishlist
      />
      <StatCard
        label="Duplicates"
        value={stats.duplicates || 0}
        highlightColor="var(--secondary)"
      />
      {/* <StatCard 
        label="Est. Value" 
        value={`$${stats.collectionValue.toLocaleString()}`} 
        highlightColor="var(--primary)" 
      /> */}
    </aside>
  );
}
