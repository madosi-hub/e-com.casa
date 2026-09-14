'use client';

// Success / payment status view
// Server-verified order data drives every state. Nothing here
// trusts client input: an order shows "confirmed" only when the
// database says the verified gateway event marked it PAID.
// Async methods (Multibanco, MB WAY…) poll the server and the
// view transitions automatically as the webhook lands.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Gift,
  Hourglass,
  Package,
  ShieldQuestion,
  StickyNote,
  Truck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';
import { useCart } from '@/lib/cart-store';
import { resetCheckoutToken } from '@/hooks/use-payment-session';
import { formatPrice, formatDate } from '@/lib/format';
import { GIFT_WRAP_PRICE } from '@/lib/constants';

export interface SuccessOrderData {
  orderNumber: string;
  status: string; // order payment status
  fulfilmentStatus: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  address2: string | null;
  city: string;
  postalCode: string;
  country: string;
  shippingMethod: string;
  subtotal: string;
  shipping: string;
  discount: string;
  total: string;
  promoCode: string | null;
  giftWrap: boolean;
  notes: string | null;
  currency: string;
  paymentMethodType: string | null;
  createdAt: string;
  invoiceNumber: string | null;
  trackingNumber?: string | null;
  items: { slug: string; name: string; image: string; price: string; quantity: number; variantLabel?: string | null }[];
}

interface StatusApiResponse {
  paymentStatus: string;
}

function PaymentStatusPoller({ orderNumber, token }: { orderNumber: string; token: string }) {
  const t = useT();
  const router = useRouter();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/status?order=${encodeURIComponent(orderNumber)}&token=${encodeURIComponent(token)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data: StatusApiResponse = await res.json();
        setTick((t) => t + 1);
        if (['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(data.paymentStatus)) {
          router.refresh(); // terminal state → re-render server view
        }
      } catch {
        // transient — keep polling
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [orderNumber, token, router]);

  return (
    <p className="mt-3 text-[11.5px] text-muted-foreground" aria-live="polite" data-tick={tick}>
      {t('success.autoRefresh')}
    </p>
  );
}

/** The cart belongs to a placed order now — clear it and the checkout session. */
function FinaliseClientState() {
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    resetCheckoutToken();
  }, []);
  return null;
}

