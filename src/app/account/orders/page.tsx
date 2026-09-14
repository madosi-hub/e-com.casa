'use client';

// Order history — secure device-scoped lookup
// Orders placed in this browser are listed from the locally saved
// (orderNumber, accessToken) pairs. Every fetch is authenticated
// with the random access token — there is no email-only lookup
// anywhere in the app.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight, CircleCheck, Truck, LoaderCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate } from '@/lib/format';
import type { Order, OrderItem } from '@/types';

const STATUS_STEPS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

interface StoredRef {
  orderNumber: string;
  accessToken: string;
  createdAt: string;
}

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Paid', cls: 'bg-olive/12 text-olive' },
  PENDING_PAYMENT: { label: 'Awaiting payment', cls: 'bg-[#e0a03c]/15 text-[#8a6420]' },
  PAYMENT_PROCESSING: { label: 'Payment processing', cls: 'bg-[#e0a03c]/15 text-[#8a6420]' },
  PAYMENT_FAILED: { label: 'Payment failed', cls: 'bg-terracotta/10 text-terracotta' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
  REFUNDED: { label: 'Refunded', cls: 'bg-muted text-muted-foreground' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', cls: 'bg-muted text-muted-foreground' },
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(0);

  const load = useCallback(async () => {
    let refs: StoredRef[] = [];
    try {
      refs = JSON.parse(localStorage.getItem('ecom-orders') ?? '[]');
    } catch {
      refs = [];
    }
    if (refs.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const loaded: Order[] = [];
    let failures = 0;
    for (const ref of refs.slice(0, 20)) {
      try {
        const res = await fetch(
          `/api/orders?order=${encodeURIComponent(ref.orderNumber)}&token=${encodeURIComponent(ref.accessToken)}`,
        );
        if (res.ok) {
          const data = await res.json();
          loaded.push(data.order as Order);
        } else {
          failures += 1;
        }
      } catch {
        failures += 1;
      }
    }
    loaded.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    setOrders(loaded);
    setFailed(failures);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="container-ecom py-10 lg:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[28px] font-medium tracking-tight sm:text-[32px]">My orders</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Orders you placed on this device. To check an order from another device, open the link from your
          confirmation email or contact support.
        </p>

        {loading && (
          <div className="mt-10 flex items-center gap-2 text-[13.5px] text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your orders…
          </div>
        )}

        {!loading && failed > 0 && (
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            {failed} order{failed === 1 ? '' : 's'} could not be loaded from this device.
          </p>
        )}

        {orders && orders.length === 0 && !loading && (
          <div className="mt-10 rounded-lg border border-border bg-cream/50 px-6 py-12 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-display mt-4 text-[19px]">No orders yet</p>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              When you place an order it will appear here. Start with a best seller.
            </p>
            <Button asChild className="mt-5 rounded-md">
              <Link href="/shop">Browse the shop</Link>
            </Button>
          </div>
        )}

        {orders && orders.length > 0 && (
          <ul className="mt-8 space-y-5" aria-label="Order history">
            {orders.map((order) => {
              let items: OrderItem[] = [];
              try {
                items = JSON.parse(order.itemsJson);
              } catch {
                items = [];
              }
              const paid = order.paymentStatus === 'PAID';
              const badge = PAYMENT_BADGE[order.paymentStatus] ?? PAYMENT_BADGE.PENDING_PAYMENT;
              const stepIndex = paid ? STATUS_STEPS.indexOf(order.status) : -1;
              return (
                <li key={order.orderNumber} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-cream/40 px-5 py-4">
                    <div>
                      <p className="font-display text-[16px] font-medium">{order.orderNumber}</p>
                      <p className="text-[12px] text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <p className="text-[15px] font-semibold">{formatPrice(order.total)}</p>
                    </div>
                  </div>

                  {/* Tracker — fulfilment advances only after payment */}
                  {paid && (
                    <div className="border-b border-border px-5 py-4">
                      <ol className="flex items-center" aria-label={`Order status: ${order.status}`}>
                        {STATUS_STEPS.map((step, i) => (
                          <li key={step} className="flex flex-1 items-center last:flex-none">
                            <span className="flex flex-col items-center gap-1.5">
                              {i <= stepIndex ? (
                                <CircleCheck className="h-5 w-5 text-olive" strokeWidth={1.5} />
                              ) : (
                                <span className="h-5 w-5 rounded-full border-2 border-border" aria-hidden />
                              )}
                              <span className={`text-[10px] font-medium capitalize ${i <= stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.toLowerCase()}
                              </span>
                            </span>
                            {i < STATUS_STEPS.length - 1 && (
                              <span className={`mx-2 mb-4 h-px flex-1 ${i < stepIndex ? 'bg-olive' : 'bg-border'}`} aria-hidden />
                            )}
                          </li>
                        ))}
                      </ol>
                      {order.status === 'SHIPPED' && order.trackingNumber && (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Truck className="h-3.5 w-3.5 text-olive" /> Tracking:{' '}
                          <Link
                            href={`/track?code=${encodeURIComponent(order.trackingNumber)}`}
                            className="font-mono font-medium text-foreground underline underline-offset-2 hover:text-olive"
                          >
                            {order.trackingNumber}
                          </Link>
                        </p>
                      )}
                      {order.status !== 'SHIPPED' && (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                          {order.trackingNumber ? (
                            <>
                              <Truck className="h-3.5 w-3.5 text-olive" /> Tracking:{' '}
                              <Link
                                href={`/track?code=${encodeURIComponent(order.trackingNumber)}`}
                                className="font-mono font-medium text-foreground underline underline-offset-2 hover:text-olive"
                              >
                                {order.trackingNumber}
                              </Link>
                            </>
                          ) : (
                            <>
                              <Truck className="h-3.5 w-3.5 text-olive" /> Tracking number will arrive by email once
                              your parcel is dispatched.
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {!paid && (
                    <div className="border-b border-border px-5 py-3.5">
                      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        {order.paymentStatus === 'PAYMENT_FAILED' || order.paymentStatus === 'CANCELLED' ? (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-terracotta" /> The payment did not complete — the order was not charged.
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-[#e0a03c]" /> Waiting for the payment to be confirmed. You will receive a
                            confirmation email once it clears.
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <ul className="divide-y divide-border/70 px-5">
                    {items.map((item) => (
                      <li key={item.slug} className="flex items-center gap-3.5 py-3.5">
                        <Link href={`/product/${item.slug}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border/60">
                          <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[13px] font-medium">{item.name}</p>
                          <p className="text-[12px] text-muted-foreground">Qty {item.quantity}</p>
                        </div>
                        <p className="text-[13px] font-medium">{formatPrice(parseFloat(item.price) * item.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border/70 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/checkout/success?order=${encodeURIComponent(order.orderNumber)}&token=${encodeURIComponent(
                          (JSON.parse(localStorage.getItem('ecom-orders') ?? '[]') as StoredRef[]).find(
                            (r) => r.orderNumber === order.orderNumber,
                          )?.accessToken ?? '',
                        )}`}
                        className="flex items-center gap-1 text-[12.5px] font-medium text-olive hover:underline"
                      >
                        View order details <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      {order.trackingNumber && (
                        <Link
                          href={`/track?code=${encodeURIComponent(order.trackingNumber)}`}
                          className="flex items-center gap-1 text-[12.5px] font-medium text-olive hover:underline"
                        >
                          <Truck className="h-3.5 w-3.5" /> Track parcel <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
