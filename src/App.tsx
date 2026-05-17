import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Collection from './pages/Collection';
import CardDetail from './pages/CardDetail';
import CardForm from './pages/CardForm';
import Splash from './pages/Splash';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Scan from './pages/Scan';
import Pricing from './pages/Pricing';
import Wishlist from './pages/Wishlist';
import AccountSettings from './pages/AccountSettings';
import PublicProfile from './pages/PublicProfile';
import Social from './pages/Social';
import FindCards, { clearGlobalSearchState } from './pages/FindCards';
import { Grid3x3, ImagePlus, X, PackageCheck, Truck } from 'lucide-react';
import { normalizePhotocardForSave, normalizePhotocardUpdates, Photocard, Profile, Status } from './types';
import { useAuth } from './contexts/AuthContext';
import {
  fetchPhotocards,
  insertPhotocard,
  updatePhotocard,
  deletePhotocard,
  bulkUpdatePhotocards,
} from './lib/db';
import { fetchUnreadFollowNotificationCount, getCardTemplateId } from './lib/social';
import { createPhotocardDraftFromPublicCard, getCollectionMatchState, isPhotocardOwner, isProfileOwner } from './lib/ownership';
import { countTrackedCollectionCards, isTrackedCollectionCard } from './lib/plan';
import { usePlan } from './hooks/usePlan';
import UpgradePrompt from './components/UpgradePrompt';
import ModalShell from './components/ModalShell';

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
  if (path === '/import' || path === '/scan') return { page: 'Import' };
  if (path === '/wishlist') return { page: 'Wishlist' };
  if (path === '/friends' || path === '/social') return { page: 'Friends' };
  if (path === '/find-cards') return { page: 'FindCards' };
  if (path === '/pricing') return { page: 'Pricing' };
  return { page: 'Collection' };
}

function routeForPage(page: string, username?: string) {
  if (page === 'Profile' && username) return `/u/${encodeURIComponent(username)}`;
  if (page === 'Friends') return '/friends';
  if (page === 'Wishlist') return '/wishlist';
  if (page === 'FindCards') return '/find-cards';
  if (page === 'Import') return '/import';
  if (page === 'Pricing') return '/pricing';
  if (page === 'Dashboard') return '/';
  return '/';
}

