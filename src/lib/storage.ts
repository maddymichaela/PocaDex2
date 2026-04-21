/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'pc_track_collection';

/**
 * Utility for local storage operations
 */
export const storage = {
  /**
   * Save collection to localStorage
   */
  save: <T>(data: T): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  /**
   * Load collection from localStorage
   */
  load: <T>(defaultValue: T): T => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return defaultValue;
      
      const parsed = JSON.parse(savedData);
      
      // Basic validation: check if it's an array for collections
      if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
        return defaultValue;
      }
      
      return parsed as T;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Clear all storage
   */
  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
