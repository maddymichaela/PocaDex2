import { supabase } from './supabase';
import { getPhotocardBaseIdentity, getPhotocardTemplateId, Photocard, Profile } from '../types';
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
  cardsError?: string | null;
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

type FollowListTab = 'following' | 'followers';
type SocialQueryStage = 'follow-query' | 'profile-query' | 'follow-state-query';

const PUBLIC_PROFILE_SELECT = 'id,username,nickname,display_name,bio,avatar_url,is_collection_public,is_wishlist_public,is_bio_public,created_at,updated_at';
const LEGACY_PUBLIC_PROFILE_SELECT = 'id,username,nickname,bio,avatar_url,created_at,updated_at';
const FOLLOW_PROFILE_SELECT = 'id,username,display_name,avatar_url,bio,nickname';

const PUBLIC_PHOTOCARD_SELECT = [
  'id',
  'user_id',
  'card_template_id',
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
  'notes',
  'image_url',
  'created_at',
].join(',');

const LEGACY_PUBLIC_PHOTOCARD_SELECT = [
  'id',
  'user_id',
  'group_name',
  'member',
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

const GLOBAL_SEARCH_SUPABASE_FIELDS = [
  'group_name',
  'member',
  'members',
  'card_name',
  'name',
  'version',
  'category',
  'album',
  'album_name',
  'albumName',
  'era',
  'source',
  'source_name',
  'sourceName',
  'shop',
  'store',
  'event',
  'benefit',
  'pob',
  'card_template_id',
  'cardTemplateId',
  'notes',
] as const;

const GLOBAL_SEARCH_CORE_SUPABASE_FIELDS = [
  'group_name',
  'member',
  'card_name',
  'version',
  'category',
  'album',
  'era',
  'source',
  'card_template_id',
  'notes',
] as const;

const GLOBAL_SEARCH_OPTIONAL_SUPABASE_FIELDS = [
  'members',
  'name',
  'album_name',
  'albumName',
  'source_name',
  'sourceName',
  'shop',
  'store',
  'event',
  'benefit',
  'pob',
  'cardTemplateId',
] as const;

const LEGACY_GLOBAL_SEARCH_SUPABASE_FIELDS = [
  'group_name',
  'member',
  'card_name',
  'version',
  'album',
  'era',
] as const;

const GLOBAL_SEARCH_DESCRIPTIVE_FIELDS = [
  'source',
  'sourceName',
  'source_name',
  'shop',
  'store',
  'event',
  'benefit',
  'pob',
  'category',
  'album',
  'albumName',
  'album_name',
  'era',
  'version',
  'cardName',
  'card_name',
  'name',
  'member',
  'members',
  'group',
  'groupName',
  'group_name',
  'cardTemplateId',
  'card_template_id',
  'notes',
] as const;

const GLOBAL_SEARCH_CLIENT_SUPPLEMENT_LIMIT = 500;
const GLOBAL_SEARCH_RESULT_LIMIT = 24;

const GLOBAL_SEARCH_FIELD_WEIGHTS = {
  member: 130,
  group: 120,
  alias: 115,
  cardName: 100,
  source: 70,
  album: 65,
  era: 55,
  version: 55,
  category: 50,
  notes: 10,
  other: 25,
} as const;

type GlobalSearchFieldWeight = keyof typeof GLOBAL_SEARCH_FIELD_WEIGHTS;
type GlobalSearchFieldEntry = {
  field: string;
  weight: GlobalSearchFieldWeight;
  values: string[];
  aliasValues?: string[];
};

const MEMBER_ALIASES: Record<string, string[]> = {
  'Bang Chan': ['chan', 'chris', 'christopher', 'channie'],
  'Lee Know': ['leeknow', 'minho', 'lee minho'],
  Changbin: ['binnie'],
  Hyunjin: ['hyun jin', 'hyune'],
  Han: ['jisung', 'han jisung'],
  Felix: ['lix', 'yongbok', 'lee felix'],
  Seungmin: ['seung min'],
  'I.N': ['in', 'jeongin', 'yang jeongin', 'innie'],
};

const NORMALIZED_MEMBER_ALIASES = Object.entries(MEMBER_ALIASES).reduce((lookup, [canonical, aliases]) => {
  const canonicalKey = normalizeSearchText(canonical);
  const aliasValues = [canonical, ...aliases].map(normalizeSearchText).filter(Boolean);
  aliasValues.forEach((alias) => lookup.set(alias, canonicalKey));
  lookup.set(canonicalKey, canonicalKey);
  return lookup;
}, new Map<string, string>());

const MEMBER_ALIAS_VALUES_BY_CANONICAL = Object.entries(MEMBER_ALIASES).reduce((lookup, [canonical, aliases]) => {
  const canonicalKey = normalizeSearchText(canonical);
  lookup.set(canonicalKey, Array.from(new Set([canonical, ...aliases].map(normalizeSearchText).filter(Boolean))));
  return lookup;
}, new Map<string, string[]>());

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function getProfileUserId(profile: Pick<Profile, 'id'>) {
  return profile.id;
}

function logSocialQuery(label: string, value: unknown) {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug(`[social] ${label}`, value);
  }
}

