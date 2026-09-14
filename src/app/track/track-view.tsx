'use client';

// /track — public parcel tracking (3PL simulation engine)
// The buyer enters the tracking number (ECC-YYMM-XXXXXX) from
// the dispatch confirmation and sees the fulfilment timeline,
// the origin warehouse, the destination and the estimated
// delivery. Lookup is by tracking number only — order history
// remains protected by per-order access tokens.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle2,
  Circle,
  CircleDashed,
  Copy,
  Hourglass,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Search,
  Truck,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { formatDate, formatDateTime } from '@/lib/format';

const STEP_STATES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

interface TimelineEvent {
  status: string;
  description: string;
  location: string | null;
  occurredAt: string;
  occurred: boolean;
}

interface TrackingResult {
  found: boolean;
  awaitingPayment?: boolean;
  order?: {
    orderNumber: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    status: string;
    paymentStatus: string;
    shippingMethod: string;
    placedAt: string;
    estimatedDeliveryAt: string | null;
    destination: { city: string; country: string };
    originWarehouse: { id: string; name: string; address: string; city: string; country: string };
    items: { name: string; image: string; quantity: number; variantLabel?: string | null }[];
  };
  timeline?: TimelineEvent[];
}

type SearchState = 'idle' | 'searching' | 'found' | 'notFound' | 'invalid' | 'error';

function normaliseInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

function isValidCode(code: string): boolean {
  return /^ECC-\d{4}-[A-HJ-NP-Z2-9]{6}$/.test(code);
}

