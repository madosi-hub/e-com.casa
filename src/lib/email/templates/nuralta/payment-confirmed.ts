import { COMPANY } from '@/lib/company';
import type { OrderEmailTemplateInput, RenderedOrderEmail } from '../../types';
import { escapeHtml, renderHtmlItems, renderTextItems } from '../shared';

export function renderNuraltaPaymentConfirmed(input: OrderEmailTemplateInput): RenderedOrderEmail {
  const name = escapeHtml(input.firstName || 'Cliente');
  const order = escapeHtml(input.orderNumber);
  const total = escapeHtml(`${input.currency} ${input.total}`);
  const tracking = input.trackingNumber ? escapeHtml(input.trackingNumber) : null;
  const items = renderHtmlItems(input.items, '#201a17');
  const logoUrl = `${COMPANY.domain}/pt/images/LOGO_PRETA.webp`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f3ef;font-family:Arial,Helvetica,sans-serif;color:#201a17"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td align="center" style="background:#f7f3ef;border-bottom:1px solid #e6ded4;padding:14px 32px"><img src="${logoUrl}" width="170" alt="Nuralta Interiores" style="display:block;width:170px;max-width:100%;height:auto;border:0"><p style="font-size:10px;line-height:16px;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;color:#8a5c3f">Impulsionada pela marca E-com.casa</p></td></tr><tr><td style="padding:32px"><p style="font-size:20px;line-height:28px;margin:0 0 12px">Obrigado, ${name}.</p><p style="font-size:14px;line-height:22px;margin:0 0 24px;color:#665b54">O pagamento foi confirmado e a sua encomenda Nuralta está agora a ser preparada.</p>${items}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Encomenda</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${order}</td></tr><tr><td style="padding:10px 0;font-size:13px;line-height:20px">Total</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${total}</td></tr>${tracking ? `<tr><td style="padding:10px 0;font-size:13px;line-height:20px">Rastreio</td><td align="right" style="padding:10px 0;font-size:13px;line-height:20px;font-weight:700">${tracking}</td></tr>` : ''}</table>${tracking && input.trackingUrl ? `<p style="margin:28px 0"><a href="${input.trackingUrl}" style="display:inline-block;background:#8a5c3f;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;line-height:20px">Acompanhar encomenda</a></p>` : ''}<p style="font-size:13px;line-height:20px;color:#665b54;margin:26px 0 0">Se precisar de ajuda, responda a este e-mail. A equipa E-com.casa acompanha o seu pedido após a compra.</p><p style="font-size:11px;line-height:17px;color:#857a72;margin:28px 0 0">Compra processada pela E-com.casa.<br>${escapeHtml(COMPANY.legalName)} · Company No. ${escapeHtml(COMPANY.companyNumber)}<br>${escapeHtml(COMPANY.registeredOffice.line1)}, ${escapeHtml(COMPANY.registeredOffice.line2)}, London ${escapeHtml(COMPANY.registeredOffice.postcode)}, United Kingdom</p></td></tr></table></td></tr></table></body></html>`;
  const text = `Obrigado, ${input.firstName}.\n\nO pagamento foi confirmado e a sua encomenda Nuralta está agora a ser preparada.\n\nEncomenda: ${input.orderNumber}\n${renderTextItems(input.items)}Total: ${input.currency} ${input.total}\n${tracking && input.trackingUrl ? `Rastreio: ${input.trackingNumber}\nAcompanhar: ${input.trackingUrl}\n` : ''}\nNuralta Interiores · Impulsionada pela marca E-com.casa\nCompra processada pela E-com.casa.\n${COMPANY.legalName} · Company No. ${COMPANY.companyNumber}`;

  return {
    profile: 'nuralta',
    fromName: 'Nuralta · E-com.casa',
    subject: `Pagamento confirmado — encomenda ${input.orderNumber}`,
    html,
    text,
  };
}
