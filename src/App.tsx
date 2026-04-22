import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import CardDetail from './pages/CardDetail';
import Splash from './pages/Splash';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Scan from './pages/Scan';
import { Photocard } from './types';
import { useAuth } from './contexts/AuthContext';
import {
  fetchPhotocards,
  insertPhotocard,
  updatePhotocard,
  deletePhotocard,
  bulkUpdatePhotocards,
} from './lib/db';

type AuthScreen = 'splash' | 'login';

export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');
  const [currentPage, setCurrentPage] = useState('Collection');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photocards, setPhotocards] = useState<Photocard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [addTrigger, setAddTrigger] = useState(0);

  const handleAddCard = useCallback(() => {
    setCurrentPage('Collection');
    setSelectedId(null);
    setAddTrigger(prev => prev + 1);
  }, []);

  // Handle /auth/callback route
  if (window.location.pathname === '/auth/callback') return <AuthCallback />;

  // Load photocards only when the user ID changes, not on every token refresh
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    setDataLoading(true);
    fetchPhotocards(userId)
      .then(setPhotocards)
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [userId]);

  const handleAddPhotocard = useCallback(async (newPC: Photocard) => {
    if (!user) return;
    // Optimistically add so the card appears instantly
    setPhotocards(prev => [newPC, ...prev]);
    try {
      const saved = await insertPhotocard(user.id, newPC);
      // Replace temp entry with server version (gets real storage URL)
      setPhotocards(prev => prev.map(pc => pc.id === newPC.id ? saved : pc));
    } catch (err) {
      console.error('Failed to add photocard:', err);
      setPhotocards(prev => prev.filter(pc => pc.id !== newPC.id));
    }
  }, [user]);

  const handleUpdatePhotocard = useCallback(async (updatedPC: Photocard) => {
    if (!user) return;
    try {
      const saved = await updatePhotocard(user.id, updatedPC);
      setPhotocards(prev => prev.map(pc => pc.id === saved.id ? saved : pc));
    } catch (err) {
      console.error('Failed to update photocard:', err);
    }
  }, [user]);

  const handleDeletePhotocard = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deletePhotocard(user.id, id);
      setPhotocards(prev => prev.filter(pc => pc.id !== id));
    } catch (err) {
      console.error('Failed to delete photocard:', err);
    }
  }, [user]);

  const handleBulkUpdatePartial = useCallback(async (ids: string[], updates: Partial<Photocard>) => {
    if (!user) return;
    try {
      await bulkUpdatePhotocards(user.id, ids, updates);
      setPhotocards(prev => prev.map(pc =>
        ids.includes(pc.id) ? { ...pc, ...updates } : pc
      ));
    } catch (err) {
      console.error('Failed to bulk update:', err);
    }
  }, [user]);

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (authScreen === 'login') {
      return <Login onBack={() => setAuthScreen('splash')} />;
    }
    return (
      <Splash
        onGetStarted={() => setAuthScreen('login')}
        onSignIn={() => setAuthScreen('login')}
      />
    );
  }

  // Authenticated — render main app
  const renderPage = () => {
    if (selectedId) {
      const card = photocards.find(p => p.id === selectedId);
      if (card) {
        return (
          <CardDetail
            photocard={card}
            onUpdate={handleUpdatePhotocard}
            onDelete={async (id) => {
              await handleDeletePhotocard(id);
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
            onImport={() => {}}
          />
        );
      case 'Scan':
        return (
          <Scan onDone={() => setCurrentPage('Collection')} />
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
            triggerAdd={addTrigger}
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
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Groups Binder</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupStats.map(([name, count]) => (
                <motion.div key={name} whileHover={{ y: -8, scale: 1.02 }}
                  className="glass-card p-10 rounded-[40px] border-4 border-white shadow-xl flex flex-col items-center text-center gap-4 group cursor-pointer"
                  onClick={() => setCurrentPage('Collection')}>
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-4xl shadow-inner border-2 border-white group-hover:bg-primary group-hover:text-white transition-all duration-500">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight leading-none mb-1">{name}</h3>
                    <p className="text-xs font-black text-foreground/40 uppercase tracking-widest">{count} Photocards</p>
                  </div>
                </motion.div>
              ))}
              {groupStats.length === 0 && (
                <div className="col-span-full py-20 text-center font-bold text-foreground/30 italic">
                  No groups yet. Add some cards to see them here!
                </div>
              )}
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
            <div className="text-4xl">🚧</div>
            <div className="font-black uppercase tracking-widest text-xs">"{currentPage}" is coming soon</div>
          </div>
        );
    }
  };

  return (
    <div className="relative h-screen flex flex-col lg:flex-row overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 app-shell-bg" />
      <div className="pointer-events-none absolute inset-0 app-shell-dots opacity-60" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[8%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute top-[10%] right-[-3rem] h-44 w-44 rounded-full bg-white/65 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-2rem] h-56 w-56 rounded-full bg-white/60 blur-3xl" />
      </div>
      <Navbar
        currentPage={currentPage}
        onPageChange={(page) => { setCurrentPage(page); setSelectedId(null); }}
        profile={profile}
        onSignOut={signOut}
        onAddCard={handleAddCard}
      />
      <main className="relative z-10 flex-1 overflow-auto overflow-x-hidden">
        <div className="px-4 py-5 lg:p-8 max-w-6xl mx-auto w-full">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Loading your collection…</p>
              </div>
            </div>
          ) : renderPage()}
        </div>
      </main>
    </div>
  );
}
