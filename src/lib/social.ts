import { supabase } from './supabase';
import { formatPhotocardMembers, Photocard, Profile } from '../types';
import { rowToPhotocard } from './db';

export interface SocialCounts {
  followers: number;
  following: number;
}

export interface FollowState extends SocialCounts {
  isFollowing: boolean;
}

export interface PublicProfileBundle {
  profile: Profile;
  counts: FollowState;
  cards: Photocard[];
}

export interface FollowUser extends Profile {
  is_following?: boolean;
}

export interface PublicCardTemplate {
  identity: string;
  card: Photocard;
  wishlistCount: number;
  owner?: Pick<Profile, 'id' | 'username' | 'nickname' | 'display_name' | 'avatar_url'> | null;
}

const PUBLIC_PROFILE_SELECT = 'id,username,nickname,display_name,bio,avatar_url,is_collection_public,is_wishlist_public,is_bio_public,created_at,updated_at';

const PUBLIC_PHOTOCARD_SELECT = [
  'id',
  'user_id',
  'group_name',
  'member',
  'members',
  'category',
  'source',
  'album',
  'era',
  'year',
  'card_name',
  'version',
  'status',
  'condition',
  'is_duplicate',
  'image_url',
  'created_at',
].join(',');

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeIdentityPart(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getCardIdentity(card: Photocard) {
  return [
    normalizeIdentityPart(card.group),
    normalizeIdentityPart(formatPhotocardMembers(card)),
    normalizeIdentityPart(card.era || card.album),
    normalizeIdentityPart(card.source),
    normalizeIdentityPart(card.version || card.cardName),
    normalizeIdentityPart(card.imageUrl),
  ].join('|');
}

export async function fetchPublicProfileByUsername(username: string): Promise<Profile | null> {
  const normalized = normalizeUsername(username.replace(/^@/, ''));
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .eq('username', normalized)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Profile | null;
}

export async function fetchSocialCounts(profileId: string, viewerId?: string | null): Promise<FollowState> {
  const [followersResult, followingResult, viewerResult] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
    viewerId
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('following_id', profileId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (followersResult.error) throw followersResult.error;
  if (followingResult.error) throw followingResult.error;
  if (viewerResult.error) throw viewerResult.error;

  return {
    followers: followersResult.count ?? 0,
    following: followingResult.count ?? 0,
    isFollowing: Boolean(viewerResult.data),
  };
}

export async function fetchPublicProfileBundle(username: string, viewerId?: string | null): Promise<PublicProfileBundle | null> {
  const profile = await fetchPublicProfileByUsername(username);
  if (!profile) return null;

  const [counts, cards] = await Promise.all([
    fetchSocialCounts(profile.id, viewerId),
    fetchPublicPhotocards(profile, viewerId),
  ]);

  return { profile, counts, cards };
}

async function fetchPublicPhotocards(profile: Profile, viewerId?: string | null): Promise<Photocard[]> {
  let request = supabase
    .from('photocards')
    .select(PUBLIC_PHOTOCARD_SELECT)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (viewerId !== profile.id) {
    const canViewCollection = profile.is_collection_public !== false;
    const canViewWishlist = profile.is_wishlist_public !== false;
    if (!canViewCollection && !canViewWishlist) return [];
    if (!canViewCollection) request = request.eq('status', 'wishlist');
    if (!canViewWishlist) request = request.neq('status', 'wishlist');
  }

  const { data, error } = await request;
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(rowToPhotocard);
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) throw new Error('You cannot follow yourself.');
  const { error } = await supabase
    .from('follows')
    .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function searchProfiles(query: string, viewerId?: string | null): Promise<FollowUser[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let request = supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .order('updated_at', { ascending: false })
    .limit(24);

  const safeQuery = trimmed.replace(/[%_]/g, '\\$&');
  request = request.or(`username.ilike.%${safeQuery}%,nickname.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`);

  const { data, error } = await request;
  if (error) throw error;
  return markFollowing((data ?? []) as unknown as Profile[], viewerId);
}

export async function fetchFollowingUsers(userId: string, viewerId?: string | null): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_following_id_fkey(id,username,nickname,display_name,bio,avatar_url,is_collection_public,is_wishlist_public,is_bio_public,created_at,updated_at)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const profiles = (data ?? []).flatMap((row) => {
    const value = row.profiles as unknown as Profile | Profile[] | null;
    return Array.isArray(value) ? value : value ? [value] : [];
  });
  return markFollowing(profiles, viewerId);
}

export async function fetchFollowerUsers(userId: string, viewerId?: string | null): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_follower_id_fkey(id,username,nickname,display_name,bio,avatar_url,is_collection_public,is_wishlist_public,is_bio_public,created_at,updated_at)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const profiles = (data ?? []).flatMap((row) => {
    const value = row.profiles as unknown as Profile | Profile[] | null;
    return Array.isArray(value) ? value : value ? [value] : [];
  });
  return markFollowing(profiles, viewerId);
}

