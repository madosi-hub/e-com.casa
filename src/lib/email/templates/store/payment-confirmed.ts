import { COMPANY } from '@/lib/company';
import type { OrderEmailTemplateInput, RenderedOrderEmail } from '../../types';
import { escapeHtml, renderHtmlItems, renderTextItems } from '../shared';

export function renderStorePaymentConfirmed(input: OrderEmailTemplateInput): RenderedOrderEmail {
  const name = escapeHtml(input.firstName || 'Customer');
  const order = escapeHtml(input.orderNumber);
  const total = escapeHtml(`${input.currency} ${input.total}`);
  const tracking = input.trackingNumber ? escapeHtml(input.trackingNumber) : null;
  const items = renderHtmlItems(input.items, '#1f241c');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f4ed;font-family:Arial,Helvetica,sans-serif;color:#1f241c"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td style="padding:32px"><p style="font-size:24px;line-height:30px;font-weight:700;margin:0 0 24px;color:#1f241c">E-com.casa</p><p style="font-size:18px;line-height:26px;margin:0 0 12px">Thank you, ${name}.</p><p style="font-size:14px;line-height:22px;margin:0 0 24px;color:#62685e">Your payment has been confirmed and your order is now being prepared.</p>${items}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Order</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${order}</td></tr><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Total</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${total}</td></tr>${tracking ? `<tr><td style="padding:10px 0;font-size:13px;line-height:20px">Tracking</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${tracking}</td></tr>` : ''}</table>${tracking && input.trackingUrl ? `<p style="margin:28px 0"><a href="${input.trackingUrl}" style="display:inline-block;background:#5f7052;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;line-height:20px">Track my order</a></p>` : ''}<p style="font-size:12px;line-height:18px;color:#777;margin:28px 0 0">${escapeHtml(COMPANY.legalName)} · Company No. ${escapeHtml(COMPANY.companyNumber)}<br>${escapeHtml(COMPANY.registeredOffice.line1)}, ${escapeHtml(COMPANY.registeredOffice.line2)}, London ${escapeHtml(COMPANY.registeredOffice.postcode)}, United Kingdom</p></td></tr></table></td></tr></table></body></html>`;
  const text = `Thank you, ${input.firstName}.\n\nPayment confirmed for order ${input.orderNumber}.\n${renderTextItems(input.items)}Total: ${input.currency} ${input.total}\n${tracking && input.trackingUrl ? `Tracking: ${input.trackingNumber}\nTrack: ${input.trackingUrl}\n` : ''}\nE-com.casa\n${COMPANY.legalName} · Company No. ${COMPANY.companyNumber}`;

  return {
    profile: 'store',
    fromName: 'E-com.casa',
    subject: `Payment confirmed — ${input.orderNumber}`,
    html,
    text,
  };
}
