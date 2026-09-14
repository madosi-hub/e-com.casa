'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  slugs: string[];
  hydrated: boolean;
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
  addMany: (slugs: string[]) => void;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      hydrated: false,
      toggle: (slug) => {
        const slugs = get().slugs.includes(slug)
          ? get().slugs.filter((s) => s !== slug)
          : [...get().slugs, slug];
        set({ slugs });
      },
      has: (slug) => get().slugs.includes(slug),
      remove: (slug) => set({ slugs: get().slugs.filter((s) => s !== slug) }),
      clear: () => set({ slugs: [] }),
      addMany: (incoming) => {
        const clean = incoming.filter((s) => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s));
        if (clean.length === 0) return;
        const merged = [...get().slugs];
        for (const slug of clean) if (!merged.includes(slug)) merged.push(slug);
        set({ slugs: merged.slice(0, 100) });
      },
    }),
    {
      name: 'ecom-casa-wishlist',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
