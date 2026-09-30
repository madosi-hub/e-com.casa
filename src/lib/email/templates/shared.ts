import type { OrderEmailLine } from '../types';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

export function renderHtmlItems(items: OrderEmailLine[], colour: string): string {
  if (!items.length) return '';
  const rows = items.map((item) => {
    const name = escapeHtml(item.name || item.slug);
    const variant = item.variantLabel ? `<br><span style="font-size:12px;color:#777">${escapeHtml(item.variantLabel)}</span>` : '';
    const quantity = Number.isFinite(item.quantity) ? Math.max(1, Number(item.quantity)) : 1;
    return `<tr><td style="padding:10px 0;border-top:1px solid #e8e2dc;font-size:13px;line-height:19px;color:${colour}">${name}${variant}</td><td align="right" style="padding:10px 0;border-top:1px solid #e8e2dc;font-size:13px;line-height:19px;color:${colour}">× ${quantity}</td></tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px">${rows}</table>`;
}

export function renderTextItems(items: OrderEmailLine[]): string {
  if (!items.length) return '';
  return `${items.map((item) => {
    const quantity = Number.isFinite(item.quantity) ? Math.max(1, Number(item.quantity)) : 1;
    return `- ${item.name || item.slug}${item.variantLabel ? ` — ${item.variantLabel}` : ''} × ${quantity}`;
  }).join('\n')}\n`;
}
