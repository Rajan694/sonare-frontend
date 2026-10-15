import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { addRecentSearch, removeRecentSearch, sanitizeRecentSearches } from '../../../shared/search/recentSearches';

/**
 * The last searches made on this phone, shared online and offline. Kept in AsyncStorage so they
 * survive a restart; every read and write is wrapped because storage can be unavailable.
 */
const STORAGE_KEY = 'sonare.recentSearches';

interface RecentSearchesStore {
  searches: string[];
  hydrate: () => Promise<void>;
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

const persist = (searches: string[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(searches)).catch(() => {});
};

export const useRecentSearchesStore = create<RecentSearchesStore>((set, get) => ({
  searches: [],
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({ searches: sanitizeRecentSearches(raw ? JSON.parse(raw) : []) });
    } catch {
      // Nothing stored, or unreadable: start empty.
    }
  },
  add: (query) => {
    const searches = addRecentSearch(get().searches, query);
    set({ searches });
    persist(searches);
  },
  remove: (query) => {
    const searches = removeRecentSearch(get().searches, query);
    set({ searches });
    persist(searches);
  },
  clear: () => {
    set({ searches: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
