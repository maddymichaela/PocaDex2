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
import AccountSettings from './pages/AccountSettings';
import PublicProfile from './pages/PublicProfile';
import Social from './pages/Social';
import FindCards from './pages/FindCards';
import { normalizePhotocardForSave, normalizePhotocardUpdates, Photocard, Profile } from './types';
import { useAuth } from './contexts/AuthContext';
import {
  fetchPhotocards,
  insertPhotocard,
  updatePhotocard,
  deletePhotocard,
  bulkUpdatePhotocards,
} from './lib/db';
import { getCardTemplateId } from './lib/social';

type AuthScreen = 'splash' | 'login' | 'signup';
type RouteState = { page: string; username?: string; socialTab?: 'people' | 'following' | 'followers' };

const collectionCacheKey = (userId: string) => `pocadex:collection:${userId}`;

function dedupePhotocardsByTemplateId(cards: Photocard[]) {
  const cardsByTemplateId = new Map<string, Photocard>();
  const statusPriority: Record<Photocard['status'], number> = { owned: 3, on_the_way: 2, wishlist: 1 };

  cards.forEach((card) => {
    const templateId = getCardTemplateId(card);
    const current = cardsByTemplateId.get(templateId);
    if (!current || statusPriority[card.status] > statusPriority[current.status]) {
      cardsByTemplateId.set(templateId, card);
    }
  });

  return Array.from(cardsByTemplateId.values());
}

