'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CookiePreferences {
  necessary: true; // always active
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieState {
  decided: boolean;
  preferences: CookiePreferences;
  decidedAt: string | null;
  setDecision: (prefs: CookiePreferences) => void;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  reopen: () => void;
}

export const useCookieConsent = create<CookieState>()(
  persist(
    (set, get) => ({
      decided: false,
      preferences: { necessary: true, preferences: false, analytics: false, marketing: false },
      decidedAt: null,
      setDecision: (prefs) =>
        set({ decided: true, preferences: { ...prefs, necessary: true }, decidedAt: new Date().toISOString() }),
      acceptAll: () =>
        set({
          decided: true,
          preferences: { necessary: true, preferences: true, analytics: true, marketing: true },
          decidedAt: new Date().toISOString(),
        }),
      rejectNonEssential: () =>
        set({
          decided: true,
          preferences: { necessary: true, preferences: false, analytics: false, marketing: false },
          decidedAt: new Date().toISOString(),
        }),
      reopen: () => set({ decided: false }),
    }),
    { name: 'ecom-casa-cookie-consent' }
  )
);
