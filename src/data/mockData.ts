/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Photocard } from '../types';

export const MOCK_PHOTOCARDS: Photocard[] = [
  {
    id: '1',
    group: 'aespa',
    member: 'Karina',
    album: 'Savage',
    era: 'Hallucination',
    year: 2021,
    cardName: 'Album Photocard',
    version: 'Hallucination Ver.',
    status: 'owned',
    condition: 'mint',
    createdAt: 1633046400000,
  },
  {
    id: '2',
    group: 'aespa',
    member: 'Winter',
    album: 'Next Level',
    era: 'P.O.S',
    year: 2021,
    cardName: 'P.O.S Benefit',
    version: 'P.O.S Ver.',
    status: 'owned',
    condition: 'near_mint',
    createdAt: 1633132800000,
  },
  {
    id: '3',
    group: 'aespa',
    member: 'Ningning',
    album: 'Girls',
    era: 'Real World',
    year: 2022,
    cardName: 'Real World Selfie',
    version: 'Real World Ver.',
    status: 'wishlist',
    condition: 'mint',
    createdAt: 1656633600000,
  },
  {
    id: '4',
    group: 'aespa',
    member: 'Giselle',
    album: 'Drama',
    era: 'Sequence',
    year: 2023,
    cardName: 'Sequence Photocard',
    version: 'Sequence Ver.',
    status: 'owned',
    condition: 'good',
    isDuplicate: true,
    createdAt: 1698796800000,
  },
];

export const MOCK_STATS = {
  totalCollected: 1248,
  wishlistGoals: 42,
  collectionValue: 3450,
};