function logGlobalSearchMetadata(label: string, value: unknown) {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug(`[PocaDex global search debug] ${label}`, value);
    console.debug(`[PocaDex global search card display debug] ${label}`, value);
  }
}

function logGlobalSearchQueryDebug(value: unknown) {
  if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug('[PocaDex global search query debug]', value);
  }
}

function getSupabaseErrorDetails(error: unknown) {
  const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown } | null;
  return {
    message: typeof value?.message === 'string' ? value.message : String(error),
    details: value?.details ?? null,
    hint: value?.hint ?? null,
    code: value?.code ?? null,
  };
}

function logSocialError(context: {
  currentUserId?: string | null;
  tab?: FollowListTab | 'people';
  stage: SocialQueryStage;
  error: unknown;
  ids?: string[];
}) {
  if (!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return;
  const details = getSupabaseErrorDetails(context.error);
  console.error('[social] Supabase request failed', {
    currentUserId: context.currentUserId,
    tab: context.tab,
    stage: context.stage,
    ids: context.ids,
    error: details,
    rawError: context.error,
  });
}

function createSocialDataError(context: {
  currentUserId?: string | null;
  tab?: FollowListTab | 'people';
  stage: SocialQueryStage;
  error: unknown;
  ids?: string[];
}) {
  logSocialError(context);
  const details = getSupabaseErrorDetails(context.error);
  const label = context.tab ? `${context.tab} ${context.stage}` : context.stage;
  const error = new Error(`Could not load results (${label}): ${details.message}`);
  return error;
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_]/g, '\\$&');
}

