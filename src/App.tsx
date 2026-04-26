import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import CardDetail from './pages/CardDetail';
import CardForm from './pages/CardForm';
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

const collectionCacheKey = (userId: string) => `pocadex:collection:${userId}`;

function readCachedPhotocards(userId: string): Photocard[] | null {
  try {
    const cached = window.localStorage.getItem(collectionCacheKey(userId));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? (parsed as Photocard[]) : null;
  } catch {
    return null;
  }
}

function writeCachedPhotocards(userId: string, cards: Photocard[]) {
  try {
    window.localStorage.setItem(collectionCacheKey(userId), JSON.stringify(cards));
  } catch {
    // Cache writes are best-effort.
  }
}

export default function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');
  const [currentPage, setCurrentPage] = useState('Collection');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCard, setFormCard] = useState<Photocard | null>(null);
  const [photocards, setPhotocards] = useState<Photocard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const handleAddCard = useCallback(() => {
    setFormCard(null);
    setIsFormOpen(true);
  }, []);

  // Handle /auth/callback route
  if (window.location.pathname === '/auth/callback') return <AuthCallback />;

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let isCurrent = true;
    const cached = readCachedPhotocards(userId);
    if (cached) {
      setPhotocards(cached);
      setDataLoading(false);
    } else {
      setPhotocards([]);
      setDataLoading(true);
    }
    fetchPhotocards(userId)
      .then((cards) => { if (isCurrent) { setPhotocards(cards); writeCachedPhotocards(userId, cards); } })
      .catch(console.error)
      .finally(() => { if (isCurrent) setDataLoading(false); });
    return () => { isCurrent = false; };
  }, [userId]);

  useEffect(() => {
    if (!userId || dataLoading) return;
    writeCachedPhotocards(userId, photocards);
  }, [dataLoading, photocards, userId]);

  const handleAddPhotocard = useCallback(async (newPC: Photocard) => {
    if (!user) return;
    setPhotocards(prev => [newPC, ...prev]);
    try {
      const saved = await insertPhotocard(user.id, newPC);
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
      setPhotocards(prev => prev.map(pc => ids.includes(pc.id) ? { ...pc, ...updates } : pc));
    } catch (err) {
      console.error('Failed to bulk update:', err);
    }
  }, [user]);

  // Auth loading
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
    if (authScreen === 'login') return <Login onBack={() => setAuthScreen('splash')} />;
    return <Splash onGetStarted={() => setAuthScreen('login')} onSignIn={() => setAuthScreen('login')} />;
  }

  // Compute card detail state
  const currentCard = selectedId ? (photocards.find(p => p.id === selectedId) ?? null) : null;
  const currentCardIndex = currentCard ? photocards.findIndex(p => p.id === selectedId) : -1;

  const renderPage = () => {
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
        return <Scan onDone={() => setCurrentPage('Collection')} />;
      case 'Collection':
        return (
          <Collection
            photocards={photocards}
            onDelete={handleDeletePhotocard}
            onBulkUpdate={handleBulkUpdatePartial}
            onCardClick={(pc) => setSelectedId(pc.id)}
            onNewCard={handleAddCard}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
            <div className="text-4xl">🚧</div>
            <div className="font-black uppercase tracking-widest text-xs">"{currentPage}" is coming soon</div>
          </div>
        );
    }
  };

  const loadingSpinner = (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Loading your collection…</p>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen flex flex-col xl:flex-row overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 app-shell-bg" />
      <div className="pointer-events-none absolute inset-0 app-shell-dots opacity-60" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-[8%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute top-[10%] right-[-3rem] h-44 w-44 rounded-full bg-white/65 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-2rem] h-56 w-56 rounded-full bg-white/60 blur-3xl" />
      </div>
      <Navbar
        currentPage={currentPage}
        onPageChange={(page) => { setCurrentPage(page); setSelectedId(null); setIsFormOpen(false); }}
        profile={profile}
        onSignOut={signOut}
        onAddCard={handleAddCard}
      />
      <main className="relative z-10 flex-1 overflow-auto overflow-x-hidden">
        {dataLoading ? (
          <div className="px-4 py-5 xl:p-8 max-w-6xl mx-auto w-full">{loadingSpinner}</div>
        ) : isFormOpen ? (
          <CardForm
            key={formCard?.id ?? 'new'}
            initialData={formCard}
            onSubmit={async (pc) => {
              if (formCard) {
                await handleUpdatePhotocard(pc);
              } else {
                await handleAddPhotocard(pc);
              }
              setIsFormOpen(false);
            }}
            onDelete={formCard ? async (id) => {
              await handleDeletePhotocard(id);
              setSelectedId(null);
              setIsFormOpen(false);
            } : undefined}
            onBack={() => setIsFormOpen(false)}
          />
        ) : currentCard ? (
          <CardDetail
            key={selectedId}
            photocard={currentCard}
            onBack={() => setSelectedId(null)}
            onEdit={() => { setFormCard(currentCard); setIsFormOpen(true); }}
            hasPrev={currentCardIndex > 0}
            hasNext={currentCardIndex < photocards.length - 1}
            onPrev={() => setSelectedId(photocards[currentCardIndex - 1].id)}
            onNext={() => setSelectedId(photocards[currentCardIndex + 1].id)}
          />
        ) : (
          <div className="px-4 py-5 xl:p-8 max-w-6xl mx-auto w-full">
            {renderPage()}
          </div>
        )}
      </main>
    </div>
  );
}
