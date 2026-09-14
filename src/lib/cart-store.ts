'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/types';

interface CartState {
  lines: CartLine[];
  promoCode: string | null;
  hydrated: boolean;
  add: (line: Omit<CartLine, 'quantity'>, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  setPromo: (code: string | null) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promoCode: null,
      hydrated: false,
      add: (line, qty = 1) => {
        const lines = [...get().lines];
        const keyOf = (l: Pick<CartLine, 'slug' | 'variantId'>) => `${l.slug}|${l.variantId ?? ''}`;
        const idx = lines.findIndex((l) => keyOf(l) === keyOf(line));
        if (idx >= 0) {
          const nextQty = Math.min(lines[idx].quantity + qty, line.maxStock ?? Number.MAX_SAFE_INTEGER);
          lines[idx] = { ...lines[idx], ...line, quantity: nextQty };
        } else {
          lines.push({ ...line, quantity: Math.min(Math.max(1, qty), line.maxStock ?? Number.MAX_SAFE_INTEGER) });
        }
        set({ lines });
      },
      remove: (slug) => set({ lines: get().lines.filter((l) => `${l.slug}|${l.variantId ?? ''}` !== slug) }),
      setQty: (slug, qty) => {
        if (qty < 1) return set({ lines: get().lines.filter((l) => `${l.slug}|${l.variantId ?? ''}` !== slug) });
        set({
          lines: get().lines.map((l) =>
            `${l.slug}|${l.variantId ?? ''}` === slug ? { ...l, quantity: Math.min(qty, l.maxStock ?? Number.MAX_SAFE_INTEGER) } : l
          ),
        });
      },
      setPromo: (code) => set({ promoCode: code }),
      clear: () => set({ lines: [], promoCode: null }),
      count: () => get().lines.reduce((acc, l) => acc + l.quantity, 0),
      subtotal: () => get().lines.reduce((acc, l) => acc + parseFloat(l.price) * l.quantity, 0),
    }),
    {
      name: 'ecom-casa-cart',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);
