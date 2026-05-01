import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Heart, Lock, Plus, Sparkles, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { PhotocardCard, PhotocardGrid } from '../components/PhotocardGrid';
import { getProfileDisplayName, Photocard, Profile } from '../types';
import { fetchPublicProfileBundle, followUser, getCardTemplateId, getProfileUserId, PublicProfileBundle, unfollowUser } from '../lib/social';

type ProfileTab = 'collection' | 'wishlist' | 'about';

interface PublicProfileProps {
  username: string;
  currentUserId?: string | null;
  ownProfile?: Profile | null;
  ownPhotocards: Photocard[];
  onEditProfile: () => void;
  onOpenCard?: (card: Photocard) => void;
  onCopyCard?: (card: Photocard, status: 'owned' | 'wishlist') => Promise<void>;
  onProfileResolved?: (profile: Profile | null) => void;
}

function PrivateState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[36px] border-2 border-white bg-white/70 px-6 py-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Lock size={24} />
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-foreground/35">This {label} is private.</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[36px] border-2 border-white bg-white/70 px-6 py-16 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-secondary/10 text-secondary">
        <Sparkles size={24} />
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-foreground/30">No {label} shared yet</p>
    </div>
  );
}

function CardErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[36px] border-2 border-red-100 bg-red-50 px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-black uppercase tracking-widest text-red-500">Could not load cards</p>
      <p className="mt-2 max-w-md text-sm font-medium text-red-500/70">{message}</p>
    </div>
  );
}