function readCachedPhotocards(userId: string): Photocard[] | null {
  try {
    const cached = window.localStorage.getItem(collectionCacheKey(userId));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? dedupePhotocardsByTemplateId(parsed.map(card => normalizePhotocardForSave(card as Photocard))) : null;
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

function readRouteState(): RouteState {
  const path = window.location.pathname;
  if (path.startsWith('/u/')) {
    const username = decodeURIComponent(path.replace('/u/', '').split('/')[0] || '');
    return username ? { page: 'Profile', username } : { page: 'Collection' };
  }
  if (path === '/discover') return { page: 'FindCards' };
  if (path === '/friends' || path === '/social') return { page: 'Friends' };
  if (path === '/find-cards') return { page: 'FindCards' };
  return { page: 'Collection' };
}

function routeForPage(page: string, username?: string) {
  if (page === 'Profile' && username) return `/u/${encodeURIComponent(username)}`;
  if (page === 'Friends') return '/friends';
  if (page === 'FindCards') return '/find-cards';
  if (page === 'Dashboard') return '/';
  return '/';
}

export default function App() {
  const { user, profile, loading: authLoading, signOut, cancelAccountDeletion } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');
  const initialRoute = readRouteState();
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [routeUsername, setRouteUsername] = useState(initialRoute.username ?? '');
  const [socialTab, setSocialTab] = useState(initialRoute.socialTab ?? 'people');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formCard, setFormCard] = useState<Photocard | null>(null);
  const [photocards, setPhotocards] = useState<Photocard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);

  const handleAddCard = useCallback(() => {
    setFormCard(null);
    setIsFormOpen(true);
  }, []);

  const navigateToPage = useCallback((page: string, username?: string) => {
    setCurrentPage(page);
    setRouteUsername(username ?? '');
    if (page === 'Friends') setSocialTab('people');
    if (page !== 'Profile') setViewedProfile(null);
    setSelectedId(null);
    setIsFormOpen(false);
    window.history.pushState({}, '', routeForPage(page, username));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = readRouteState();
      setCurrentPage(nextRoute.page);
      setRouteUsername(nextRoute.username ?? '');
      setSocialTab(nextRoute.socialTab ?? 'people');
      setViewedProfile(null);
      setSelectedId(null);
      setIsFormOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      .then((cards) => {
        if (!isCurrent) return;
        const dedupedCards = dedupePhotocardsByTemplateId(cards);
        setPhotocards(dedupedCards);
        writeCachedPhotocards(userId, dedupedCards);
      })
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
    const normalizedPC = normalizePhotocardForSave(newPC);
    const templateId = getCardTemplateId(normalizedPC);
    setPhotocards(prev => prev.some((card) => getCardTemplateId(card) === templateId) ? prev : [normalizedPC, ...prev]);
    try {
      const saved = await insertPhotocard(user.id, normalizedPC);
      const mergedSaved = normalizePhotocardForSave({ ...normalizedPC, ...saved });
      const savedTemplateId = getCardTemplateId(mergedSaved);
      setPhotocards(prev => [
        mergedSaved,
        ...prev.filter((pc) => pc.id !== normalizedPC.id && getCardTemplateId(pc) !== savedTemplateId),
      ]);
    } catch (err) {
      console.error('Failed to add photocard:', err);
      setPhotocards(prev => prev.filter(pc => pc.id !== normalizedPC.id));
    }
  }, [user]);

  const handleUpdatePhotocard = useCallback(async (updatedPC: Photocard) => {
    if (!user) return;
    const normalizedPC = normalizePhotocardForSave(updatedPC);
    setPhotocards(prev => prev.map(pc => pc.id === normalizedPC.id ? normalizedPC : pc));
    try {
      const saved = await updatePhotocard(user.id, normalizedPC);
      const mergedSaved = normalizePhotocardForSave({ ...saved, ...normalizedPC });
      setPhotocards(prev => prev.map(pc => pc.id === mergedSaved.id ? mergedSaved : pc));
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
    const normalizedUpdates = normalizePhotocardUpdates(updates);
    setPhotocards(prev => prev.map(pc => ids.includes(pc.id) ? normalizePhotocardForSave({ ...pc, ...normalizedUpdates }) : pc));
    try {
      await bulkUpdatePhotocards(user.id, ids, normalizedUpdates);
    } catch (err) {
      console.error('Failed to bulk update:', err);
    }
  }, [user]);

  const handleScanImported = useCallback((savedCards: Photocard[]) => {
    setPhotocards(prev => {
      const savedTemplateIds = new Set(savedCards.map(getCardTemplateId));
      return dedupePhotocardsByTemplateId([...savedCards, ...prev.filter(card => !savedTemplateIds.has(getCardTemplateId(card)))]);
    });
  }, []);

  const handleImportPhotocards = useCallback((newData: Photocard[], mode: 'replace' | 'merge') => {
    setPhotocards(prev => {
      if (mode === 'replace') return dedupePhotocardsByTemplateId(newData);
      const existingTemplateIds = new Set(prev.map(getCardTemplateId));
      return dedupePhotocardsByTemplateId([...newData.filter(card => !existingTemplateIds.has(getCardTemplateId(card))), ...prev]);
    });
  }, []);

  const handleCopyPublicCard = useCallback(async (sourceCard: Photocard, status: 'owned' | 'wishlist') => {
    if (!user) return;
    const sourceTemplateId = getCardTemplateId(sourceCard);
    if (photocards.some((card) => getCardTemplateId(card) === sourceTemplateId)) return;

    const copiedCard = normalizePhotocardForSave({
      ...sourceCard,
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      cardTemplateId: sourceTemplateId,
      ownerUserId: user.id,
      status,
      condition: status === 'owned' ? sourceCard.condition : undefined,
      isDuplicate: false,
      notes: '',
      createdAt: Date.now(),
    });

    await handleAddPhotocard(copiedCard);
  }, [handleAddPhotocard, photocards, user]);

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
    if (currentPage === 'Profile' && routeUsername) {
      return (
        <div className="relative min-h-screen overflow-auto bg-white">
          <div className="pointer-events-none absolute inset-0 app-shell-bg" />
          <div className="pointer-events-none absolute inset-0 app-shell-dots opacity-60" />
          <main className="relative z-10 px-4 py-5 xl:p-8">
            <PublicProfile
              username={routeUsername}
              currentUserId={null}
              ownPhotocards={[]}
              onEditProfile={() => setAuthScreen('login')}
              onCopyCard={handleCopyPublicCard}
            />
          </main>
        </div>
      );
    }
    if (authScreen === 'login' || authScreen === 'signup') {
      return <Login initialMode={authScreen === 'signup' ? 'signup' : 'signin'} onBack={() => setAuthScreen('splash')} />;
    }
    return <Splash onGetStarted={() => setAuthScreen('signup')} onSignIn={() => setAuthScreen('login')} />;
  }

  // Compute card detail state
  const currentCard = selectedId ? (photocards.find(p => p.id === selectedId) ?? null) : null;
  const currentCardIndex = currentCard ? photocards.findIndex(p => p.id === selectedId) : -1;
  const isViewingOwnProfile = currentPage === 'Profile'
    && (
      viewedProfile?.id === user.id ||
      (!viewedProfile && Boolean(profile?.username) && routeUsername.toLowerCase() === profile.username.toLowerCase())
    );
  const navbarCurrentPage = currentPage === 'Profile' && !isViewingOwnProfile ? 'Friends' : currentPage;

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return (
          <Dashboard
            photocards={photocards}
            onEdit={(pc) => setSelectedId(pc.id)}
            onDelete={handleDeletePhotocard}
            onImport={handleImportPhotocards}
          />
        );
      case 'Scan':
        return <Scan onDone={() => setCurrentPage('Collection')} onImported={handleScanImported} />;
      case 'Account':
        return <AccountSettings photocards={photocards} />;
      case 'Profile':
        return (
          <PublicProfile
            username={routeUsername || profile?.username || ''}
            currentUserId={user.id}
            ownProfile={profile}
            ownPhotocards={photocards}
            onEditProfile={() => navigateToPage('Account')}
            onOpenCard={(pc) => setSelectedId(pc.id)}
            onCopyCard={handleCopyPublicCard}
            onProfileResolved={setViewedProfile}
          />
        );
      case 'FindCards':
        return (
          <FindCards
            ownPhotocards={photocards}
            onCopyCard={handleCopyPublicCard}
          />
        );
      case 'Friends':
        return (
          <Social
            currentUserId={user.id}
            initialTab={socialTab}
            onOpenProfile={(nextProfile) => navigateToPage('Profile', nextProfile.username)}
          />
        );
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
        currentPage={navbarCurrentPage}
        onPageChange={(page) => navigateToPage(page, page === 'Profile' ? profile?.username : undefined)}
        profile={profile}
        onSignOut={signOut}
        onAddCard={handleAddCard}
        onOpenSettings={() => { setCurrentPage('Account'); setSelectedId(null); setIsFormOpen(false); }}
      />
      <main className="relative z-10 flex-1 overflow-auto overflow-x-hidden">
        {profile?.deletion_requested_at && (
          <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl flex-col gap-3 rounded-[24px] border-2 border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 shadow-sm md:flex-row md:items-center md:justify-between">
            <span>Your account will be deleted in 30 days.</span>
            <button
              type="button"
              onClick={cancelAccountDeletion}
              className="rounded-2xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-100"
            >
              Restore Account
            </button>
          </div>
        )}
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
