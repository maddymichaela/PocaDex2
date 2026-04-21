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

export default function App() {
  const [currentPage, setCurrentPage] = useState('Collection');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Initialize state with stored data or fallback to mock data
  const [photocards, setPhotocards] = useState<Photocard[]>(() => 
    storage.load<Photocard[]>(MOCK_PHOTOCARDS)
  );

  // Persistence effect: save whenever photocards change
  useEffect(() => {
    storage.save(photocards);
  }, [photocards]);

  const handleAddPhotocard = (newPC: Photocard) => {
    setPhotocards(prev => [newPC, ...prev]);
  };

  const handleUpdatePhotocard = (updatedPC: Photocard) => {
    setPhotocards(prev => prev.map(pc => pc.id === updatedPC.id ? updatedPC : pc));
  };

  const handleDeletePhotocard = (id: string) => {
    setPhotocards(prev => prev.filter(pc => pc.id !== id));
  };

  const handleBulkUpdatePartial = (ids: string[], updates: Partial<Photocard>) => {
    setPhotocards(prev => prev.map(pc => {
      if (ids.includes(pc.id)) {
        return { ...pc, ...updates, updatedAt: Date.now() };
      }
      return pc;
    }));
  };

  const handleBulkUpdate = (newData: Photocard[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      setPhotocards(newData);
    } else {
      // Merge: avoid duplicates based on ID (though normally backups are from the same IDs)
      // If we merge, we'll keep the new ones if IDs clash, or just append
      setPhotocards(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const filteredNew = newData.filter(p => !existingIds.has(p.id));
        return [...filteredNew, ...prev];
      });
    }
  };

  const renderPage = () => {
    // If an ID is selected, show Detail regardless of currentPage state (or we could manage it more strictly)
    if (selectedId) {
      const card = photocards.find(p => p.id === selectedId);
      if (card) {
        return (
          <CardDetail 
            photocard={card}
            onUpdate={handleUpdatePhotocard}
            onDelete={(id) => {
              handleDeletePhotocard(id);
              setSelectedId(null);
            }}
            onBack={() => setSelectedId(null)}
          />
        );
      }
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
      case 'Groups':
        const groupCounts = photocards.reduce((acc, pc) => {
          const g = pc.group || 'Unknown';
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const groupStats = Object.entries(groupCounts).sort((a, b) => (b[1] as number) - (a[1] as number));

        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Groups Binder</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupStats.map(([name, count]) => (
                <motion.div
                  key={name}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="glass-card p-10 rounded-[40px] border-4 border-white shadow-xl flex flex-col items-center text-center gap-4 group cursor-pointer"
                  onClick={() => {
                    // Logic to jump to collection with this group filter could go here
                    setCurrentPage('Collection');
                  }}
                >
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-4xl shadow-inner border-2 border-white group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-none mb-1">{name}</h3>
                    <p className="text-xs font-black text-foreground/40 uppercase tracking-widest">{count} Photocards</p>
                  </div>
                </motion.div>
              ))}
              {groupStats.length === 0 && (
                <div className="col-span-full py-20 text-center font-bold text-foreground/30 italic">
                  No groups found yet. Add some cards to see them here!
                </div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
            <div className="text-4xl">🚧</div>
            <div className="font-black uppercase tracking-widest text-xs">The "{currentPage}" module is under construction</div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />
      
      <main className="flex-1 px-10 py-8 max-w-7xl mx-auto w-full">
        {renderPage()}
      </main>
      
      <footer className="py-8 px-10 border-t border-gray-100 mt-auto">
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <div>© 2026 PC-Track. All Rights Reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
