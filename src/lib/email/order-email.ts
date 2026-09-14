import 'server-only';

import { EMAILS, COMPANY } from '@/lib/company';

const RESEND_API = 'https://api.resend.com/emails';

function configured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c);
}

export interface OrderEmailInput {
  orderNumber: string;
  customerEmail: string;
  firstName: string;
  total: string;
  currency: string;
  trackingNumber?: string | null;
  originWarehouse?: string | null;
}

export async function sendPaymentConfirmedEmail(input: OrderEmailInput): Promise<boolean> {
  if (!configured()) {
    console.warn('RESEND_API_KEY is not configured; payment email skipped');
    return false;
  }

  const name = escapeHtml(input.firstName || 'Customer');
  const order = escapeHtml(input.orderNumber);
  const total = escapeHtml(`${input.currency} ${input.total}`);
  const tracking = input.trackingNumber ? escapeHtml(input.trackingNumber) : null;
  const trackingUrl = `${COMPANY.domain}/track${tracking ? `?number=${encodeURIComponent(input.trackingNumber!)}` : ''}`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f4ed;font-family:Arial,Helvetica,sans-serif;color:#1f241c"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td style="padding:32px"><p style="font-size:24px;line-height:30px;font-weight:700;margin:0 0 24px;color:#1f241c">E-com.casa</p><p style="font-size:18px;line-height:26px;margin:0 0 12px">Thank you, ${name}.</p><p style="font-size:14px;line-height:22px;margin:0 0 24px;color:#62685e">Your payment has been confirmed and your order is now being prepared.</p><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Order</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${order}</td></tr><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Total</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${total}</td></tr>${tracking ? `<tr><td style="padding:10px 0;font-size:13px;line-height:20px">Tracking</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${tracking}</td></tr>` : ''}</table>${tracking ? `<p style="margin:28px 0"><a href="${trackingUrl}" style="display:inline-block;background:#5f7052;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;line-height:20px">Track my order</a></p>` : ''}<p style="font-size:12px;line-height:18px;color:#777;margin:28px 0 0">${escapeHtml(COMPANY.legalName)} · Company No. ${escapeHtml(COMPANY.companyNumber)}<br>${escapeHtml(COMPANY.registeredOffice.line1)}, ${escapeHtml(COMPANY.registeredOffice.line2)}, London ${escapeHtml(COMPANY.registeredOffice.postcode)}, United Kingdom</p></td></tr></table></td></tr></table></body></html>`;
  const text = `Thank you, ${input.firstName}.\n\nPayment confirmed for order ${input.orderNumber}.\nTotal: ${input.currency} ${input.total}\n${tracking ? `Tracking: ${input.trackingNumber}\nTrack: ${trackingUrl}\n` : ''}\nE-com.casa\n${COMPANY.legalName} · Company No. ${COMPANY.companyNumber}`;

  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `E-com.casa <${EMAILS.orders}>`, to: [input.customerEmail], reply_to: [EMAILS.support], subject: `Payment confirmed — ${input.orderNumber}`, html, text, tags: [{ name: 'type', value: 'payment_confirmed' }, { name: 'order', value: input.orderNumber }] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('Resend payment email failed', response.status, body.slice(0, 300));
    return false;
  }
  return true;
}
