/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Status = 'owned' | 'on_the_way' | 'wishlist';

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
  created_at: string;
  updated_at: string;
}
