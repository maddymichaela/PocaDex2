import { UserPlus, UserCheck } from 'lucide-react';
import { getProfileDisplayName, Profile } from '../types';
import { getProfileUserId } from '../lib/social';

interface UserCardProps {
  profile: Profile & { is_following?: boolean };
  currentUserId?: string | null;
  onOpen: (profile: Profile) => void;
  onFollowToggle?: (profile: Profile & { is_following?: boolean }) => void;
  busy?: boolean;
}

export default function UserCard({ profile, currentUserId, onOpen, onFollowToggle, busy }: UserCardProps) {
  const displayName = getProfileDisplayName(profile);
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const isSelf = currentUserId === getProfileUserId(profile);

  return (
    <article className="glass-card flex flex-col gap-4 rounded-[28px] border-2 border-white p-4 shadow-sm md:flex-row md:items-center">
      <button
        type="button"
        onClick={() => onOpen(profile)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-lg font-black text-primary ring-4 ring-white">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span>{avatarLetter}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-foreground">{displayName}</h3>
          <p className="truncate text-xs font-bold text-primary/65">@{profile.username}</p>
          {profile.bio && profile.is_bio_public !== false && (
            <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground/45">{profile.bio}</p>
          )}
        </div>
      </button>

      {!isSelf && onFollowToggle && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onFollowToggle(profile)}
          className={`flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 ${
            profile.is_following
              ? 'bg-white text-primary ring-2 ring-primary/15 hover:bg-primary/10'
              : 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.01]'
          }`}
        >
          {profile.is_following ? <UserCheck size={15} /> : <UserPlus size={15} />}
          {profile.is_following ? 'Following' : 'Follow'}
        </button>
      )}
    </article>
  );
}