export function SuccessView({ order, token }: { order: SuccessOrderData; token: string }) {
  const t = useT();
  const waiting = ['PENDING_PAYMENT', 'PAYMENT_PROCESSING'].includes(order.status);

  // header states
  const header = (() => {
    switch (order.status) {
      case 'PAID':
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive/12">
              <CheckCircle2 className="h-8 w-8 text-olive" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titlePaid')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">
              {t('success.descPaid', { email: order.email, firstName: order.firstName })}
            </p>
          </>
        );
      case 'PAYMENT_PROCESSING':
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream">
              <Hourglass className="h-8 w-8 text-[#e0a03c]" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titleProcessing')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t('success.descProcessing')}</p>
          </>
        );
      case 'PAYMENT_FAILED':
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10">
              <XCircle className="h-8 w-8 text-terracotta" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titleFailed')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t('success.descFailed')}</p>
          </>
        );
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive/10">
              <CheckCircle2 className="h-8 w-8 text-olive" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titleRefunded')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t('success.descRefunded')}</p>
          </>
        );
      case 'CANCELLED':
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream">
              <ShieldQuestion className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titleCancelled')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t('success.descCancelled')}</p>
          </>
        );
      default: // PENDING_PAYMENT — e.g. Multibanco instructions pending
        return (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream">
              <Hourglass className="h-8 w-8 text-[#e0a03c]" strokeWidth={1.5} />
            </span>
            <h1 className="font-display mt-5 text-[30px] font-medium tracking-tight">
              {t('success.titlePending')}
            </h1>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t('success.descPending')}</p>
          </>
        );
    }
  })();

  return (
    <div className="mx-auto max-w-2xl">
      <FinaliseClientState />
      <div className="text-center">{header}</div>
      {waiting && <PaymentStatusPoller orderNumber={order.orderNumber} token={token} />}

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('success.orderNumber')}
            </p>
            <p className="font-display mt-1 flex flex-wrap items-center gap-2 text-[20px] font-medium">
              {order.orderNumber}
              {order.giftWrap && (
                <span className="inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-terracotta">
                  <Gift className="h-3 w-3" strokeWidth={2} /> Gift
                </span>
              )}
            </p>
            {order.invoiceNumber && (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {t('success.invoice')}: {order.invoiceNumber}
              </p>
            )}
            {order.status === 'PAID' && order.trackingNumber && (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
                <Truck className="h-3.5 w-3.5 text-olive" strokeWidth={1.5} />
                {t('success.trackingNumber')}&nbsp;
                <Link
                  href={`/track?code=${encodeURIComponent(order.trackingNumber)}`}
                  className="font-mono font-medium text-foreground underline underline-offset-2 hover:text-olive"
                >
                  {order.trackingNumber}
                </Link>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('success.placed')}
            </p>
            <p className="mt-1 text-[13.5px]">{formatDate(order.createdAt)}</p>
          </div>
        </div>

        <ul className="mt-6 space-y-4 border-t border-border pt-5">
          {order.items.map((item) => (
            <li key={item.slug} className="flex items-center gap-4">
              <Link
                href={`/product/${item.slug}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/60"
              >
                <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/product/${item.slug}`} className="line-clamp-1 text-[13.5px] font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-[12px] text-muted-foreground">
                  {item.variantLabel ? `${item.variantLabel} · ` : ''}Qty {item.quantity}
                </p>
              </div>
              <p className="text-[13.5px] font-semibold">{formatPrice(parseFloat(item.price) * item.quantity)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-border pt-5 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {parseFloat(order.discount) > 0 && (
            <div className="flex justify-between text-olive">
              <dt>
                {t('cart.discount')} {order.promoCode ? `(${order.promoCode})` : ''}
              </dt>
              <dd>−{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {t('checkout.shippingLabel', { method: order.shippingMethod })}
            </dt>
            <dd>{parseFloat(order.shipping) === 0 ? t('common.free') : formatPrice(order.shipping)}</dd>
          </div>
          {order.giftWrap && (
            <div className="flex justify-between text-terracotta">
              <dt className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('checkout.giftWrapLine')}
              </dt>
              <dd>+{formatPrice(GIFT_WRAP_PRICE)}</dd>
            </div>
          )}
          <div className="flex justify-between text-[16px] font-semibold">
            <dt>{t('checkout.total')} ({t('checkout.vat')})</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-4 rounded-md bg-cream/60 p-4 text-[12.5px] leading-relaxed sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              <Package className="h-3.5 w-3.5 text-olive" /> {t('success.deliveryAddress')}
            </p>
            <p className="mt-1.5 text-muted-foreground">
              {order.firstName} {order.lastName}
              <br />
              {order.address}
              {order.address2 ? `, ${order.address2}` : ''}
              <br />
              {order.postalCode} {order.city}, {order.country}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              {order.status === 'PAID' ? (
                <Package className="h-3.5 w-3.5 text-olive" />
              ) : (
                <Hourglass className="h-3.5 w-3.5 text-[#e0a03c]" />
              )}
              {t('success.nextTitle')}
            </p>
            <p className="mt-1.5 text-muted-foreground">
              {order.status === 'PAID'
                ? t('success.nextPaid', { window: order.shippingMethod === 'express' ? '1–2' : '3–5' })
                : t('success.nextWaiting')}
            </p>
          </div>
          {order.notes && (
            <div className="sm:col-span-2">
              <p className="flex items-center gap-1.5 font-semibold">
                <StickyNote className="h-3.5 w-3.5 text-terracotta" /> {t('checkout.notes')}
              </p>
              <p className="mt-1.5 whitespace-pre-line rounded-md border border-border/70 bg-background px-3 py-2 text-muted-foreground">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order.status === 'PAYMENT_FAILED' || order.status === 'CANCELLED' ? (
          <Button asChild className="rounded-md bg-primary">
            <Link href="/checkout">{t('success.retry')}</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-md">
            <Link href={order.trackingNumber ? `/track?code=${encodeURIComponent(order.trackingNumber)}` : '/account/orders'}>
              {t('success.trackOrder')}
            </Link>
          </Button>
        )}
        <Button asChild className="rounded-md bg-primary">
          <Link href="/shop">{t('checkout.backToShop')}</Link>
        </Button>
      </div>
    </div>
  );
}
