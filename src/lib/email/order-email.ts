import 'server-only';

import { EMAILS, COMPANY } from '@/lib/company';
import { parseOrderEmailLines, resolveOrderEmailProfile } from './order-profile';
import { renderStorePaymentConfirmed } from './templates/store/payment-confirmed';
import { renderNuraltaPaymentConfirmed } from './templates/nuralta/payment-confirmed';
import { renderStoreOrderStatus } from './templates/store/order-status';
import { renderNuraltaOrderStatus } from './templates/nuralta/order-status';
import type { OrderEmailInput, OrderStatusEmailInput, RenderedOrderEmail } from './types';

export type { OrderEmailInput, OrderStatusEmailInput, OrderNotificationStatus } from './types';

const RESEND_API = 'https://api.resend.com/emails';

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

async function deliverOrderEmail(input: OrderEmailInput, message: RenderedOrderEmail, type: string): Promise<boolean> {
  if (!configured()) {
    console.warn(`RESEND_API_KEY is not configured; ${type} email skipped`);
    return false;
  }

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${message.fromName} <${EMAILS.orders}>`, to: [input.customerEmail], reply_to: [EMAILS.support], subject: message.subject, html: message.html, text: message.text, tags: [{ name: 'type', value: type }, { name: 'profile', value: message.profile }, { name: 'order', value: input.orderNumber }] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Resend ${type} email failed`, response.status, body.slice(0, 300));
    return false;
  }
  return true;
}

function templateContext(input: OrderEmailInput) {
  const items = parseOrderEmailLines(input.itemsJson);
  const profile = resolveOrderEmailProfile(items);
  const trackingUrl = input.trackingNumber
    ? `${COMPANY.domain}/track?code=${encodeURIComponent(input.trackingNumber)}`
    : null;
  return { items, profile, trackingUrl };
}

export async function sendPaymentConfirmedEmail(input: OrderEmailInput): Promise<boolean> {
  const { items, profile, trackingUrl } = templateContext(input);
  const templateInput = { ...input, items, trackingUrl };
  const message = profile === 'nuralta'
    ? renderNuraltaPaymentConfirmed(templateInput)
    : renderStorePaymentConfirmed(templateInput);
  return deliverOrderEmail(input, message, 'payment_confirmed');
}

export async function sendOrderStatusEmail(input: OrderStatusEmailInput): Promise<boolean> {
  const { items, profile, trackingUrl } = templateContext(input);
  const templateInput = { ...input, items, trackingUrl };
  const message = profile === 'nuralta'
    ? renderNuraltaOrderStatus(templateInput)
    : renderStoreOrderStatus(templateInput);
  return deliverOrderEmail(input, message, input.status.toLowerCase());
}
