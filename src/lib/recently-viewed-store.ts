'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentlyViewedState {
  slugs: string[];
  hydrated: boolean;
  track: (slug: string) => void;
  clear: () => void;
}

const MAX_ITEMS = 8;

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      slugs: [],
      hydrated: false,
      track: (slug) => {
        const next = [slug, ...get().slugs.filter((s) => s !== slug)].slice(0, MAX_ITEMS);
        set({ slugs: next });
      },
      clear: () => set({ slugs: [] }),
    }),
    {
      name: 'ecom-casa-recently-viewed',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
