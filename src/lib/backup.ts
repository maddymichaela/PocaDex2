/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPhotocardMembers, normalizePhotocardForSave, Photocard, PHOTOCARD_CATEGORIES } from '../types';

export const validatePhotocards = (data: any): data is Photocard[] => {
  if (!Array.isArray(data)) return false;
  
  return data.every(item => {
    return (
      typeof item.id === 'string' &&
      getPhotocardMembers(item).length > 0 &&
      typeof item.album === 'string' &&
      typeof item.cardName === 'string' &&
      typeof item.version === 'string' &&
      ['owned', 'on_the_way', 'wishlist'].includes(item.status) &&
      (item.imageUrl === undefined || typeof item.imageUrl === 'string') &&
      (item.group === undefined || typeof item.group === 'string') &&
      (item.category === undefined || PHOTOCARD_CATEGORIES.includes(item.category)) &&
      (item.source === undefined || typeof item.source === 'string') &&
      (item.era === undefined || typeof item.era === 'string') &&
      (item.condition === undefined || typeof item.condition === 'string') &&
      (item.isDuplicate === undefined || typeof item.isDuplicate === 'boolean') &&
      typeof item.createdAt === 'number'
    );
  });
};

export const exportCollection = (photocards: Photocard[]) => {
  const dataStr = JSON.stringify(photocards, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `pocadex-backup-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const importCollection = (file: File): Promise<Photocard[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (validatePhotocards(json)) {
          resolve(json.map((item: Photocard) => normalizePhotocardForSave(item)));
        } else {
          reject(new Error('Invalid backup file structure. Please ensure it is a valid Pocadex JSON.'));
        }
      } catch (err) {
        reject(new Error('Failed to parse JSON file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
};
