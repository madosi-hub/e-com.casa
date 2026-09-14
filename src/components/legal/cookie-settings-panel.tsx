'use client';

import { useSyncExternalStore } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useCookieConsent } from '@/lib/cookie-store';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

const emptySubscribe = () => () => {};

/** Hydration-safe mounted flag: false on the server, true on the client. */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const CATEGORIES = [
  { key: 'necessary', label: 'Necessary', desc: 'Basket, checkout, security. Always active.' },
  { key: 'preferences', label: 'Preferences', desc: 'Remember your language and region.' },
  { key: 'analytics', label: 'Analytics', desc: 'Help us understand how the site is used.' },
  { key: 'marketing', label: 'Marketing', desc: 'Personalised offers and campaign measurement.' },
] as const;

export function CookieSettingsPanel() {
  const { decided, preferences, decidedAt, acceptAll, rejectNonEssential, reopen } = useCookieConsent();
  // zustand persist rehydrates from localStorage after mount —
  // render a stable placeholder on the server to avoid hydration mismatch.
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="rounded-md border border-border bg-card p-6" aria-hidden="true">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-12 animate-pulse rounded bg-muted" />
          <div className="h-12 animate-pulse rounded bg-muted" />
          <div className="h-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent sm:flex">
          <Cookie className="h-5 w-5 text-olive" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-medium">Your current preferences</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {decided
              ? `Last updated: ${decidedAt ? formatDate(decidedAt) : 'unknown'}. You can change your choice at any time.`
              : 'You have not recorded a cookie decision on this device yet.'}
          </p>

          <ul className="mt-4 space-y-2.5">
            {CATEGORIES.map((row) => {
              const isOn = row.key === 'necessary' ? true : Boolean(preferences[row.key]);
              return (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3"
                >
                  <div>
                    <p className="text-[13.5px] font-medium">{row.label}</p>
                    <p className="text-[12px] text-muted-foreground">{row.desc}</p>
                  </div>
                  <span
                    className={
                      isOn
                        ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-olive/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-olive-deep'
                        : 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground'
                    }
                  >
                    {isOn ? <ShieldCheck className="h-3 w-3" strokeWidth={1.5} /> : null}
                    {row.key === 'necessary' ? 'Always on' : isOn ? 'On' : 'Off'}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              onClick={reopen}
              variant="outline"
              className="h-10 rounded-md border-input px-5 text-[13.5px] font-medium"
            >
              Open the cookie banner
            </Button>
            <Button
              onClick={acceptAll}
              className="h-10 rounded-md bg-primary px-5 text-[13.5px] font-medium hover:bg-primary/90"
            >
              Accept all
            </Button>
            <Button
              onClick={rejectNonEssential}
              variant="outline"
              className="h-10 rounded-md border-input px-5 text-[13.5px] font-medium"
            >
              Reject non-essential
            </Button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            “Open the cookie banner” reopens the consent banner shown on your first visit, where you can
            set each category individually. Necessary cookies cannot be switched off.
          </p>
        </div>
      </div>
    </div>
  );
}
