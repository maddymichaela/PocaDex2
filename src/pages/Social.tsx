import { useCallback, useEffect, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import UserCard from '../components/UserCard';
import { Profile } from '../types';
import {
  fetchFollowerUsers,
  fetchFollowingUsers,
  followUser,
  FollowUser,
  searchProfiles,
  unfollowUser,
} from '../lib/social';

type SocialTab = 'people' | 'following' | 'followers';

interface SocialProps {
  currentUserId: string;
  onOpenProfile: (profile: Profile) => void;
  initialTab?: SocialTab;
}

export default function Social({ currentUserId, onOpenProfile, initialTab = 'people' }: SocialProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>(
    initialTab === 'following' || initialTab === 'followers' ? initialTab : 'people'
  );
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextUsers = activeTab === 'following'
        ? await fetchFollowingUsers(currentUserId, currentUserId)
        : activeTab === 'followers'
          ? await fetchFollowerUsers(currentUserId, currentUserId)
          : await searchProfiles(query, currentUserId);
      setUsers(nextUsers.filter((profile) => activeTab !== 'people' || profile.id !== currentUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load results.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentUserId, query]);

  useEffect(() => {
    if (activeTab === 'people' && !query.trim()) {
      setLoading(false);
      setUsers([]);
      return;
    }
    const timeout = window.setTimeout(loadUsers, activeTab === 'people' ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [loadUsers, activeTab, query]);

  const handleFollowToggle = async (profile: FollowUser) => {
    setBusyId(profile.id);
    const wasFollowing = Boolean(profile.is_following);
    setUsers((current) => current.map((u) => u.id === profile.id ? { ...u, is_following: !wasFollowing } : u));
    try {
      if (wasFollowing) await unfollowUser(currentUserId, profile.id);
      else await followUser(currentUserId, profile.id);
      if (activeTab === 'following' && wasFollowing) {
        setUsers((current) => current.filter((u) => u.id !== profile.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Follow action failed.');
      setUsers((current) => current.map((u) => u.id === profile.id ? { ...u, is_following: wasFollowing } : u));
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: SocialTab; label: string }[] = [
    { id: 'people', label: 'People' },
    { id: 'following', label: 'Following' },
    { id: 'followers', label: 'Followers' },
  ];

  const emptyMessage = !query.trim() && activeTab === 'people'
    ? 'Search by username to find friends.'
    : activeTab === 'people'
      ? 'No users found.'
      : `No ${activeTab} yet.`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Friends</h1>
        <p className="text-sm font-medium text-foreground/45">Find collectors, follow friends, and peek at public binders.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-1 rounded-2xl border-2 border-white bg-white/75 p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setQuery(''); }}
              className={`h-11 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-foreground/45 hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'people' && (
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border-2 border-white bg-white/85 pl-11 pr-4 text-sm font-semibold outline-none shadow-sm transition-all placeholder:text-foreground/25 focus:border-primary/30"
              placeholder="Search by username or display name…"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : users.length > 0 ? (
        <div className="grid gap-3">
          {users.map((profile) => (
            <UserCard
              key={profile.id}
              profile={profile}
              currentUserId={currentUserId}
              onOpen={onOpenProfile}
              onFollowToggle={handleFollowToggle}
              busy={busyId === profile.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[36px] border-2 border-white bg-white/75 px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <UsersRound size={24} />
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground/30">
            {emptyMessage}
          </p>
        </div>
      )}
    </div>
  );
}