export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/&/g, 'and')
    .replace(/[\s._-]+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeSearchWords(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(normalizeSearchText)
    .filter(Boolean);
}

function getSearchTerms(query: string) {
  const compactQuery = normalizeSearchText(query);
  const wordTerms = normalizeSearchWords(query);
  if (!compactQuery) return [];
  if (wordTerms.length <= 1) return [compactQuery];
  if (wordTerms.every((term) => term.length === 1)) return [compactQuery];
  return Array.from(new Set(wordTerms));
}

function getAliasTerms(value: unknown) {
  const normalized = normalizeSearchText(value);
  const canonical = NORMALIZED_MEMBER_ALIASES.get(normalized);
  if (!canonical) return [];
  return MEMBER_ALIAS_VALUES_BY_CANONICAL.get(canonical) ?? [canonical];
}

function isMissingColumnError(error: unknown, columns: string[]) {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String((error as { message: unknown }).message);
  return columns.some((column) => (
    message.includes(`'${column}' column`) ||
    message.includes(`column "${column}"`) ||
    message.includes(`.${column}`) ||
    message.includes(` ${column} `)
  ));
}

function isUnsupportedSearchFieldError(error: unknown) {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String((error as { message: unknown }).message).toLowerCase();
  return message.includes('operator does not exist') || message.includes('invalid input syntax');
}

function withPublicProfileDefaults(profile: Partial<Profile>): Profile {
  const userId = profile.id || '';
  const now = new Date(0).toISOString();
  return {
    nickname: null,
    bio: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
    ...profile,
    id: userId,
    username: profile.username ?? '',
    display_name: profile.display_name ?? profile.nickname ?? profile.username,
    is_collection_public: profile.is_collection_public ?? true,
    is_wishlist_public: profile.is_wishlist_public ?? true,
    is_bio_public: profile.is_bio_public ?? true,
  };
}

function createFallbackProfile(userId: string): Profile {
  return withPublicProfileDefaults({
    id: userId,
    username: `unknown-${userId.slice(0, 8)}`,
    display_name: 'Unknown collector',
    nickname: 'Unknown collector',
    bio: null,
    avatar_url: null,
  });
}

export function getCardIdentity(card: Photocard) {
  return getPhotocardTemplateId(card);
}

export function getCardTemplateId(card: Photocard) {
  return getPhotocardTemplateId(card);
}

export async function fetchPublicProfileByUsername(username: string): Promise<Profile | null> {
  const normalized = normalizeUsername(username.replace(/^@/, ''));
  const runProfileLookup = (select: string) => supabase
    .from('profiles')
    .select(select)
    .ilike('username', normalized)
    .limit(1)
    .maybeSingle();

  const { data, error } = await runProfileLookup(PUBLIC_PROFILE_SELECT);
  if (error && isMissingColumnError(error, ['display_name', 'is_collection_public', 'is_wishlist_public', 'is_bio_public'])) {
    const { data: legacyData, error: legacyError } = await runProfileLookup(LEGACY_PUBLIC_PROFILE_SELECT);
    if (legacyError) throw legacyError;
    return legacyData ? withPublicProfileDefaults(legacyData as unknown as Profile) : null;
  }
  if (error) throw error;
  return data ? withPublicProfileDefaults(data as unknown as Profile) : null;
}

export async function fetchSocialCounts(profileUserId: string, viewerId?: string | null): Promise<FollowState> {
  const [followersResult, followingResult, viewerResult] = await Promise.all([
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('following_id', profileUserId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', profileUserId),
    viewerId
      ? supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', viewerId)
          .eq('following_id', profileUserId)
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
  const profileUserId = getProfileUserId(profile);

  const [counts, cardsResult] = await Promise.all([
    fetchSocialCounts(profileUserId, viewerId).catch((error) => {
      console.warn('Could not load social counts:', error);
      return { followers: 0, following: 0, isFollowing: false };
    }),
    fetchPublicPhotocards(profile, viewerId)
      .then((cards) => ({ cards, cardsError: null }))
      .catch((error) => {
        console.warn('Could not load public photocards:', error);
        return {
          cards: [],
          cardsError: error instanceof Error ? error.message : 'Could not load photocards.',
        };
      }),
  ]);

  return { profile, counts, cards: cardsResult.cards, cardsError: cardsResult.cardsError };
}

async function fetchPublicPhotocards(profile: Profile, viewerId?: string | null): Promise<Photocard[]> {
  const profileUserId = getProfileUserId(profile);
  const filterDescription = { table: 'photocards', column: 'user_id', value: profileUserId };
  const applyVisibility = <T extends {
    eq: (column: string, value: unknown) => T;
    neq: (column: string, value: unknown) => T;
    limit: (count: number) => T;
  }>(request: T): T => {
    if (viewerId === profileUserId) return request;

    const canViewCollection = profile.is_collection_public !== false;
    const canViewWishlist = profile.is_wishlist_public !== false;
    if (!canViewCollection && !canViewWishlist) return request.limit(0) as T;
    if (!canViewCollection) return request.eq('status', 'wishlist') as T;
    if (!canViewWishlist) return request.neq('status', 'wishlist') as T;
    return request;
  };

  const request = applyVisibility(supabase
    .from('photocards')
    .select('*')
    .eq('user_id', getProfileUserId(profile))
    .order('created_at', { ascending: false }));

  const { data, error } = await request;
  logSocialQuery('public photocard query', {
    profileId: profileUserId,
    currentUserId: viewerId ?? null,
    filter: filterDescription,
    returnedCount: data?.length ?? 0,
    error: error ? getSupabaseErrorDetails(error) : null,
  });
  if (error && isMissingColumnError(error, ['members', 'category', 'source', 'card_template_id'])) {
    const legacyRequest = applyVisibility(supabase
      .from('photocards')
      .select(LEGACY_PUBLIC_PHOTOCARD_SELECT)
      .eq('user_id', getProfileUserId(profile))
      .order('created_at', { ascending: false }));
    const { data: legacyData, error: legacyError } = await legacyRequest;
    if (legacyError) throw legacyError;
    logSocialQuery('public photocard legacy query', {
      profileId: profileUserId,
      currentUserId: viewerId ?? null,
      filter: filterDescription,
      returnedCount: legacyData?.length ?? 0,
      error: null,
    });
    return ((legacyData ?? []) as unknown as Record<string, unknown>[]).map((row) => {
      const card = rowToPhotocard(row);
      if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
        console.debug('[PocaDex friend profile card metadata debug]', {
          rawFriendProfileCardResult: row,
          mappedCard: card,
          category: card.category,
          album: card.album,
          albumName: row.albumName ?? row.album_name,
          source: card.source,
          sourceName: row.sourceName ?? row.source_name,
          shop: row.shop,
          store: row.store,
          event: row.event,
          benefit: row.benefit,
          pob: row.pob,
        });
      }
      return card;
    });
  }
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const card = rowToPhotocard(row);
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
      console.debug('[PocaDex friend profile card metadata debug]', {
        rawFriendProfileCardResult: row,
        mappedCard: card,
        category: card.category,
        album: card.album,
        albumName: row.albumName ?? row.album_name,
        source: card.source,
        sourceName: row.sourceName ?? row.source_name,
        shop: row.shop,
        store: row.store,
        event: row.event,
        benefit: row.benefit,
        pob: row.pob,
      });
    }
    return card;
  });
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
  const trimmed = query.trim().replace(/^@/, '');
  if (!trimmed) return [];

  const safeQuery = escapeLikePattern(trimmed);
  const runProfileSearch = (select: string, includeDisplayName: boolean) => {
    const fields = [
      `username.ilike.%${safeQuery}%`,
      `nickname.ilike.%${safeQuery}%`,
      ...(includeDisplayName ? [`display_name.ilike.%${safeQuery}%`] : []),
    ];
    return supabase
      .from('profiles')
      .select(select)
      .or(fields.join(','))
      .limit(24);
  };

  const { data, error } = await runProfileSearch(PUBLIC_PROFILE_SELECT, true);
  if (error && isMissingColumnError(error, ['display_name', 'is_collection_public', 'is_wishlist_public', 'is_bio_public'])) {
    const { data: legacyData, error: legacyError } = await runProfileSearch(LEGACY_PUBLIC_PROFILE_SELECT, false);
    if (legacyError) throw createSocialDataError({ currentUserId: viewerId, tab: 'people', stage: 'profile-query', error: legacyError });
    return hydrateFollowState(((legacyData ?? []) as unknown as Profile[]).map(withPublicProfileDefaults), viewerId);
  }
  if (error) throw createSocialDataError({ currentUserId: viewerId, tab: 'people', stage: 'profile-query', error });
  return hydrateFollowState(((data ?? []) as unknown as Profile[]).map(withPublicProfileDefaults), viewerId);
}

