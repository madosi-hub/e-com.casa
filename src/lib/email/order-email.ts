import 'server-only';

import { EMAILS, COMPANY } from '@/lib/company';
import { parseOrderEmailLines, resolveOrderEmailProfile } from './order-profile';
import { renderStorePaymentConfirmed } from './templates/store/payment-confirmed';
import { renderNuraltaPaymentConfirmed } from './templates/nuralta/payment-confirmed';
import type { OrderEmailInput } from './types';

export type { OrderEmailInput } from './types';

const RESEND_API = 'https://api.resend.com/emails';

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendPaymentConfirmedEmail(input: OrderEmailInput): Promise<boolean> {
  if (!configured()) {
    console.warn('RESEND_API_KEY is not configured; payment email skipped');
    return false;
  }

  const items = parseOrderEmailLines(input.itemsJson);
  const profile = resolveOrderEmailProfile(items);
  const trackingUrl = input.trackingNumber
    ? `${COMPANY.domain}/track?code=${encodeURIComponent(input.trackingNumber)}`
    : null;
  const templateInput = { ...input, items, trackingUrl };
  const message = profile === 'nuralta'
    ? renderNuraltaPaymentConfirmed(templateInput)
    : renderStorePaymentConfirmed(templateInput);

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${message.fromName} <${EMAILS.orders}>`, to: [input.customerEmail], reply_to: [EMAILS.support], subject: message.subject, html: message.html, text: message.text, tags: [{ name: 'type', value: 'payment_confirmed' }, { name: 'profile', value: message.profile }, { name: 'order', value: input.orderNumber }] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Resend payment email failed', response.status, body.slice(0, 300));
    return false;
  }
  return true;
}