export function TrackView() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code')?.toUpperCase() ?? '';
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<SearchState>('idle');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const autoRan = useRef(false);

  const runSearch = useCallback(
    async (raw: string) => {
      const normalised = normaliseInput(raw);
      if (!normalised) return;
      if (!isValidCode(normalised)) {
        setState('invalid');
        setResult(null);
        return;
      }
      setState('searching');
      setResult(null);
      try {
        const res = await fetch(`/api/tracking?code=${encodeURIComponent(normalised)}`, { cache: 'no-store' });
        if (res.status === 404) {
          setState('notFound');
          return;
        }
        if (!res.ok) {
          setState('error');
          return;
        }
        const data: TrackingResult = await res.json();
        if (!data.found) {
          setState('notFound');
          return;
        }
        setResult(data);
        setState('found');
      } catch {
        setState('error');
      }
    },
    [],
  );

  // Deep link: /track?code=ECC-… searches automatically once.
  // Deferred via setTimeout so state updates never run synchronously
  // inside the effect (same pattern as the order-history loader).
  useEffect(() => {
    const initial = searchParams.get('code');
    if (initial && !autoRan.current) {
      autoRan.current = true;
      const timer = setTimeout(() => void runSearch(initial), 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, runSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(code);
  };

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: t('success.trackingNumber'), description: value });
    } catch {
      // clipboard unavailable — silent
    }
  };

  const order = result?.order;
  const timeline = result?.timeline ?? [];
  const cancelled = state === 'found' && order?.status === 'CANCELLED';
  const currentIndex = cancelled ? -1 : STEP_STATES.indexOf(order?.status as (typeof STEP_STATES)[number]);

  return (
    <div className="container-ecom py-12 lg:py-16" aria-labelledby="track-title">
      <div className="mx-auto max-w-3xl">
        <h2 id="track-title" className="font-display text-[26px] font-medium tracking-tight sm:text-[30px]">
          {t('track.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">{t('track.subtitle')}</p>

        {/* Search form */}
        <form onSubmit={onSubmit} className="mt-7 rounded-lg border border-border bg-card p-5 sm:p-6" aria-label={t('track.cta')}>
          <label htmlFor="tracking-code" className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t('track.label')}
          </label>
          <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row">
            <Input
              id="tracking-code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('track.placeholder')}
              autoComplete="off"
              spellCheck={false}
              className="h-12 flex-1 font-mono text-[15px] uppercase tracking-wider"
            />
            <Button type="submit" disabled={state === 'searching'} className="h-12 rounded-md bg-primary px-6 text-[14px] font-medium hover:bg-primary/90">
              {state === 'searching' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} /> {t('track.searching')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" strokeWidth={1.75} /> {t('track.cta')}
                </>
              )}
            </Button>
          </div>

          {state === 'invalid' && (
            <p role="alert" className="mt-3 text-[13px] text-terracotta">{t('track.invalid')}</p>
          )}
          {state === 'notFound' && (
            <p role="alert" className="mt-3 text-[13px] text-terracotta">{t('track.notFound')}</p>
          )}
          {state === 'error' && (
            <p role="alert" className="mt-3 text-[13px] text-terracotta">
              Something went wrong. Please try again in a moment.
            </p>
          )}
        </form>

        {/* ---------- Result ---------- */}
        {state === 'found' && order && (
          <div className="mt-8 space-y-6" aria-live="polite">
            {result?.awaitingPayment ? (
              <div className="rounded-lg border border-[#e0a03c]/40 bg-[#e0a03c]/5 p-6 text-center">
                <Hourglass className="mx-auto h-7 w-7 text-[#e0a03c]" strokeWidth={1.5} />
                <p className="font-display mt-3 text-[18px] font-medium">{t('track.pending')}</p>
                <p className="mt-1.5 text-[13.5px] text-muted-foreground">{t('track.awaitingPayment')}</p>
              </div>
            ) : (
              <>
                {/* Status header */}
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-cream/40 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t('track.currentStatus')}
                      </p>
                      <p className={`font-display mt-1 text-[22px] font-medium ${cancelled ? 'text-terracotta' : 'text-olive'}`}>
                        {cancelled ? t('track.state.CANCELLED') : t(`track.state.${order.status}`)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {t('track.label')}
                      </p>
                      <button
                        type="button"
                        onClick={() => void copyCode(order.trackingNumber ?? '')}
                        className="mt-1 inline-flex items-center gap-1.5 font-mono text-[15px] font-semibold hover:text-olive"
                        aria-label={`${t('success.trackingNumber')}: ${order.trackingNumber}`}
                      >
                        {order.trackingNumber}
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </button>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {t('track.order')}: {order.orderNumber}
                      </p>
                    </div>
                  </div>

                  {/* Stepper */}
                  {!cancelled && currentIndex >= 0 && (
                    <div className="border-b border-border px-5 py-5 sm:px-6">
                      <ol className="flex items-start" aria-label={t('track.journey')}>
                        {STEP_STATES.map((step, i) => {
                          const done = i < currentIndex;
                          const active = i === currentIndex;
                          return (
                            <li key={step} className="flex flex-1 flex-col items-center gap-1.5 last:flex-none">
                              {done ? (
                                <CheckCircle2 className="h-6 w-6 text-olive" strokeWidth={1.5} />
                              ) : active ? (
                                <span className="relative flex h-6 w-6 items-center justify-center">
                                  <CircleDashed className="h-6 w-6 animate-[spin_6s_linear_infinite] text-olive" strokeWidth={1.5} />
                                </span>
                              ) : (
                                <Circle className="h-6 w-6 text-border" strokeWidth={1.5} />
                              )}
                              <span
                                className={`max-w-[68px] text-center text-[9.5px] font-medium leading-tight sm:max-w-none sm:text-[10.5px] ${
                                  done || active ? 'text-foreground' : 'text-muted-foreground'
                                }`}
                              >
                                {t(`track.state.${step}`)}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {/* Meta grid */}
                  <div className="grid gap-5 px-5 py-5 sm:grid-cols-3 sm:px-6">
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <Warehouse className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('track.origin')}
                      </p>
                      <p className="mt-1.5 text-[13px] font-medium leading-snug">{order.originWarehouse.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{order.originWarehouse.address}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('track.destination')}
                      </p>
                      <p className="mt-1.5 text-[13px] font-medium">
                        {order.destination.city}, {order.destination.country}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <Truck className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('track.carrier')}
                      </p>
                      <p className="mt-1.5 text-[13px] font-medium">{order.carrier}</p>
                      {order.estimatedDeliveryAt && !cancelled && (
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {t('track.estimated')}: {formatDate(order.estimatedDeliveryAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
                  <h3 className="font-display text-[17px] font-medium">{t('track.journey')}</h3>
                  <ol className="mt-4 space-y-0">
                    {timeline.map((ev, i) => {
                      const isLast = i === timeline.length - 1;
                      const stateKey = STEP_STATES.includes(ev.status as (typeof STEP_STATES)[number])
                        ? ev.status
                        : 'CANCELLED';
                      return (
                        <li key={ev.status} className="relative flex gap-4 pb-6 last:pb-0">
                          {/* connector */}
                          {!isLast && (
                            <span
                              className={`absolute left-[11px] top-6 h-full w-px ${ev.occurred ? 'bg-olive/40' : 'bg-border'}`}
                              aria-hidden="true"
                            />
                          )}
                          <span className="relative mt-0.5 shrink-0">
                            {ev.occurred ? (
                              <CheckCircle2 className="h-6 w-6 text-olive" strokeWidth={1.5} />
                            ) : (
                              <Circle className="h-6 w-6 text-border" strokeWidth={1.5} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <p className={`text-[13.5px] font-semibold ${ev.occurred ? '' : 'text-muted-foreground'}`}>
                                {t(`track.state.${stateKey}`)}
                                {!ev.occurred && (
                                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    {t('track.upcoming')}
                                  </span>
                                )}
                              </p>
                              <p className="text-[12px] text-muted-foreground">{formatDateTime(ev.occurredAt)}</p>
                            </div>
                            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{ev.description}</p>
                            {ev.location && (
                              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground/80">
                                <MapPin className="h-3 w-3" strokeWidth={1.5} /> {ev.location}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
                    <h3 className="font-display text-[17px] font-medium">{t('track.items')}</h3>
                    <ul className="mt-4 divide-y divide-border/70">
                      {order.items.map((item, i) => (
                        <li key={`${item.name}-${i}`} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border/60">
                            <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[13px] font-medium">{item.name}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.quantity}
                            </p>
                          </div>
                          <PackageCheck className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Demo note */}
        <p className="mt-8 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground/80">
          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {t('track.demoNote')}
        </p>

        {/* Help */}
        <div className="mt-6 rounded-md border border-border bg-cream/60 p-5 text-[13px] leading-relaxed text-foreground/75">
          <p>
            Lost your tracking number? It is on your dispatch confirmation email, or in{' '}
            <Link href="/account/orders" className="font-medium underline underline-offset-2 hover:text-olive">
              your order history
            </Link>
            . Still stuck?{' '}
            <Link href="/contact" className="font-medium underline underline-offset-2 hover:text-olive">
              Contact support
            </Link>{' '}
            <Mail className="inline h-3.5 w-3.5 align-[-2px]" strokeWidth={1.5} />.
          </p>
        </div>
      </div>
    </div>
  );
}

// End of TrackView component.