export async function fetchFollowingUsers(userId: string, viewerId?: string | null): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', userId);
  logSocialQuery('following follow records', { currentUserId: userId, data, error });
  if (error) throw createSocialDataError({ currentUserId: userId, tab: 'following', stage: 'follow-query', error });
  const ids = (data ?? []).map((row) => row.following_id as string).filter(Boolean);
  return fetchFollowUsersByIds(ids, viewerId, true, 'following');
}

export async function fetchFollowerUsers(userId: string, viewerId?: string | null): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('*')
    .eq('following_id', userId);
  logSocialQuery('follower follow records', { currentUserId: userId, data, error });
  if (error) throw createSocialDataError({ currentUserId: userId, tab: 'followers', stage: 'follow-query', error });
  const ids = (data ?? []).map((row) => row.follower_id as string).filter(Boolean);
  return fetchFollowUsersByIds(ids, viewerId, false, 'followers');
}

async function fetchFollowUsersByIds(ids: string[], viewerId?: string | null, knownFollowing = false, tab?: FollowListTab): Promise<FollowUser[]> {
  if (ids.length === 0) return [];
  const uniqueIds = Array.from(new Set(ids));
  const profileById = await fetchProfilesByUserIds(uniqueIds, viewerId, tab);
  const missingProfileIds = uniqueIds.filter((id) => !profileById.has(id));
  if (missingProfileIds.length > 0 && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
    console.warn('[social] Follow rows exist without matching profile rows', {
      currentUserId: viewerId,
      tab,
      missingProfileIds,
      note: 'If profiles query returned zero rows without an error, check profiles RLS or missing profile records.',
    });
  }
  const profiles = ids.flatMap((id) => {
    return profileById.get(id) ?? createFallbackProfile(id);
  });
  if (knownFollowing) return profiles.map((profile) => ({ ...profile, is_following: true }));
  return hydrateFollowState(profiles, viewerId);
}

async function hydrateFollowState(profiles: Profile[], viewerId?: string | null, tab?: FollowListTab | 'people'): Promise<FollowUser[]> {
  if (!viewerId) return profiles;
  try {
    return await markFollowing(profiles, viewerId, tab);
  } catch (error) {
    console.warn('Could not hydrate follow button state:', error);
    return profiles.map((profile) => ({ ...profile, is_following: false }));
  }
}

