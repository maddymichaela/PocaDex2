/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import CardDetail from './pages/CardDetail';
import { MOCK_PHOTOCARDS } from './data/mockData';
import { Photocard } from './types';
import { storage } from './lib/storage';

/* ── Dark mode helper ──────────────────────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('pocadex-dark');
      if (stored !== null) return stored === 'true';
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('pocadex-dark', String(dark)); } catch {}
  }, [dark]);

  return [dark, setDark] as const;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('Collection');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [dark, setDark]               = useDarkMode();

  const [photocards, setPhotocards] = useState<Photocard[]>(() =>
    storage.load<Photocard[]>(MOCK_PHOTOCARDS)
  );

  useEffect(() => { storage.save(photocards); }, [photocards]);

  const handleAddPhotocard    = (newPC: Photocard) =>
    setPhotocards(prev => [newPC, ...prev]);

  const handleUpdatePhotocard = (updatedPC: Photocard) =>
    setPhotocards(prev => prev.map(pc => pc.id === updatedPC.id ? updatedPC : pc));

  const handleDeletePhotocard = (id: string) =>
    setPhotocards(prev => prev.filter(pc => pc.id !== id));

  const handleBulkUpdatePartial = (ids: string[], updates: Partial<Photocard>) =>
    setPhotocards(prev => prev.map(pc =>
      ids.includes(pc.id) ? { ...pc, ...updates, updatedAt: Date.now() } : pc
    ));

  const handleBulkUpdate = (newData: Photocard[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setPhotocards(newData);
    } else {
      setPhotocards(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        return [...newData.filter(p => !existingIds.has(p.id)), ...prev];
      });
    }
  };

  const renderPage = () => {
    if (selectedId) {
      const card = photocards.find(p => p.id === selectedId);
      if (card) return (
        <CardDetail
          photocard={card}
          onUpdate={handleUpdatePhotocard}
          onDelete={(id) => { handleDeletePhotocard(id); setSelectedId(null); }}
          onBack={() => setSelectedId(null)}
        />
      );
    }

    switch (currentPage) {
      case 'Dashboard':
        return (
          <Dashboard
            photocards={photocards}
            onEdit={(pc) => setSelectedId(pc.id)}
            onDelete={handleDeletePhotocard}
            onImport={handleBulkUpdate}
          />
        );
      case 'Collection':
        return (
          <Collection
            photocards={photocards}
            onAdd={handleAddPhotocard}
            onUpdate={handleUpdatePhotocard}
            onDelete={handleDeletePhotocard}
            onBulkUpdate={handleBulkUpdatePartial}
            onCardClick={(pc) => setSelectedId(pc.id)}
          />
        );
      case 'Groups': {
        const groupCounts = photocards.reduce((acc, pc) => {
          const g = pc.group || 'Unknown';
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const groupStats = Object.entries(groupCounts).sort((a, b) => (b[1] as number) - (a[1] as number));

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="font-serif text-3xl font-medium text-[hsl(var(--foreground))] italic">
              Groups Binder
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupStats.map(([name, count]) => (
                <motion.div
                  key={name}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="glass-card p-10 rounded-[40px] border-2 border-[hsl(var(--card-border))] shadow-[var(--shadow-md)] flex flex-col items-center text-center gap-4 group cursor-pointer"
                  onClick={() => setCurrentPage('Collection')}
                >
                  <div className="w-24 h-24 bg-[hsl(var(--accent))] rounded-full flex items-center justify-center text-[hsl(var(--accent-foreground))] font-serif font-medium text-4xl shadow-inner border-2 border-[hsl(var(--card-border))] group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-all duration-500">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[hsl(var(--foreground))] leading-none mb-1">{name}</h3>
                    <p className="font-serif text-xs font-medium text-[hsl(var(--muted-foreground))]">{count} Photocards</p>
                  </div>
                </motion.div>
              ))}
              {groupStats.length === 0 && (
                <div className="col-span-full py-20 text-center font-serif italic text-[hsl(var(--muted-foreground))]">
                  No groups found yet. Add some cards to see them here!
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-[hsl(var(--muted-foreground))] gap-4">
            <div className="text-4xl">🚧</div>
            <div className="font-serif italic text-sm">"{currentPage}" is coming soon</div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isDark={dark}
        onToggleDark={() => setDark(d => !d)}
      />

      <main className="flex-1 px-4 md:px-10 py-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId ?? currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-8 px-4 md:px-10 border-t border-[hsl(var(--border))] mt-auto">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="font-serif text-xs font-medium italic text-[hsl(var(--muted-foreground))]">
            © 2026 PocaDex
          </div>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a
                key={l}
                href="#"
                className="font-serif text-xs font-medium italic text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
