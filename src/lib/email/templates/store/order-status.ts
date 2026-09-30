import { COMPANY } from '@/lib/company';
import type { OrderStatusEmailTemplateInput, RenderedOrderEmail } from '../../types';
import { escapeHtml, renderHtmlItems, renderTextItems } from '../shared';

const CONTENT = {
  SHIPPED: { subject: 'Order shipped', title: 'Your order has shipped', body: 'Your parcel has left our fulfilment centre and is on its way.' },
  IN_TRANSIT: { subject: 'Order in transit', title: 'Your order is in transit', body: 'Your parcel is moving through the carrier network towards your destination.' },
  OUT_FOR_DELIVERY: { subject: 'Out for delivery', title: 'Your order is out for delivery', body: 'Your parcel is with the local courier and delivery is expected soon.' },
  DELIVERED: { subject: 'Order delivered', title: 'Your order has been delivered', body: 'The delivery journey is complete. We hope you enjoy your purchase.' },
  CANCELLED: { subject: 'Order cancelled', title: 'Your order was cancelled', body: 'This order will not continue through fulfilment. Contact support if you need any assistance.' },
  REFUNDED: { subject: 'Refund confirmed', title: 'Your refund was confirmed', body: 'The refund was submitted to your original payment method. Your bank may take additional time to display it.' },
  PARTIALLY_REFUNDED: { subject: 'Partial refund confirmed', title: 'Your partial refund was confirmed', body: 'A partial refund was submitted to your original payment method. Your bank may take additional time to display it.' },
} as const;

export function renderStoreOrderStatus(input: OrderStatusEmailTemplateInput): RenderedOrderEmail {
  const content = CONTENT[input.status];
  const order = escapeHtml(input.orderNumber);
  const tracking = input.trackingNumber ? escapeHtml(input.trackingNumber) : null;
  const refund = input.refundAmount ? escapeHtml(`${input.currency} ${input.refundAmount}`) : null;
  const items = renderHtmlItems(input.items, '#1f241c');
  const action = tracking && input.trackingUrl && !['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(input.status)
    ? `<p style="margin:28px 0"><a href="${input.trackingUrl}" style="display:inline-block;background:#5f7052;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;line-height:20px">Track my order</a></p>`
    : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f4ed;font-family:Arial,Helvetica,sans-serif;color:#1f241c"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td style="padding:32px"><p style="font-size:24px;line-height:30px;font-weight:700;margin:0 0 24px">E-com.casa</p><p style="font-size:20px;line-height:28px;margin:0 0 12px">${content.title}</p><p style="font-size:14px;line-height:22px;margin:0 0 24px;color:#62685e">${content.body}</p>${items}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0;font-size:13px">Order</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${order}</td></tr>${tracking ? `<tr><td style="padding:10px 0;font-size:13px">Tracking</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${tracking}</td></tr>` : ''}${refund ? `<tr><td style="padding:10px 0;font-size:13px">Refund</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${refund}</td></tr>` : ''}</table>${action}<p style="font-size:12px;line-height:18px;color:#777;margin:28px 0 0">${escapeHtml(COMPANY.legalName)} · Company No. ${escapeHtml(COMPANY.companyNumber)}</p></td></tr></table></td></tr></table></body></html>`;
  const text = `${content.title}\n\n${content.body}\n\nOrder: ${input.orderNumber}\n${renderTextItems(input.items)}${tracking ? `Tracking: ${input.trackingNumber}\n` : ''}${refund ? `Refund: ${input.currency} ${input.refundAmount}\n` : ''}${action ? `Track: ${input.trackingUrl}\n` : ''}\nE-com.casa`;

  return { profile: 'store', fromName: 'E-com.casa', subject: `${content.subject} — ${input.orderNumber}`, html, text };
}
