/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Status = 'owned' | 'on_the_way' | 'wishlist';

export const PHOTOCARD_CATEGORIES = [
  'Album',
  'Merch',
  'Video Call',
  'Fansign',
  'Streaming',
  'Fanmeeting',
  'Concert',
  'Event',
  'Lucky Draw',
  'Collaboration',
  'Endorsement',
  'Other',
] as const;

export type PhotocardCategory = typeof PHOTOCARD_CATEGORIES[number];

export type Condition =
  | "mint"
  | "near_mint"
  | "good"
  | "fair"
  | "poor";

export interface Photocard {
  id: string;
  cardTemplateId?: string;
  ownerUserId?: string;
  group?: string;
  members: string[];
  category?: PhotocardCategory;
  source?: string;
  album: string;
  era?: string;
  year: number;
  cardName: string;
  version: string;
  status: Status;
  condition?: Condition;
  isDuplicate?: boolean;
  notes?: string;
  imageUrl?: string;
  createdAt: number;
}

export type LegacyPhotocardInput = Partial<Photocard> & { member?: string };

export function normalizeMembers(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(new Set(input.map(member => String(member).trim()).filter(Boolean)));
  }
  if (typeof input === 'string') {
    return input.split(',').map(member => member.trim()).filter(Boolean);
  }
  return [];
}

export function getPhotocardMembers(photocard: LegacyPhotocardInput): string[] {
  const members = normalizeMembers(photocard.members);
  if (members.length > 0) return members;

  const legacyMember = typeof photocard.member === 'string' ? photocard.member.trim() : '';
  return legacyMember ? [legacyMember] : [];
}

export function formatPhotocardMembers(photocard: LegacyPhotocardInput, maxNames = 3): string {
  const members = getPhotocardMembers(photocard);
  if (members.length <= maxNames) return members.join(' · ');
  return `${members[0]} + ${members.length - 1}`;
}

function normalizeIdentityPart(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getSharedPhotocardIdentity(photocard: LegacyPhotocardInput) {
  return [
    normalizeIdentityPart(photocard.group),
    normalizeIdentityPart(formatPhotocardMembers(photocard)),
    normalizeIdentityPart(getPhotocardCategory(photocard)),
    normalizeIdentityPart(photocard.album),
    normalizeIdentityPart(photocard.source),
    normalizeIdentityPart(photocard.era),
    normalizeIdentityPart(photocard.year),
    normalizeIdentityPart(photocard.cardName),
    normalizeIdentityPart(photocard.version),
  ].join('|');
}

// Identity without category/source — used to find stale Album-mislabeled cards during migration.
export function getPhotocardBaseIdentity(photocard: LegacyPhotocardInput): string {
  return [
    normalizeIdentityPart(photocard.group),
    normalizeIdentityPart(formatPhotocardMembers(photocard)),
    normalizeIdentityPart(photocard.album),
    normalizeIdentityPart(photocard.era),
    normalizeIdentityPart(photocard.year),
    normalizeIdentityPart(photocard.cardName),
    normalizeIdentityPart(photocard.version),
  ].join('|');
}

export function getPhotocardTemplateId(photocard: LegacyPhotocardInput) {
  return photocard.cardTemplateId || getSharedPhotocardIdentity(photocard);
}

export function getMissingRequiredPhotocardFields(
  photocard: Pick<Photocard, 'members' | 'category' | 'status'> & Partial<Pick<Photocard, 'album' | 'source'>> & { member?: string }
): string[] {
  const category = getPhotocardCategory(photocard);
  const missing: string[] = [];

  if (getPhotocardMembers(photocard).length === 0) missing.push('Member');
  if (!photocard.category) missing.push('Category');
  if (!photocard.status) missing.push('Status');
  if (category === 'Album' && !photocard.album?.trim()) missing.push('Album');
  if (category !== 'Album' && !photocard.source?.trim()) missing.push('Source');

  return missing;
}

export function getPhotocardCategory(photocard: Pick<Photocard, 'category'>): PhotocardCategory {
  const rawCategory = String(photocard.category ?? '').trim();
  if (!rawCategory) return 'Album';

  const normalizedCategory = rawCategory.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return PHOTOCARD_CATEGORIES.find((category) => category.toLowerCase() === normalizedCategory) ?? 'Album';
}

export function normalizePhotocardForSave(photocard: Photocard): Photocard {
  const category = getPhotocardCategory(photocard);
  const members = getPhotocardMembers(photocard);
  return {
    ...photocard,
    members,
    category,
    album: photocard.album,
    source: category === 'Album' ? undefined : photocard.source?.trim() || undefined,
  };
}

export function normalizePhotocardUpdates(updates: Partial<Photocard>): Partial<Photocard> {
  const normalizedBase = updates.members === undefined ? updates : { ...updates, members: normalizeMembers(updates.members) };
  if (normalizedBase.category === undefined) return normalizedBase;

  const category = getPhotocardCategory({ category: normalizedBase.category });
  const nextUpdates: Partial<Photocard> = {
    ...normalizedBase,
    category,
    ...(category === 'Album' ? { source: undefined } : {}),
  };

  if (category !== 'Album' && 'source' in normalizedBase) {
    nextUpdates.source = normalizedBase.source?.trim() || undefined;
  }

  return nextUpdates;
}

export interface CollectionStats {
  totalCollected: number;
  onTheWay: number;
  wishlistGoals: number;
  duplicates: number;
  collectionValue: number;
}

export interface Profile {
  // Supabase profiles.id is the auth.users.id for this app.
  id: string;
  username: string;
  nickname: string | null;
  display_name?: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_collection_public?: boolean | null;
  is_wishlist_public?: boolean | null;
  is_bio_public?: boolean | null;
  has_password?: boolean | null;
  deletion_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function getProfileDisplayName(profile: Pick<Profile, 'username' | 'nickname' | 'display_name'>): string {
  return profile.display_name || profile.nickname || profile.username;
}