export default function PublicProfile({
  username,
  currentUserId,
  ownProfile,
  ownPhotocards,
  onEditProfile,
  onOpenCard,
  onCopyCard,
  onProfileResolved,
}: PublicProfileProps) {
  const [bundle, setBundle] = useState<PublicProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('collection');
  const [followBusy, setFollowBusy] = useState(false);
  const [copiedOwnedIdentities, setCopiedOwnedIdentities] = useState<Set<string>>(() => new Set());
  const [copiedWishlistIdentities, setCopiedWishlistIdentities] = useState<Set<string>>(() => new Set());

  const isOwnProfileRoute = ownProfile?.username?.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setError(null);

    if (isOwnProfileRoute && ownProfile) {
      setBundle({
        profile: ownProfile,
        counts: { followers: 0, following: 0, isFollowing: false },
        cards: ownPhotocards,
      });
      fetchPublicProfileBundle(username, currentUserId)
        .then((nextBundle) => {
          if (isCurrent && nextBundle) setBundle({ ...nextBundle, cards: ownPhotocards, cardsError: null });
        })
        .catch(() => {
          if (isCurrent) setBundle((current) => current);
        })
        .finally(() => {
          if (isCurrent) setLoading(false);
        });
    } else {
      fetchPublicProfileBundle(username, currentUserId)
        .then((nextBundle) => {
          if (!isCurrent) return;
          setBundle(nextBundle);
          if (!nextBundle) setError('We could not find that collector.');
        })
        .catch((err) => {
          if (isCurrent) setError(err instanceof Error ? err.message : 'Profile could not be loaded.');
        })
        .finally(() => {
          if (isCurrent) setLoading(false);
        });
    }

    return () => {
      isCurrent = false;
    };
  }, [currentUserId, isOwnProfileRoute, ownPhotocards, ownProfile, username]);

  useEffect(() => {
    if (!isOwnProfileRoute || !ownProfile) return;
    setBundle((current) => current ? { ...current, profile: ownProfile, cards: ownPhotocards } : current);
  }, [isOwnProfileRoute, ownPhotocards, ownProfile]);

  useEffect(() => {
    onProfileResolved?.(bundle?.profile ?? null);
  }, [bundle?.profile, onProfileResolved]);

  useEffect(() => {
    setCopiedOwnedIdentities(new Set(ownPhotocards.filter((card) => card.status === 'owned').map(getCardTemplateId)));
    setCopiedWishlistIdentities(new Set(ownPhotocards.filter((card) => card.status === 'wishlist').map(getCardTemplateId)));
  }, [ownPhotocards]);

  const cards = bundle?.cards ?? [];
  const ownedCards = useMemo(() => cards.filter((card) => card.status === 'owned'), [cards]);
  const wishlistCards = useMemo(() => cards.filter((card) => card.status === 'wishlist'), [cards]);
  const onTheWayCount = useMemo(() => cards.filter((card) => card.status === 'on_the_way').length, [cards]);
  const [copyingCardId, setCopyingCardId] = useState<string | null>(null);

  const handleFollowToggle = async () => {
    if (!bundle) return;
    if (!currentUserId) {
      setError('Sign in to follow collectors.');
      return;
    }
    const profileUserId = getProfileUserId(bundle.profile);
    if (currentUserId === profileUserId) return;
    setFollowBusy(true);
    const wasFollowing = bundle.counts.isFollowing;
    setBundle((current) => current ? {
      ...current,
      counts: {
        ...current.counts,
        isFollowing: !wasFollowing,
        followers: current.counts.followers + (wasFollowing ? -1 : 1),
      },
    } : current);
    try {
      if (wasFollowing) await unfollowUser(currentUserId, profileUserId);
      else await followUser(currentUserId, profileUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Follow action failed.');
      setBundle((current) => current ? {
        ...current,
        counts: {
          ...current.counts,
          isFollowing: wasFollowing,
          followers: current.counts.followers + (wasFollowing ? 1 : -1),
        },
      } : current);
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="mx-auto max-w-xl rounded-[36px] border-2 border-white bg-white/75 p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-foreground">Collector not found</h1>
        <p className="mt-2 text-sm font-medium text-foreground/45">{error ?? 'This profile may have moved.'}</p>
      </div>
    );
  }

  const { profile, counts } = bundle;
  const isViewingSelf = currentUserId === getProfileUserId(profile);
  const cardLoadError = bundle.cardsError ?? null;
  const displayName = getProfileDisplayName(profile);
  const showBio = profile.is_bio_public !== false && Boolean(profile.bio);
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: 'collection', label: 'Collection' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'about', label: 'About' },
  ];

  const renderSharedGrid = (nextCards: Photocard[]) => {
    if (isViewingSelf) return <PhotocardGrid photocards={nextCards} onCardClick={onOpenCard} />;

    return (
      <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-4 md:max-lg:gap-4 xl:grid-cols-5 lg:gap-6">
        {nextCards.map((card, index) => {
          const identity = getCardTemplateId(card);
          const inCollection = copiedOwnedIdentities.has(identity);
          const inWishlist = copiedWishlistIdentities.has(identity);
          const alreadySaved = inCollection || inWishlist;
          const collecting = copyingCardId === `${identity}:owned`;
          const wishlisting = copyingCardId === `${identity}:wishlist`;
          return (
            <div key={card.id} className="flex h-full flex-col gap-2">
              <PhotocardCard photocard={card} index={index} infoMode="public-profile" className="flex-1" />
              {currentUserId && onCopyCard && (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={alreadySaved || collecting}
                    onClick={async (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setCopyingCardId(`${identity}:owned`);
                      setCopiedOwnedIdentities((current) => new Set(current).add(identity));
                      try {
                        await onCopyCard(card, 'owned');
                      } catch (err) {
                        setCopiedOwnedIdentities((current) => {
                          const next = new Set(current);
                          next.delete(identity);
                          return next;
                        });
                        setError(err instanceof Error ? err.message : 'Could not add card to your collection.');
                      } finally {
                        setCopyingCardId(null);
                      }
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-primary px-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all disabled:bg-white disabled:text-primary disabled:ring-2 disabled:ring-primary/15"
                  >
                    {inCollection ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                    {collecting ? 'Adding...' : inCollection ? 'In Collection' : inWishlist ? 'Wishlisted' : 'Collect'}
                  </button>
                  <button
                    type="button"
                    disabled={alreadySaved || wishlisting}
                    onClick={async (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setCopyingCardId(`${identity}:wishlist`);
                      setCopiedWishlistIdentities((current) => new Set(current).add(identity));
                      try {
                        await onCopyCard(card, 'wishlist');
                      } catch (err) {
                        setCopiedWishlistIdentities((current) => {
                          const next = new Set(current);
                          next.delete(identity);
                          return next;
                        });
                        setError(err instanceof Error ? err.message : 'Could not add card to your wishlist.');
                      } finally {
                        setCopyingCardId(null);
                      }
                    }}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-[var(--wishlist-red)] px-2 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all disabled:bg-white disabled:text-[var(--wishlist-red)] disabled:ring-2 disabled:ring-red-100"
                  >
                    <Heart size={13} className={inWishlist ? 'fill-current' : undefined} />
                    {wishlisting ? 'Adding...' : inWishlist ? 'Wishlisted' : inCollection ? 'In Collection' : 'Wishlist'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-16">
      {error && (
        <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
          {error}
        </div>
      )}

      <section className="glass-card rounded-[36px] border-2 border-white p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[30px] bg-primary/15 text-4xl font-black text-primary ring-4 ring-white">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight text-foreground md:text-4xl">{displayName}</h1>
              <p className="mt-1 text-sm font-black text-primary/65">@{profile.username}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-widest text-foreground/35">
                <span>{counts.followers} {counts.followers === 1 ? 'Follower' : 'Followers'}</span>
                <span className="text-primary/30">•</span>
                <span>{counts.following} Following</span>
              </div>
              {showBio && <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-foreground/55">{profile.bio}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            {isViewingSelf ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="flex items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-xs font-black uppercase tracking-widest text-primary shadow-sm ring-2 ring-primary/10 transition-all hover:bg-primary hover:text-white"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>
            ) : currentUserId ? (
              <button
                type="button"
                disabled={followBusy}
                onClick={handleFollowToggle}
                className={`flex items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 ${
                  counts.isFollowing
                    ? 'bg-white text-primary ring-2 ring-primary/15 hover:bg-primary/10'
                    : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.01]'
                }`}
              >
                {counts.isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                {counts.isFollowing ? '- Unfollow' : '+ Follow'}
              </button>
            ) : (
              <div className="rounded-[22px] bg-white px-5 py-4 text-center text-xs font-black uppercase tracking-widest text-foreground/35 shadow-sm ring-2 ring-primary/10">
                Sign in to Follow
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 rounded-[26px] bg-white/75 p-2 shadow-sm">
              {[
                { label: 'Owned', value: ownedCards.length },
                { label: 'Wishlist', value: wishlistCards.length },
                { label: 'OTW', value: onTheWayCount },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 rounded-2xl bg-primary/5 px-3 py-3 text-center">
                  <p className="text-lg font-black leading-none text-foreground">{stat.value}</p>
                  <p className="mt-1 truncate text-[9px] font-black uppercase tracking-widest text-foreground/35">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border-2 border-white bg-white/75 p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`h-11 flex-1 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-foreground/45 hover:text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          {activeTab === 'collection' && (
            cardLoadError
              ? <CardErrorState message={cardLoadError} />
              : profile.is_collection_public === false && !isViewingSelf
              ? <PrivateState label="collection" />
              : ownedCards.length > 0
                ? renderSharedGrid(ownedCards)
                : <EmptyState label="collection cards" />
          )}
          {activeTab === 'wishlist' && (
            cardLoadError
              ? <CardErrorState message={cardLoadError} />
              : profile.is_wishlist_public === false && !isViewingSelf
              ? <PrivateState label="wishlist" />
              : wishlistCards.length > 0
                ? renderSharedGrid(wishlistCards)
                : <EmptyState label="wishlist cards" />
          )}
          {activeTab === 'about' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[32px] border-2 border-white bg-white/75 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <UsersRound size={18} />
                  <h2 className="text-xl font-bold text-foreground">Collector Notes</h2>
                </div>
                {showBio ? (
                  <p className="text-sm font-medium leading-6 text-foreground/60">{profile.bio}</p>
                ) : (
                  <p className="text-sm font-black uppercase tracking-widest text-foreground/30">Bio is private or empty.</p>
                )}
              </div>
              <div className="rounded-[32px] border-2 border-white bg-white/75 p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[var(--wishlist-red)]">
                  <Heart size={18} className="fill-current" />
                  <h2 className="text-xl font-bold text-foreground">Sharing</h2>
                </div>
                <div className="space-y-2 text-sm font-bold text-foreground/50">
                  <p>Collection: {profile.is_collection_public === false ? 'Private' : 'Public'}</p>
                  <p>Wishlist: {profile.is_wishlist_public === false ? 'Private' : 'Public'}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