async function markFollowing(profiles: Profile[], viewerId?: string | null, tab?: FollowListTab | 'people'): Promise<FollowUser[]> {
  if (!viewerId || profiles.length === 0) return profiles;
  const ids = profiles.map(getProfileUserId);
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', viewerId)
    .in('following_id', ids);
  logSocialQuery('follow state records', { currentUserId: viewerId, profileUserIds: ids, data, error });
  if (error) {
    throw createSocialDataError({ currentUserId: viewerId, tab, stage: 'follow-state-query', ids, error });
  }
  const followingIds = new Set((data ?? []).map((row) => row.following_id as string));
  return profiles.map((profile) => ({ ...profile, is_following: followingIds.has(getProfileUserId(profile)) }));
}

async function fetchProfilesByUserIds(userIds: string[], currentUserId?: string | null, tab?: FollowListTab): Promise<Map<string, Profile>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select(FOLLOW_PROFILE_SELECT)
    .in('id', userIds);
  logSocialQuery('follow profile records', { userIds, data, error });
  if (error) throw createSocialDataError({ currentUserId, tab, stage: 'profile-query', ids: userIds, error });

  return new Map(((data ?? []) as unknown as Partial<Profile>[]).map((profile) => {
    const normalized = withPublicProfileDefaults(profile);
    return [getProfileUserId(normalized), normalized];
  }));
}

async function fetchProfilesById(ownerIds: string[]): Promise<Map<string, Profile>> {
  if (ownerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_SELECT)
    .in('id', ownerIds);
  if (error && isMissingColumnError(error, ['display_name', 'is_collection_public', 'is_wishlist_public', 'is_bio_public'])) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('profiles')
      .select(LEGACY_PUBLIC_PROFILE_SELECT)
      .in('id', ownerIds);
    if (legacyError) throw legacyError;
    return new Map(((legacyData ?? []) as unknown as Profile[]).map((profile) => {
      const normalized = withPublicProfileDefaults(profile);
      return [getProfileUserId(normalized), normalized];
    }));
  }
  if (error) throw error;
  return new Map(((data ?? []) as unknown as Profile[]).map((profile) => {
    const normalized = withPublicProfileDefaults(profile);
    return [getProfileUserId(normalized), normalized];
  }));
}

async function hydrateGlobalSearchRows(rows: unknown[]): Promise<unknown[]> {
  const ids = Array.from(new Set(rows.map((row) => String((row as Record<string, unknown>).id ?? '')).filter(Boolean)));
  if (ids.length === 0) return rows;

  const { data, error } = await supabase
    .from('photocards')
    .select('*')
    .in('id', ids);

  logGlobalSearchMetadata('hydrated global search rows', {
    ids,
    data,
    error: error ? getSupabaseErrorDetails(error) : null,
  });

  if (error || !data) return rows;
  const hydratedById = new Map((data as unknown[]).map((row) => [String((row as Record<string, unknown>).id ?? ''), row]));
  return rows.map((row) => hydratedById.get(String((row as Record<string, unknown>).id ?? '')) ?? row);
}

function normalizeSearchValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(normalizeSearchValue);
  if (value === null || value === undefined) return [];
  const normalized = normalizeSearchText(value);
  return normalized ? [normalized] : [];
}

function getGlobalSearchFieldWeight(field: string): GlobalSearchFieldWeight {
  if (field === 'member' || field === 'members') return 'member';
  if (field === 'group' || field === 'groupName' || field === 'group_name') return 'group';
  if (field === 'cardName' || field === 'card_name' || field === 'name') return 'cardName';
  if (field === 'source' || field === 'sourceName' || field === 'source_name' || field === 'shop' || field === 'store' || field === 'event' || field === 'benefit' || field === 'pob') return 'source';
  if (field === 'album' || field === 'albumName' || field === 'album_name') return 'album';
  if (field === 'era') return 'era';
  if (field === 'version') return 'version';
  if (field === 'category') return 'category';
  if (field === 'notes') return 'notes';
  return 'other';
}

function getGlobalSearchFieldEntries(row: Record<string, unknown>, card: Photocard): GlobalSearchFieldEntry[] {
  const cardRecord = card as Photocard & Record<string, unknown>;
  return GLOBAL_SEARCH_DESCRIPTIVE_FIELDS.map((field) => {
    const rawValue = row[field] ?? cardRecord[field];
    const resolvedValue =
      field === 'group' && rawValue === undefined ? row.group_name :
      field === 'groupName' && rawValue === undefined ? row.group_name :
      field === 'albumName' && rawValue === undefined ? row.album_name :
      field === 'sourceName' && rawValue === undefined ? row.source_name :
      field === 'cardName' && rawValue === undefined ? row.card_name :
      field === 'cardTemplateId' && rawValue === undefined ? row.card_template_id :
      rawValue;
    const values = normalizeSearchValue(resolvedValue);
    const weight = getGlobalSearchFieldWeight(field);
    return {
      field,
      weight,
      values,
      aliasValues: weight === 'member' ? normalizeSearchValue(resolvedValue).flatMap(getAliasTerms) : undefined,
    };
  }).filter((entry) => entry.values.length > 0 || (entry.aliasValues?.length ?? 0) > 0);
}

