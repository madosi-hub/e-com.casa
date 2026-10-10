import 'server-only';

import { EMAILS, COMPANY } from '@/lib/company';
import { parseOrderEmailLines, resolveOrderEmailProfile } from './order-profile';
import { renderStorePaymentConfirmed } from './templates/store/payment-confirmed';
import { renderNuraltaPaymentConfirmed } from './templates/nuralta/payment-confirmed';
import { renderStoreOrderStatus } from './templates/store/order-status';
import { renderNuraltaOrderStatus } from './templates/nuralta/order-status';
import type { OrderEmailInput, OrderStatusEmailInput, RenderedOrderEmail } from './types';

export type { OrderEmailInput, OrderStatusEmailInput, OrderNotificationStatus } from './types';

import { db } from '@/lib/db';
import { sendTracked } from './tracking';

async function deliverOrderEmail(input: OrderEmailInput, message: RenderedOrderEmail, type: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const email = await sendTracked(db, {
      key: `order:${input.orderNumber}:${type}:${input.trackingNumber || ''}:${'refundAmount' in input ? input.refundAmount || '' : ''}`,
      from: `${message.fromName} <${EMAILS.orders}>`, to: [input.customerEmail], reply_to: [EMAILS.support],
      subject: message.subject, html: message.html, text: message.text, type, orderNumber: input.orderNumber,
      tags: [{name:'type',value:type},{name:'profile',value:message.profile},{name:'order',value:input.orderNumber}],
    });
    return email.status === 'accepted' || ['sent','delivered','opened','clicked'].includes(email.status);
  } catch {
    console.warn('Order email unavailable; payment processing continues');
    return false;
  }
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
