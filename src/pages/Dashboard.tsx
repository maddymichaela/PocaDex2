/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Photocard } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import { Sidebar } from '../components/Sidebar';
import { MOCK_STATS } from '../data/mockData';
import PhotocardForm from '../components/PhotocardForm';
import BackupControls from '../components/BackupControls';
import { AnimatePresence } from 'motion/react';

interface DashboardProps {
  photocards: Photocard[];
  onEdit: (pc: Photocard) => void;
  onDelete: (id: string) => void;
  onImport: (newData: Photocard[], mode: 'replace' | 'merge') => void;
}

export default function Dashboard({ photocards, onEdit, onDelete, onImport }: DashboardProps) {
  const recentPhotocards = [...photocards]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4);

  // Dynamic stats
  const ownedCount = photocards.filter(p => p.status === 'owned').length;
  const onTheWayCount = photocards.filter(p => p.status === 'on_the_way').length;
  const wishlistCount = photocards.filter(p => p.status === 'wishlist').length;
  const duplicateCount = photocards.filter(p => p.isDuplicate).length;

  const stats = {
    totalCollected: ownedCount,
    onTheWay: onTheWayCount,
    wishlistGoals: wishlistCount,
    duplicates: duplicateCount,
    collectionValue: ownedCount * 25 // Updated mock value: $25 per card
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      <Sidebar stats={stats} />

      <div className="flex-1 flex flex-col gap-8">
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
