'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/language-store';
import { translate } from '@/lib/i18n';

/**
 * Rehydrates the persisted language preference once, after mount (SSR-safe),
 * and keeps <html lang> in sync for screen readers / translation tools.
 * Renders nothing.
 */
export function LanguageBoot() {
  const lang = useLanguage((s) => s.lang);

  useEffect(() => {
    const persist = useLanguage.persist;
    if (persist && !persist.hasHydrated()) {
      persist.rehydrate();
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}

/**
 * Returns a translate function bound to the active language.
 * usage: const t = useT(); t('card.addToCart')
 */
export function useT() {
  const lang = useLanguage((s) => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