function entryMatchesSearchTerm(entry: GlobalSearchFieldEntry, term: string) {
  return entry.values.some((value) => value.includes(term))
    || (entry.aliasValues ?? []).some((value) => value.includes(term));
}

function scoreGlobalSearchRow(row: Record<string, unknown>, card: Photocard, query: string) {
  const terms = getSearchTerms(query);
  if (terms.length === 0) return 0;

  const entries = getGlobalSearchFieldEntries(row, card);
  if (!terms.every((term) => entries.some((entry) => entryMatchesSearchTerm(entry, term)))) return 0;

  const compactQuery = normalizeSearchText(query);
  let score = 0;

  terms.forEach((term) => {
    let bestTermScore = 0;
    entries.forEach((entry) => {
      const baseWeight = GLOBAL_SEARCH_FIELD_WEIGHTS[entry.weight];
      const exactValueMatch = entry.values.some((value) => value === term);
      const partialValueMatch = entry.values.some((value) => value.includes(term));
      const exactAliasMatch = (entry.aliasValues ?? []).some((value) => value === term);
      const partialAliasMatch = (entry.aliasValues ?? []).some((value) => value.includes(term));
      if (exactAliasMatch || partialAliasMatch) {
        bestTermScore = Math.max(bestTermScore, GLOBAL_SEARCH_FIELD_WEIGHTS.alias + (exactAliasMatch ? 25 : 0));
      }
      if (exactValueMatch || partialValueMatch) {
        bestTermScore = Math.max(bestTermScore, baseWeight + (exactValueMatch ? 30 : 0));
      }
    });
    score += bestTermScore;
  });

  entries.forEach((entry) => {
    const baseWeight = GLOBAL_SEARCH_FIELD_WEIGHTS[entry.weight];
    if (entry.values.some((value) => value === compactQuery)) score += baseWeight + 40;
    if ((entry.aliasValues ?? []).some((value) => value === compactQuery)) score += GLOBAL_SEARCH_FIELD_WEIGHTS.alias + 35;
  });

  if (card.imageUrl) score += 2;
  return score;
}

function globalSearchRowMatches(row: Record<string, unknown>, card: Photocard, query: string) {
  return scoreGlobalSearchRow(row, card, query) > 0;
}

function dedupeRowsById(rows: unknown[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const rowId = String((row as Record<string, unknown>).id ?? '');
    if (!rowId) return true;
    if (seen.has(rowId)) return false;
    seen.add(rowId);
    return true;
  });
}

async function fetchClientSearchSupplement(trimmed: string): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('photocards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(GLOBAL_SEARCH_CLIENT_SUPPLEMENT_LIMIT);

  if (error) {
    logGlobalSearchMetadata('client-side global search supplement failed', {
      query: trimmed,
      error: getSupabaseErrorDetails(error),
    });
    return [];
  }

  return ((data ?? []) as unknown[])
    .filter((row) => {
      const typedRow = row as Record<string, unknown>;
      return globalSearchRowMatches(typedRow, rowToPhotocard(typedRow), trimmed);
    });
}

function getSupabaseSearchTerms(query: string) {
  const compactQuery = normalizeSearchText(query);
  const aliases = getAliasTerms(query);
  const aliasCanonicalTerms = aliases.flatMap((alias) => {
    const canonical = NORMALIZED_MEMBER_ALIASES.get(alias);
    return canonical ? [canonical] : [];
  });

  return Array.from(new Set([
    query.trim(),
    compactQuery,
    ...getSearchTerms(query),
    ...aliases,
    ...aliasCanonicalTerms,
  ].filter((term) => term.length >= 2))).slice(0, 8);
}