function AddCardEntry({ onManualAdd, onImportGrid, onBack }: {
  onManualAdd: () => void;
  onImportGrid: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-gray-50/30">
      <div className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 rounded-2xl px-4 py-2 transition-all hover:bg-gray-100"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground">
              Back to Binder
            </span>
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">Add Card</h2>
            <p className="hidden text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 sm:block">
              Choose how to add to your binder
            </p>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onManualAdd}
            className="group flex min-h-56 flex-col items-start justify-between rounded-[28px] border-2 border-white bg-white/80 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
              <ImagePlus size={24} />
            </span>
            <span className="space-y-2">
              <span className="block text-2xl font-bold tracking-tight text-foreground">Add Card</span>
              <span className="block text-sm font-medium leading-6 text-foreground/50">
                Add a card manually or upload a single photocard and edit/crop it.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onImportGrid}
            className="group flex min-h-56 flex-col items-start justify-between rounded-[28px] border-2 border-white bg-white/80 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
              <Grid3x3 size={24} />
            </span>
            <span className="space-y-2">
              <span className="block text-2xl font-bold tracking-tight text-foreground">Import from Grid</span>
              <span className="block text-sm font-medium leading-6 text-foreground/50">
                Upload a template/grid image and split it into multiple photocards.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppToast({ message, onClick, onDismiss }: { message: string; onClick?: () => void; onDismiss: () => void }) {
  const messageClassName = `min-w-0 truncate ${onClick ? 'cursor-pointer text-primary hover:text-primary/80' : ''}`;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-white bg-white/95 px-4 py-3 text-sm font-bold text-foreground/65 shadow-xl shadow-primary/10 backdrop-blur">
      {onClick ? (
        <button type="button" onClick={onClick} className={messageClassName}>
          {message}
        </button>
      ) : (
        <span className={messageClassName}>{message}</span>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-foreground/35 transition-all hover:bg-primary/10 hover:text-primary"
        aria-label="Dismiss message"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function MoveToBinderPrompt({ card, onClose, onMove }: {
  card: Photocard;
  onClose: () => void;
  onMove: (status: 'owned' | 'on_the_way') => void;
}) {
  return (
    <ModalShell
      title="Move to Binder"
      subtitle="Choose tracking status"
      icon={<PackageCheck size={19} />}
      onClose={onClose}
      maxWidth="md:max-w-sm"
      overlayClassName="bg-primary/10 backdrop-blur-md"
    >
      <div className="space-y-6 p-6 text-center md:p-8">
        <p className="text-sm font-semibold leading-6 text-foreground/55">
          How do you want to track this card?
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onMove('owned')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary/20 bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:bg-primary hover:text-white"
          >
            <PackageCheck size={17} />
            Owned
          </button>
          <button
            type="button"
            onClick={() => onMove('on_the_way')}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-accent-blue/20 bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-accent-blue shadow-sm transition-all hover:bg-accent-blue hover:text-white"
          >
            <Truck size={17} />
            On the Way
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/35 transition-all hover:bg-gray-50 hover:text-foreground/60"
          >
            Cancel
          </button>
        </div>
        <p className="sr-only">{card.cardName}</p>
      </div>
    </ModalShell>
  );
}

export default function App() {
  const { user, profile, loading: authLoading, signOut, cancelAccountDeletion } = useAuth();
  const plan = usePlan();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('splash');
  const initialRoute = readRouteState();
  const [currentPage, setCurrentPage] = useState(initialRoute.page);
  const [routeUsername, setRouteUsername] = useState(initialRoute.username ?? '');
  const [socialTab, setSocialTab] = useState(initialRoute.socialTab ?? 'people');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPublicCard, setSelectedPublicCard] = useState<Photocard | null>(null);
  const [selectedPublicCards, setSelectedPublicCards] = useState<Photocard[]>([]);
  const [selectedCardBackLabel, setSelectedCardBackLabel] = useState('Back to Binder');
  const [isAddCardEntryOpen, setIsAddCardEntryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formDefaultStatus, setFormDefaultStatus] = useState<Status>('owned');
  const [formCard, setFormCard] = useState<Photocard | null>(null);
  const [photocards, setPhotocards] = useState<Photocard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [upgradePromptReason, setUpgradePromptReason] = useState<string | null>(null);
  const [moveToBinderCard, setMoveToBinderCard] = useState<Photocard | null>(null);
  const [friendsUnreadCount, setFriendsUnreadCount] = useState(0);
  const binderReadyToastUserRef = useRef<string | null>(null);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const trackedCardCount = countTrackedCollectionCards(photocards);

  const showUpgradePrompt = useCallback((reason: string) => {
    setUpgradePromptReason(reason);
  }, []);


  const handleAddCard = useCallback(() => {
    if (currentPageRef.current === 'FindCards') {
      clearGlobalSearchState('opened new-card form from Find Cards');
    }
    setFormMode('create');
    setFormDefaultStatus('owned');
    setFormCard(null);
    setSelectedPublicCard(null);
    setSelectedPublicCards([]);
    setSelectedCardBackLabel('Back to Binder');
    setIsAddCardEntryOpen(true);
    setIsFormOpen(false);
  }, []);

  const openManualAddForm = useCallback(() => {
    setFormMode('create');
    setFormDefaultStatus('owned');
    setFormCard(null);
    setSelectedPublicCard(null);
    setSelectedPublicCards([]);
    setSelectedCardBackLabel('Back to Binder');
    setIsAddCardEntryOpen(false);
    setIsFormOpen(true);
  }, []);

  const openManualWishlistForm = useCallback(() => {
    setFormMode('create');
    setFormDefaultStatus('wishlist');
    setFormCard(null);
    setSelectedPublicCard(null);
    setSelectedPublicCards([]);
    setSelectedCardBackLabel('Back to Wishlist');
    setSelectedId(null);
    setIsAddCardEntryOpen(false);
    setIsFormOpen(true);
  }, []);

  const getTrackedCountAfterSave = useCallback((nextCard: Photocard, currentCards = photocards) => {
    const nextIsTracked = isTrackedCollectionCard(nextCard);
    const existing = currentCards.find((card) => card.id === nextCard.id || getCardTemplateId(card) === getCardTemplateId(nextCard));
    const countWithoutExistingTrackedCard = existing && isTrackedCollectionCard(existing)
      ? countTrackedCollectionCards(currentCards.filter((card) => card.id !== existing.id))
      : countTrackedCollectionCards(currentCards);

    return countWithoutExistingTrackedCard + (nextIsTracked ? 1 : 0);
  }, [photocards]);

  const guardTrackedCardLimit = useCallback((nextCard: Photocard) => {
    const nextTrackedCount = getTrackedCountAfterSave(nextCard);
    if (plan.canAddMoreCards(nextTrackedCount - (isTrackedCollectionCard(nextCard) ? 1 : 0))) return true;
    if (!isTrackedCollectionCard(nextCard)) return true;

    showUpgradePrompt('Upgrade to Pro to add more owned or on-the-way cards.');
    return false;
  }, [getTrackedCountAfterSave, plan, showUpgradePrompt]);

  const handleAddPublicCard = useCallback((sourceCard: Photocard) => {
    if (!user) return;
    if (getCollectionMatchState(sourceCard, photocards, user.id).isTrackedInBinder) return;
    if (!plan.canAddMoreCards(trackedCardCount)) {
      showUpgradePrompt('Upgrade to Pro to add more owned or on-the-way cards.');
      return;
    }
    if (currentPageRef.current === 'FindCards') {
      clearGlobalSearchState('opened add-to-collection form from Global Search');
    }
    const draft = createPhotocardDraftFromPublicCard(sourceCard, user.id);
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
      console.debug('[PocaDex global search debug] clone/add payload', { sourceCard, draft });
    }
    setFormMode('create');
    setFormDefaultStatus('owned');
    setFormCard(draft);
    setSelectedPublicCard(null);
    setSelectedPublicCards([]);
    setSelectedCardBackLabel('Back to Binder');
    setSelectedId(null);
    setIsFormOpen(true);
  }, [photocards, plan, showUpgradePrompt, trackedCardCount, user]);

  const handleAddWishlistCard = useCallback(async (sourceCard: Photocard) => {
    if (!user) return;
    const matchState = getCollectionMatchState(sourceCard, photocards, user.id);
    if (matchState.isWishlisted || matchState.isTrackedInBinder) return;

    const draft = normalizePhotocardForSave({
      ...createPhotocardDraftFromPublicCard(sourceCard, user.id),
      status: 'wishlist',
      condition: undefined,
      isDuplicate: false,
      notes: '',
    });
    setPhotocards(prev => [draft, ...prev]);
    try {
      const saved = await insertPhotocard(user.id, draft);
      const mergedSaved = normalizePhotocardForSave({ ...saved, ...draft, id: saved.id, imageUrl: saved.imageUrl ?? draft.imageUrl });
      const savedTemplateId = getCardTemplateId(mergedSaved);
      setPhotocards(prev => [
        mergedSaved,
        ...prev.filter((pc) => pc.id !== draft.id && pc.id !== saved.id && getCardTemplateId(pc) !== savedTemplateId),
      ]);
      setToastMessage('Added to Wishlist');
    } catch (err) {
      console.error('Failed to wishlist photocard:', err);
      setPhotocards(prev => prev.filter(pc => pc.id !== draft.id));
    }
  }, [photocards, user]);

  const handleRemoveWishlistCard = useCallback(async (sourceCard: Photocard) => {
    if (!user) return;
    const matchState = getCollectionMatchState(sourceCard, photocards, user.id);
    const wishlistCard = matchState.matchedOwnedCard?.status === 'wishlist' ? matchState.matchedOwnedCard : null;
    if (!wishlistCard) return;

    setPhotocards(prev => prev.filter(card => card.id !== wishlistCard.id));
    if (selectedId === wishlistCard.id) setSelectedId(null);
    if (selectedPublicCard?.id === sourceCard.id) setSelectedPublicCard(null);
    try {
      await deletePhotocard(user.id, wishlistCard.id);
      setToastMessage('Removed from Wishlist');
    } catch (err) {
      console.error('Failed to remove wishlist photocard:', err);
      setPhotocards(prev => [wishlistCard, ...prev]);
    }
  }, [photocards, selectedId, selectedPublicCard, user]);

  const handleMoveWishlistToBinder = useCallback(async (status: 'owned' | 'on_the_way') => {
    if (!user || !moveToBinderCard) return;
    const wishlistCard = photocards.find(card => card.id === moveToBinderCard.id) ?? moveToBinderCard;
    if (wishlistCard.status !== 'wishlist') {
      setMoveToBinderCard(null);
      return;
    }

    const nextCard = normalizePhotocardForSave({
      ...wishlistCard,
      status,
      condition: status === 'owned' ? wishlistCard.condition ?? 'mint' : undefined,
    });
    if (!guardTrackedCardLimit(nextCard)) return;

    setMoveToBinderCard(null);
    setPhotocards(prev => prev.map(card => card.id === nextCard.id ? nextCard : card));
    try {
      const saved = await updatePhotocard(user.id, nextCard);
      const mergedSaved = normalizePhotocardForSave({ ...saved, ...nextCard, imageUrl: saved.imageUrl ?? nextCard.imageUrl });
      setPhotocards(prev => prev.map(card => card.id === mergedSaved.id ? mergedSaved : card));
      setToastMessage('Moved to Binder');
      setSelectedId(mergedSaved.id);
    } catch (err) {
      console.error('Failed to move wishlist card to binder:', err);
      setPhotocards(prev => prev.map(card => card.id === wishlistCard.id ? wishlistCard : card));
    }
  }, [guardTrackedCardLimit, moveToBinderCard, photocards, user]);

  const navigateToPage = useCallback((page: string, username?: string) => {
    if (currentPageRef.current === 'FindCards' && page !== 'FindCards') {
      clearGlobalSearchState(`navigated from Find Cards to ${page}`);
    }
    setCurrentPage(page);
    setRouteUsername(username ?? '');
    if (page === 'Friends') setSocialTab('people');
    if (page !== 'Profile') setViewedProfile(null);
    setSelectedId(null);
    setSelectedPublicCard(null);
    setSelectedPublicCards([]);
    setSelectedCardBackLabel('Back to Binder');
    setIsAddCardEntryOpen(false);
    setIsFormOpen(false);
    setMoveToBinderCard(null);
    window.history.pushState({}, '', routeForPage(page, username));
  }, []);

  const openPricingPage = useCallback(() => {
    setUpgradePromptReason(null);
    navigateToPage('Pricing');
  }, [navigateToPage]);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = readRouteState();
      if (currentPageRef.current === 'FindCards' && nextRoute.page !== 'FindCards') {
        clearGlobalSearchState(`browser navigation from Find Cards to ${nextRoute.page}`);
      }
      setCurrentPage(nextRoute.page);
      setRouteUsername(nextRoute.username ?? '');
      setSocialTab(nextRoute.socialTab ?? 'people');
      setViewedProfile(null);
      setSelectedId(null);
      setSelectedPublicCard(null);
      setSelectedPublicCards([]);
      setSelectedCardBackLabel('Back to Binder');
      setIsAddCardEntryOpen(false);
      setIsFormOpen(false);
      setMoveToBinderCard(null);
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

  const refreshFriendsUnreadCount = useCallback(() => {
    if (!userId) {
      setFriendsUnreadCount(0);
      return;
    }
    fetchUnreadFollowNotificationCount(userId)
      .then(setFriendsUnreadCount)
      .catch((err) => {
        console.warn('Could not load follower notification count:', err);
        setFriendsUnreadCount(0);
      });
  }, [userId]);

  useEffect(() => {
    refreshFriendsUnreadCount();
    if (!userId) return;
    const intervalId = window.setInterval(refreshFriendsUnreadCount, 60_000);
    return () => window.clearInterval(intervalId);
  }, [refreshFriendsUnreadCount, userId]);

  const handleNotificationsRead = useCallback(() => {
    setFriendsUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (!userId || dataLoading || photocards.length !== 0) return;
    if (binderReadyToastUserRef.current === userId) return;
    binderReadyToastUserRef.current = userId;
    setToastMessage('✨ Your binder is ready');
  }, [dataLoading, photocards.length, userId]);

  const handleAddPhotocard = useCallback(async (newPC: Photocard) => {
    if (!user) return false;
    if (!guardTrackedCardLimit(newPC)) return false;
    const wasEmpty = photocards.length === 0;
    const normalizedPC = normalizePhotocardForSave(newPC);
    const templateId = getCardTemplateId(normalizedPC);
    setPhotocards(prev => prev.some((card) => getCardTemplateId(card) === templateId) ? prev : [normalizedPC, ...prev]);
    try {
      const saved = await insertPhotocard(user.id, normalizedPC);
      // Merge: prefer normalizedPC for descriptive fields (category, source, etc.)
      // but take saved.id so we use the DB's authoritative record identity.
      const mergedSaved = normalizePhotocardForSave({ ...saved, ...normalizedPC, id: saved.id, imageUrl: saved.imageUrl ?? normalizedPC.imageUrl });
      const savedTemplateId = getCardTemplateId(mergedSaved);
      setPhotocards(prev => [
        mergedSaved,
        ...prev.filter((pc) => pc.id !== normalizedPC.id && pc.id !== saved.id && getCardTemplateId(pc) !== savedTemplateId),
      ]);
      if (wasEmpty) setToastMessage('✨ Explore Find Cards to discover more photocards');
      return true;
    } catch (err) {
      console.error('Failed to add photocard:', err);
      setPhotocards(prev => prev.filter(pc => pc.id !== normalizedPC.id));
      return false;
    }
  }, [guardTrackedCardLimit, photocards.length, user]);

  const handleUpdatePhotocard = useCallback(async (updatedPC: Photocard) => {
    if (!user) return false;
    const normalizedPC = normalizePhotocardForSave(updatedPC);
    if (normalizedPC.ownerUserId && normalizedPC.ownerUserId !== user.id) return false;
    if (!guardTrackedCardLimit(normalizedPC)) return false;
    setPhotocards(prev => prev.map(pc => pc.id === normalizedPC.id ? normalizedPC : pc));
    try {
      const saved = await updatePhotocard(user.id, normalizedPC);
      const mergedSaved = normalizePhotocardForSave({ ...saved, ...normalizedPC, imageUrl: saved.imageUrl ?? normalizedPC.imageUrl });
      setPhotocards(prev => prev.map(pc => pc.id === mergedSaved.id ? mergedSaved : pc));
      return true;
    } catch (err) {
      console.error('Failed to update photocard:', err);
      return false;
    }
  }, [guardTrackedCardLimit, user]);

  const handleDeletePhotocard = useCallback(async (id: string) => {
    if (!user) return;
    const target = photocards.find(pc => pc.id === id);
    if (target?.ownerUserId && target.ownerUserId !== user.id) return;
    try {
      await deletePhotocard(user.id, id);
      setPhotocards(prev => prev.filter(pc => pc.id !== id));
    } catch (err) {
      console.error('Failed to delete photocard:', err);
    }
  }, [photocards, user]);

  const handleBulkUpdatePartial = useCallback(async (ids: string[], updates: Partial<Photocard>) => {
    if (!user) return;
    if (!plan.canUseBulkEdit) {
      showUpgradePrompt('Bulk Edit is a Pro feature.');
      return;
    }
    const ownedIds = ids.filter((id) => {
      const target = photocards.find(pc => pc.id === id);
      return !target?.ownerUserId || target.ownerUserId === user.id;
    });
    if (ownedIds.length === 0) return;
    const normalizedUpdates = normalizePhotocardUpdates(updates);
    setPhotocards(prev => prev.map(pc => ownedIds.includes(pc.id) ? normalizePhotocardForSave({ ...pc, ...normalizedUpdates }) : pc));
    try {
      await bulkUpdatePhotocards(user.id, ownedIds, normalizedUpdates);
    } catch (err) {
      console.error('Failed to bulk update:', err);
    }
  }, [photocards, plan.canUseBulkEdit, showUpgradePrompt, user]);

  const handleScanImported = useCallback((savedCards: Photocard[]) => {
    const wasEmpty = photocards.length === 0;
    setPhotocards(prev => {
      const savedTemplateIds = new Set(savedCards.map(getCardTemplateId));
      return dedupePhotocardsByTemplateId([...savedCards, ...prev.filter(card => !savedTemplateIds.has(getCardTemplateId(card)))]);
    });
    if (wasEmpty && savedCards.length > 0) setToastMessage('✨ Explore Find Cards to discover more photocards');
  }, [photocards.length]);

  const handleImportPhotocards = useCallback((newData: Photocard[], mode: 'replace' | 'merge') => {
    const nextCards = mode === 'replace'
      ? dedupePhotocardsByTemplateId(newData)
      : (() => {
        const existingTemplateIds = new Set(photocards.map(getCardTemplateId));
        return dedupePhotocardsByTemplateId([...newData.filter(card => !existingTemplateIds.has(getCardTemplateId(card))), ...photocards]);
      })();
    const nextTrackedCount = countTrackedCollectionCards(nextCards);
    if (plan.cardLimit !== null && nextTrackedCount > plan.cardLimit) {
      showUpgradePrompt('Upgrade to Pro to import more owned or on-the-way cards.');
      return;
    }
    setPhotocards(prev => {
      if (mode === 'replace') return dedupePhotocardsByTemplateId(newData);
      const existingTemplateIds = new Set(prev.map(getCardTemplateId));
      return dedupePhotocardsByTemplateId([...newData.filter(card => !existingTemplateIds.has(getCardTemplateId(card))), ...prev]);
    });
  }, [photocards, plan.cardLimit, showUpgradePrompt]);

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
    if (authScreen === 'login' || authScreen === 'signup') {
      return <Login initialMode={authScreen === 'signup' ? 'signup' : 'signin'} onBack={() => setAuthScreen('splash')} />;
    }
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
            />
          </main>
        </div>
      );
    }
    return <Splash onGetStarted={() => setAuthScreen('signup')} onSignIn={() => setAuthScreen('login')} />;
  }

  // Compute card detail state
  const currentCard = selectedPublicCard ?? (selectedId ? (photocards.find(p => p.id === selectedId) ?? null) : null);
  const currentCardIndex = currentCard && !selectedPublicCard ? photocards.findIndex(p => p.id === selectedId) : -1;
  const currentPublicCardIndex = selectedPublicCard ? selectedPublicCards.findIndex(p => p.id === selectedPublicCard.id) : -1;
  const selectedPublicCardMatchState = selectedPublicCard ? getCollectionMatchState(selectedPublicCard, photocards, user.id) : null;
  const selectedPublicCardInCollection = selectedPublicCardMatchState?.isTrackedInBinder ?? false;
  const currentCardIsOwner = currentCard ? isPhotocardOwner(user.id, currentCard) : false;
  const isViewingOwnProfile = currentPage === 'Profile'
    && isProfileOwner(user.id, viewedProfile?.id ?? (
      !viewedProfile && Boolean(profile?.username) && routeUsername.toLowerCase() === profile?.username?.toLowerCase() ? profile?.id : null
    ));
  const navbarCurrentPage = currentPage === 'Profile' && !isViewingOwnProfile ? 'Friends' : currentPage;

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':
        return (
          <Dashboard
            photocards={photocards}
            onEdit={(pc) => setSelectedId(pc.id)}
            onImport={handleImportPhotocards}
          />
        );
      case 'Import':
        if (!plan.canUseImport) {
          return (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[36px] border-2 border-white bg-white/75 px-6 py-16 text-center shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Grid3x3 size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Import from Grid is a Pro feature</h1>
              <p className="mt-3 max-w-md text-sm font-medium leading-6 text-foreground/50">
                Grid Import is included with Pro. Upgrade to split grid images into multiple photocards.
              </p>
              <button
                type="button"
                onClick={() => showUpgradePrompt('Grid Import is a Pro feature.')}
                className="btn-primary-pink mt-7 rounded-2xl px-7 py-4 text-xs font-black uppercase tracking-widest"
              >
                View Pro
              </button>
            </div>
          );
        }
        return (
          <Scan
            onDone={() => navigateToPage('Collection')}
            onImported={handleScanImported}
            plan={plan}
            trackedCardCount={trackedCardCount}
            onUpgradeRequired={showUpgradePrompt}
          />
        );
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
            onOpenCard={(pc, cards) => {
              if (isViewingOwnProfile || isPhotocardOwner(user.id, pc)) {
                setSelectedPublicCard(null);
                setSelectedPublicCards([]);
                setSelectedCardBackLabel('Back to Binder');
                setSelectedId(pc.id);
              } else {
                setSelectedPublicCard(pc);
                setSelectedPublicCards(cards ?? []);
                setSelectedCardBackLabel('Back to Profile');
                setSelectedId(pc.id);
              }
            }}
            onAddToCollection={handleAddPublicCard}
            onAddToWishlist={handleAddWishlistCard}
            onRemoveFromWishlist={handleRemoveWishlistCard}
            onProfileResolved={setViewedProfile}
          />
        );
      case 'FindCards':
        return (
          <FindCards
            currentUserId={user.id}
            ownPhotocards={photocards}
            onOpenCard={(pc, cards) => {
              if (isPhotocardOwner(user.id, pc)) {
                setSelectedPublicCard(null);
                setSelectedPublicCards([]);
                setSelectedCardBackLabel('Back to Search');
                setSelectedId(pc.id);
              } else {
                setSelectedPublicCard(pc);
                setSelectedPublicCards(cards ?? []);
                setSelectedCardBackLabel('Back to Search');
                setSelectedId(pc.id);
              }
            }}
            onAddToCollection={handleAddPublicCard}
            onAddToWishlist={handleAddWishlistCard}
            onRemoveFromWishlist={handleRemoveWishlistCard}
            onRequireAuth={() => window.alert('Sign in or create an account to add cards to your collection.')}
            onSearchInteract={() => {
              if (toastMessage?.includes('Explore Find Cards')) setToastMessage(null);
            }}
          />
        );
      case 'Wishlist':
        return (
          <Wishlist
            photocards={photocards}
            onCardClick={(pc) => { setSelectedCardBackLabel('Back to Wishlist'); setSelectedId(pc.id); }}
            onFindCards={() => navigateToPage('FindCards')}
            onAddWishlistCard={openManualWishlistForm}
            onRemoveFromWishlist={handleRemoveWishlistCard}
          />
        );
      case 'Friends':
        return (
          <Social
            currentUserId={user.id}
            initialTab={socialTab}
            onOpenProfile={(nextProfile) => navigateToPage('Profile', nextProfile.username)}
            onNotificationsRead={handleNotificationsRead}
          />
        );
      case 'Pricing':
        return <Pricing />;
      case 'Collection':
        return (
          <Collection
            photocards={photocards.filter(card => card.status === 'owned' || card.status === 'on_the_way')}
            onDelete={handleDeletePhotocard}
            onBulkUpdate={handleBulkUpdatePartial}
            onCardClick={(pc) => { setSelectedCardBackLabel('Back to Binder'); setSelectedId(pc.id); }}
            onNewCard={handleAddCard}
            onImportGrid={() => navigateToPage('Import')}
            canUseBulkEdit={plan.canUseBulkEdit}
            canUseAdvancedFilters={plan.canUseAdvancedFilters}
            onUpgradeRequired={showUpgradePrompt}
            trackedCardCount={trackedCardCount}
            cardLimit={plan.cardLimit}
            shouldShowUpgradePrompt={plan.shouldShowUpgradePrompt(trackedCardCount)}
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
        friendsUnreadCount={friendsUnreadCount}
        onOpenSettings={() => {
          if (currentPageRef.current === 'FindCards') {
            clearGlobalSearchState('opened account settings from Find Cards');
          }
          setCurrentPage('Account');
          setSelectedId(null);
          setSelectedPublicCard(null);
          setIsAddCardEntryOpen(false);
          setIsFormOpen(false);
        }}
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
        ) : isAddCardEntryOpen ? (
          <AddCardEntry
            onManualAdd={openManualAddForm}
            onImportGrid={() => {
              setIsAddCardEntryOpen(false);
              navigateToPage('Import');
            }}
            onBack={() => setIsAddCardEntryOpen(false)}
          />
        ) : isFormOpen ? (
          <CardForm
            key={formCard?.id ?? 'new'}
            initialData={formCard}
            mode={formMode}
            defaultStatus={formDefaultStatus}
            canUseAdvancedImageEditor={plan.canUseAdvancedImageEditor}
            onUpgradeRequired={showUpgradePrompt}
            onSubmit={async (pc) => {
              const saved = formMode === 'edit'
                ? await handleUpdatePhotocard(pc)
                : await handleAddPhotocard(pc);
              if (saved) setIsFormOpen(false);
            }}
            onDelete={formMode === 'edit' && formCard ? async (id) => {
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
            onBack={() => { setSelectedId(null); setSelectedPublicCard(null); setSelectedPublicCards([]); }}
            onEdit={() => { setFormMode('edit'); setFormCard(currentCard); setIsFormOpen(true); }}
            backLabel={selectedCardBackLabel}
            hasPrev={selectedPublicCard ? currentPublicCardIndex > 0 : currentCardIndex > 0}
            hasNext={selectedPublicCard ? currentPublicCardIndex >= 0 && currentPublicCardIndex < selectedPublicCards.length - 1 : currentCardIndex >= 0 && currentCardIndex < photocards.length - 1}
            onPrev={() => {
              if (selectedPublicCard) {
                const previousCard = selectedPublicCards[currentPublicCardIndex - 1];
                if (previousCard) {
                  setSelectedPublicCard(previousCard);
                  setSelectedId(previousCard.id);
                }
                return;
              }
              setSelectedId(photocards[currentCardIndex - 1].id);
            }}
            onNext={() => {
              if (selectedPublicCard) {
                const nextCard = selectedPublicCards[currentPublicCardIndex + 1];
                if (nextCard) {
                  setSelectedPublicCard(nextCard);
                  setSelectedId(nextCard.id);
                }
                return;
              }
              setSelectedId(photocards[currentCardIndex + 1].id);
            }}
            isOwner={!selectedPublicCard || currentCardIsOwner}
            currentUserId={user.id}
            ownPhotocards={photocards}
            onAddToCollection={handleAddPublicCard}
            onAddToWishlist={handleAddWishlistCard}
            onRemoveFromWishlist={handleRemoveWishlistCard}
            onMoveToBinder={setMoveToBinderCard}
            isInCollection={selectedPublicCardInCollection}
          />
        ) : (
          <div className="px-4 py-5 xl:p-8 max-w-6xl mx-auto w-full">
            {renderPage()}
          </div>
        )}
      </main>
      {toastMessage && (
        <AppToast
          message={toastMessage}
          onClick={toastMessage.includes('Explore Find Cards') ? () => {
            setToastMessage(null);
            navigateToPage('FindCards');
          } : undefined}
          onDismiss={() => setToastMessage(null)}
        />
      )}
      {upgradePromptReason && (
        <UpgradePrompt
          reason={upgradePromptReason}
          onClose={() => setUpgradePromptReason(null)}
          onViewPro={openPricingPage}
        />
      )}
      {moveToBinderCard && (
        <MoveToBinderPrompt
          card={moveToBinderCard}
          onClose={() => setMoveToBinderCard(null)}
          onMove={handleMoveWishlistToBinder}
        />
      )}
    </div>
  );
}
