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
  group?: string; // New field from old app
  member: string;
  category?: PhotocardCategory;
  source?: string;
  album: string;
  era?: string; // New field from old app
  year: number;
  cardName: string;
  version: string;
  status: Status;
  condition?: Condition; // New field from old app
  isDuplicate?: boolean; // New field from old app
  notes?: string;
  imageUrl?: string;
  createdAt: number;
}

export function getMissingRequiredPhotocardFields(
  photocard: Pick<Photocard, 'member' | 'category' | 'status'> & Partial<Pick<Photocard, 'album' | 'source'>>
): string[] {
  const category = getPhotocardCategory(photocard);
  const missing: string[] = [];

  if (!photocard.member?.trim()) missing.push('Member');
  if (!photocard.category) missing.push('Category');
  if (!photocard.status) missing.push('Status');
  if (category === 'Album' && !photocard.album?.trim()) missing.push('Album');
  if (category !== 'Album' && !photocard.source?.trim()) missing.push('Source');

  return missing;
}

export function getPhotocardCategory(photocard: Pick<Photocard, 'category'>): PhotocardCategory {
  return photocard.category && PHOTOCARD_CATEGORIES.includes(photocard.category) ? photocard.category : 'Album';
}

export function normalizePhotocardForSave(photocard: Photocard): Photocard {
  const category = getPhotocardCategory(photocard);
  return {
    ...photocard,
    category,
    album: category === 'Album' ? photocard.album : '',
    source: category === 'Album' ? undefined : photocard.source?.trim() || undefined,
  };
}

export function normalizePhotocardUpdates(updates: Partial<Photocard>): Partial<Photocard> {
  if (updates.category === undefined) return updates;

  const category = getPhotocardCategory({ category: updates.category });
  const nextUpdates: Partial<Photocard> = {
    ...updates,
    category,
    ...(category === 'Album' ? { source: undefined } : { album: '' }),
  };

  if (category !== 'Album' && 'source' in updates) {
    nextUpdates.source = updates.source?.trim() || undefined;
  }

  return {
    ...nextUpdates,
  };
}

export interface CollectionStats {
  totalCollected: number;
  wishlistGoals: number;
  collectionValue: number;
}

export interface Profile {
  id: string;
  username: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  has_password?: boolean | null;
  deletion_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}