async function markFollowing(profiles: Profile[], viewerId?: string | null): Promise<FollowUser[]> {
  if (!viewerId || profiles.length === 0) return profiles;
  const ids = profiles.map((profile) => profile.id);
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId)
    .in('following_id', ids);
  if (error) throw error;
  const followingIds = new Set((data ?? []).map((row) => row.following_id as string));
  return profiles.map((profile) => ({ ...profile, is_following: followingIds.has(profile.id) }));
}

export async function searchPublicCardTemplates(query: string): Promise<PublicCardTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const safeQuery = trimmed.replace(/[%_]/g, '\\$&');
  const { data: rows, error } = await supabase
    .from('photocards')
    .select(PUBLIC_PHOTOCARD_SELECT)
    .or([
      `group_name.ilike.%${safeQuery}%`,
      `member.ilike.%${safeQuery}%`,
      `card_name.ilike.%${safeQuery}%`,
      `version.ilike.%${safeQuery}%`,
      `album.ilike.%${safeQuery}%`,
      `era.ilike.%${safeQuery}%`,
      `source.ilike.%${safeQuery}%`,
    ].join(','))
    .limit(80);
  if (error) throw error;

  const cardsWithOwners = (rows ?? [])
    .map((row) => {
      const typedRow = row as unknown as Record<string, unknown>;
      return { card: rowToPhotocard(typedRow), ownerId: String(typedRow.user_id ?? '') };
    })
    .filter((entry) => entry.ownerId);
  if (cardsWithOwners.length === 0) return [];

  const ownerIds = Array.from(new Set(cardsWithOwners.map((entry) => entry.ownerId)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .in('id', ownerIds);
  if (profilesError) throw profilesError;

  const profileById = new Map(((profiles ?? []) as unknown as Profile[]).map((profile) => [profile.id, profile]));
  const publicEntries = cardsWithOwners.filter(({ card, ownerId }) => {
    const owner = profileById.get(ownerId);
    if (!owner) return false;
    if (card.status === 'wishlist') return owner.is_wishlist_public !== false;
    return owner.is_collection_public !== false;
  });

  const wishlistCounts = await fetchWishlistCountsForCards(publicEntries.map((entry) => entry.card));
  const grouped = new Map<string, PublicCardTemplate>();

  publicEntries.forEach(({ card, ownerId }) => {
    const identity = getCardIdentity(card);
    const owner = profileById.get(ownerId) ?? null;
    const existing = grouped.get(identity);
    if (!existing) {
      grouped.set(identity, {
        identity,
        card,
        wishlistCount: wishlistCounts.get(identity) ?? 0,
        owner: owner && owner.is_collection_public !== false
          ? {
              id: owner.id,
              username: owner.username,
              nickname: owner.nickname,
              display_name: owner.display_name,
              avatar_url: owner.avatar_url,
            }
          : null,
      });
    } else if (!existing.card.imageUrl && card.imageUrl) {
      grouped.set(identity, { ...existing, card });
    }
  });

  return Array.from(grouped.values()).slice(0, 24);
}

export async function fetchWishlistCountForCard(card: Photocard): Promise<number> {
  const counts = await fetchWishlistCountsForCards([card]);
  return counts.get(getCardIdentity(card)) ?? 0;
}

async function fetchWishlistCountsForCards(cards: Photocard[]): Promise<Map<string, number>> {
  const identities = new Set(cards.map(getCardIdentity));
  if (identities.size === 0) return new Map();

  const { data: wishlistRows, error } = await supabase
    .from('photocards')
    .select(PUBLIC_PHOTOCARD_SELECT)
    .eq('status', 'wishlist')
    .limit(500);
  if (error) throw error;

  const wishlistCardsWithOwners = (wishlistRows ?? [])
    .map((row) => {
      const typedRow = row as unknown as Record<string, unknown>;
      return { card: rowToPhotocard(typedRow), ownerId: String(typedRow.user_id ?? '') };
    })
    .filter((entry) => identities.has(getCardIdentity(entry.card)) && entry.ownerId);
  if (wishlistCardsWithOwners.length === 0) return new Map();

  const ownerIds = Array.from(new Set(wishlistCardsWithOwners.map((entry) => entry.ownerId)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,is_wishlist_public')
    .in('id', ownerIds);
  if (profilesError) throw profilesError;
  const publicWishlistOwnerIds = new Set((profiles ?? []).filter((profile) => profile.is_wishlist_public !== false).map((profile) => profile.id as string));
  const counts = new Map<string, number>();

  wishlistCardsWithOwners.forEach(({ card, ownerId }) => {
    if (!publicWishlistOwnerIds.has(ownerId)) return;
    const identity = getCardIdentity(card);
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  });

  return counts;
}