export async function searchPublicCardTemplates(query: string): Promise<PublicCardTemplate[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const buildPhotocardSearch = (select: string, searchableFields: readonly string[], searchTerm: string) => {
    const safeQuery = escapeLikePattern(searchTerm);
    const fields = searchableFields.map((field) => `${field}.ilike.%${safeQuery}%`);
    return supabase
      .from('photocards')
      .select(select)
      .or(fields.join(','))
      .limit(80);
  };

  const searchRowsByFields = async (searchableFields: readonly string[], searchTerm: string, allowLegacyFallback: boolean) => {
    const { data, error } = await buildPhotocardSearch(PUBLIC_PHOTOCARD_SELECT, searchableFields, searchTerm);
    logGlobalSearchMetadata('raw Supabase global search result', { query: trimmed, searchTerm, fields: searchableFields, data, error: error ? getSupabaseErrorDetails(error) : null });
    if (!error) return { rows: (data ?? []) as unknown[], usedLegacy: false };

    if (isMissingColumnError(error, ['members', 'category', 'source', 'card_template_id', 'notes', ...searchableFields]) || isUnsupportedSearchFieldError(error)) {
      if (!allowLegacyFallback) {
        logGlobalSearchMetadata('skipped missing optional global search fields', { query: trimmed, searchTerm, fields: searchableFields, error: getSupabaseErrorDetails(error) });
        return { rows: [], usedLegacy: false };
      }

      const { data: legacyData, error: legacyError } = await buildPhotocardSearch(LEGACY_PUBLIC_PHOTOCARD_SELECT, LEGACY_GLOBAL_SEARCH_SUPABASE_FIELDS, searchTerm);
      if (legacyError) throw legacyError;
      logGlobalSearchMetadata('raw Supabase global search legacy result', { query: trimmed, searchTerm, fields: LEGACY_GLOBAL_SEARCH_SUPABASE_FIELDS, data: legacyData, error: null });
      return { rows: (legacyData ?? []) as unknown[], usedLegacy: true };
    }

    throw error;
  };

  let rows: unknown[] | null = null;
  logGlobalSearchQueryDebug({
    searchTerm: trimmed,
    queryVariants: getSupabaseSearchTerms(trimmed),
    supabaseFields: GLOBAL_SEARCH_SUPABASE_FIELDS,
    clientSupplementFields: GLOBAL_SEARCH_DESCRIPTIVE_FIELDS,
  });
  const queryVariants = getSupabaseSearchTerms(trimmed);
  const supabaseRows: unknown[] = [];
  let usedLegacySearch = false;
  for (const searchTerm of queryVariants) {
    const { rows: coreRows, usedLegacy } = await searchRowsByFields(GLOBAL_SEARCH_CORE_SUPABASE_FIELDS, searchTerm, true);
    usedLegacySearch = usedLegacySearch || usedLegacy;
    supabaseRows.push(...coreRows);

    const optionalResults = await Promise.all(
      GLOBAL_SEARCH_OPTIONAL_SUPABASE_FIELDS.map((searchableField) => searchRowsByFields([searchableField], searchTerm, false))
    );
    optionalResults.forEach(({ rows: fieldRows }) => supabaseRows.push(...fieldRows));
  }
  rows = await hydrateGlobalSearchRows(dedupeRowsById([...supabaseRows, ...(await fetchClientSearchSupplement(trimmed))]));

  const cardsWithOwners = rows
    .map((row) => {
      const typedRow = row as unknown as Record<string, unknown>;
      const card = rowToPhotocard(typedRow);
      logGlobalSearchMetadata('mapped search card', { raw: typedRow, card });
      return { card, ownerId: String(typedRow.user_id ?? typedRow.userId ?? ''), searchScore: scoreGlobalSearchRow(typedRow, card, trimmed) };
    })
    .filter((entry) => entry.ownerId && entry.searchScore > 0);
  if (cardsWithOwners.length === 0) return [];

  const ownerIds = Array.from(new Set(cardsWithOwners.map((entry) => entry.ownerId)));
  const profileById = await fetchProfilesById(ownerIds);
  const publicEntries = cardsWithOwners.filter(({ card, ownerId }) => {
    const owner = profileById.get(ownerId);
    if (!owner) return false;
    if (card.status === 'wishlist') return owner.is_wishlist_public !== false;
    return owner.is_collection_public !== false;
  });

  const wishlistCounts = await fetchWishlistCountsForCards(publicEntries.map((entry) => entry.card));
  const grouped = new Map<string, PublicCardTemplate>();

  const getMetadataScore = (card: Photocard) => {
    let score = 0;
    if (card.category && card.category !== 'Album') score += 8;
    if (card.source?.trim()) score += 6;
    if (card.album?.trim()) score += 2;
    if (card.imageUrl) score += 1;
    return score;
  };

  publicEntries.forEach(({ card, ownerId, searchScore }) => {
    const identity = getPhotocardBaseIdentity(card);
    const owner = profileById.get(ownerId) ?? null;
    const existing = grouped.get(identity);
    const existingScore = existing ? scoreGlobalSearchRow(existing.card as Photocard & Record<string, unknown>, existing.card, trimmed) : 0;
    const ownerPayload = owner && owner.is_collection_public !== false
      ? {
          id: owner.id,
          username: owner.username,
          nickname: owner.nickname,
          display_name: owner.display_name,
          avatar_url: owner.avatar_url,
        }
      : null;
    if (!existing) {
      grouped.set(identity, {
        identity: getCardTemplateId(card),
        card,
        wishlistCount: wishlistCounts.get(getCardTemplateId(card)) ?? 0,
        owner: ownerPayload,
      });
    } else if (searchScore > existingScore || (searchScore === existingScore && getMetadataScore(card) > getMetadataScore(existing.card))) {
      grouped.set(identity, {
        ...existing,
        identity: getCardTemplateId(card),
        card,
        wishlistCount: Math.max(existing.wishlistCount, wishlistCounts.get(getCardTemplateId(card)) ?? 0),
        owner: existing.owner ?? ownerPayload,
      });
    }
  });

  const results = Array.from(grouped.values())
    .sort((a, b) => {
      const scoreDelta = scoreGlobalSearchRow(b.card as Photocard & Record<string, unknown>, b.card, trimmed)
        - scoreGlobalSearchRow(a.card as Photocard & Record<string, unknown>, a.card, trimmed);
      if (scoreDelta !== 0) return scoreDelta;
      return (b.card.createdAt ?? 0) - (a.card.createdAt ?? 0);
    })
    .slice(0, GLOBAL_SEARCH_RESULT_LIMIT);
  logGlobalSearchQueryDebug({
    searchTerm: trimmed,
    fieldsBeingSearched: {
      supabase: usedLegacySearch
        ? LEGACY_GLOBAL_SEARCH_SUPABASE_FIELDS
        : GLOBAL_SEARCH_SUPABASE_FIELDS,
      clientSupplement: GLOBAL_SEARCH_DESCRIPTIVE_FIELDS,
    },
    resultCount: results.length,
    matchedCardMetadata: results.map(({ card }) => ({
      category: card.category,
      source: card.source,
      album: card.album,
      era: card.era,
      version: card.version,
      cardName: card.cardName,
      members: card.members,
      group: card.group,
    })),
  });

  return results;
}

