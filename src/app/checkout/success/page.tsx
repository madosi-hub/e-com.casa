import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { tokenMatches } from '@/lib/checkout';
import { ensureTracking } from '@/lib/tracking';
import { refreshOrderPayment } from '@/lib/payments/reconcile-payment';
import { SuccessView, type SuccessOrderData } from './success-view';

export const metadata: Metadata = {
  title: 'Order status',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

const terminalPaymentStates = new Set(['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']);

async function loadOrder(orderNumber: string, token: string): Promise<SuccessOrderData | null> {
  try {
    let order = await db.order.findUnique({
      where: { orderNumber },
      include: { invoices: { select: { invoiceNumber: true } } },
    });
    if (!order || !tokenMatches(order.accessToken, token)) return null;

    // Reconcile immediately on the authenticated return URL. This makes
    // card/express success confirmation independent of a merchant webhook
    // and avoids waiting for the client polling interval in the common case.
    if (!terminalPaymentStates.has(order.paymentStatus)) {
      await refreshOrderPayment(order.id);
      order = await db.order.findUnique({
        where: { id: order.id },
        include: { invoices: { select: { invoiceNumber: true } } },
      });
      if (!order) return null;
    }

    // Keep the tracking lifecycle moving on this read (idempotent).
    const tracked = await ensureTracking(order);
    const trackedOrder = tracked.order;

    let items: { slug: string; name: string; image: string; price: string; quantity: number; variantLabel?: string | null }[] = [];
    try {
      items = JSON.parse(order.itemsJson);
    } catch {
      items = [];
    }

    return {
      orderNumber: trackedOrder.orderNumber,
      status: trackedOrder.paymentStatus,
      fulfilmentStatus: trackedOrder.status,
      email: trackedOrder.email,
      firstName: trackedOrder.firstName,
      lastName: trackedOrder.lastName,
      address: trackedOrder.address,
      address2: trackedOrder.address2,
      city: trackedOrder.city,
      postalCode: trackedOrder.postalCode,
      country: trackedOrder.country,
      shippingMethod: trackedOrder.shippingMethod,
      subtotal: trackedOrder.subtotal,
      shipping: trackedOrder.shipping,
      discount: trackedOrder.discount,
      total: trackedOrder.total,
      promoCode: trackedOrder.promoCode,
      giftWrap: trackedOrder.giftWrap,
      notes: trackedOrder.notes,
      currency: trackedOrder.currency,
      paymentMethodType: trackedOrder.paymentMethodType,
      createdAt: trackedOrder.createdAt.toISOString(),
      invoiceNumber: trackedOrder.invoices[0]?.invoiceNumber ?? null,
      trackingNumber: trackedOrder.trackingNumber,
      items,
    };
  } catch (error) {
    console.error('checkout success load/reconciliation failed', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

async function OrderContent({ orderNumber, token, offer }: { orderNumber: string; token: string; offer?: string }) {
  const data = await loadOrder(orderNumber, token);
  const painelRipado = offer === 'painel-ripado';

  if (!data) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-[26px] font-medium">
          {painelRipado ? 'Encomenda não encontrada' : 'Order not found'}
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {painelRipado
            ? `Não foi possível encontrar a encomenda ${orderNumber}. Consulte o email de confirmação ou contacte o apoio ao cliente.`
            : `We could not find order ${orderNumber}. Check your confirmation email or contact support.`}
        </p>
        <Link href={painelRipado ? '/offers/painel-ripado' : '/shop'} className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-7 text-[14px] font-semibold text-primary-foreground">
          {painelRipado ? 'Continuar a comprar' : 'Continue shopping'}
        </Link>
      </div>
    );
  }

  return (
    <SuccessView
      order={data}
      token={token}
      language={painelRipado ? 'pt' : undefined}
      deliveryWindow={painelRipado ? '8–12' : undefined}
      deliveryMessage={painelRipado ? 'O prazo de entrega é de 8 a 12 dias úteis devido à elevada procura.' : undefined}
      retryPath={painelRipado ? '/offers/painel-ripado/checkout' : undefined}
      continuePath={painelRipado ? '/offers/painel-ripado' : undefined}
      continueLabel={painelRipado ? 'Voltar à oferta' : undefined}
    />
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; token?: string; offer?: string }>;
}) {
  const { order: orderNumber, token, offer } = await searchParams;
  const painelRipado = offer === 'painel-ripado';

  return (
    <div className="container-ecom py-12 lg:py-16">
      {orderNumber && token ? (
        <Suspense
          fallback={
            <div className="py-16 text-center text-[14px] text-muted-foreground">
              {painelRipado ? 'A verificar a sua encomenda…' : 'Checking your order…'}
            </div>
          }
        >
          <OrderContent orderNumber={orderNumber} token={token} offer={offer} />
        </Suspense>
      ) : (
        // No token → show nothing about any order
        <div className="py-16 text-center">
          <h1 className="font-display text-[26px] font-medium">
            {painelRipado ? 'Estado da encomenda' : 'Order status'}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {painelRipado ? 'Abra a ligação no email de confirmação da encomenda ou ' : 'Open the link from your order confirmation email, or '}
            <Link href={painelRipado ? '/offers/painel-ripado/informacao/contacto' : '/contact'} className="text-olive underline underline-offset-2">
              {painelRipado ? 'contacte o apoio ao cliente' : 'contact support'}
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
