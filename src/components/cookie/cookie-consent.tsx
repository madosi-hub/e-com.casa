'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Cookie, Shield } from 'lucide-react';
import { useCookieConsent, type CookiePreferences } from '@/lib/cookie-store';
import { useT } from '@/hooks/use-t';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function CookieConsent() {
  const t = useT();
  const { decided, acceptAll, rejectNonEssential, setDecision } = useCookieConsent();
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
  });

  if (decided && !showPrefs) return null;

  const updatePref = (key: keyof CookiePreferences, value: boolean) => {
    if (key === 'necessary') return; // necessary cannot be disabled
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const savePreferences = () => {
    setDecision(prefs);
    setShowPrefs(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('cookie.aria')}
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-background/98 shadow-[0_16px_48px_rgba(33,30,27,0.18)] backdrop-blur">
        <div className="flex items-start gap-4 p-5">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent sm:flex">
            <Cookie className="h-5 w-5 text-olive" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[17px] font-semibold">{t('cookie.title')}</h2>
            {!showPrefs ? (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {t('cookie.desc')}{' '}
                  <Link href="/legal/cookies" className="underline underline-offset-2 hover:text-foreground">
                    {t('cookie.policy')}
                  </Link>
                  .
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <Button onClick={acceptAll} className="h-10 rounded-md bg-primary px-5 text-[13.5px] font-medium hover:bg-primary/90">
                    {t('cookie.acceptAll')}
                  </Button>
                  <Button
                    onClick={rejectNonEssential}
                    variant="outline"
                    className="h-10 rounded-md border-input px-5 text-[13.5px] font-medium"
                  >
                    {t('cookie.reject')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowPrefs(true)}
                    className="px-2 py-2 text-[13.5px] font-medium text-olive underline-offset-4 hover:underline"
                  >
                    {t('cookie.manage')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {t('cookie.prefsDesc')}
                </p>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      { key: 'necessary', labelKey: 'cookie.necessary', descKey: 'cookie.necessaryDesc' },
                      { key: 'preferences', labelKey: 'cookie.preferences', descKey: 'cookie.preferencesDesc' },
                      { key: 'analytics', labelKey: 'cookie.analytics', descKey: 'cookie.analyticsDesc' },
                      { key: 'marketing', labelKey: 'cookie.marketing', descKey: 'cookie.marketingDesc' },
                    ] as const
                  ).map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                        <div>
                          <p className="text-[13.5px] font-medium">
                            {t(row.labelKey)}
                            {row.key === 'necessary' && <span className="ml-2 text-[11px] text-muted-foreground">{t('common.alwaysActive')}</span>}
                          </p>
                          <p className="text-[12px] text-muted-foreground">{t(row.descKey)}</p>
                        </div>
                      </div>
                      <Switch
                        checked={row.key === 'necessary' ? true : prefs[row.key]}
                        onCheckedChange={(v) => updatePref(row.key, v)}
                        disabled={row.key === 'necessary'}
                        aria-label={`${t(row.labelKey)} cookies`}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button onClick={savePreferences} className="h-10 rounded-md bg-primary px-5 text-[13.5px] font-medium">
                    {t('cookie.save')}
                  </Button>
                  <Button variant="outline" onClick={acceptAll} className="h-10 rounded-md border-input px-5 text-[13.5px] font-medium">
                    {t('cookie.acceptAll')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPrefs(false)} className="h-10 px-4 text-[13.5px]">
                    {t('cookie.back')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