export async function fetchWishlistCountForCard(card: Photocard): Promise<number> {
  const counts = await fetchWishlistCountsForCards([card]);
  return counts.get(getCardTemplateId(card)) ?? 0;
}

async function fetchWishlistCountsForCards(cards: Photocard[]): Promise<Map<string, number>> {
  const identities = new Set(cards.map(getCardTemplateId));
  if (identities.size === 0) return new Map();

  let wishlistRows: unknown[] | null = null;
  const { data, error } = await supabase
    .from('photocards')
    .select(PUBLIC_PHOTOCARD_SELECT)
    .eq('status', 'wishlist')
    .limit(500);
  if (error && isMissingColumnError(error, ['members', 'category', 'source', 'card_template_id'])) {
    const { data: legacyData, error: legacyError } = await supabase
      .from('photocards')
      .select(LEGACY_PUBLIC_PHOTOCARD_SELECT)
      .eq('status', 'wishlist')
      .limit(500);
    if (legacyError) throw legacyError;
    wishlistRows = legacyData as unknown[] | null;
  } else {
    if (error) throw error;
    wishlistRows = data as unknown[] | null;
  }

  const wishlistCardsWithOwners = (wishlistRows ?? [])
    .map((row) => {
      const typedRow = row as unknown as Record<string, unknown>;
      return { card: rowToPhotocard(typedRow), ownerId: String(typedRow.user_id ?? '') };
    })
    .filter((entry) => identities.has(getCardTemplateId(entry.card)) && entry.ownerId);
  if (wishlistCardsWithOwners.length === 0) return new Map();

  const ownerIds = Array.from(new Set(wishlistCardsWithOwners.map((entry) => entry.ownerId)));
  const profileById = await fetchProfilesById(ownerIds);
  const publicWishlistOwnerIds = new Set(Array.from(profileById.values()).filter((profile) => profile.is_wishlist_public !== false).map(getProfileUserId));
  const counts = new Map<string, number>();

  wishlistCardsWithOwners.forEach(({ card, ownerId }) => {
    if (!publicWishlistOwnerIds.has(ownerId)) return;
    const identity = getCardTemplateId(card);
    counts.set(identity, (counts.get(identity) ?? 0) + 1);
  });

  return counts;
}
