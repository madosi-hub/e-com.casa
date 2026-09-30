import { COMPANY } from '@/lib/company';
import type { OrderStatusEmailTemplateInput, RenderedOrderEmail } from '../../types';
import { escapeHtml, renderHtmlItems, renderTextItems } from '../shared';

const CONTENT = {
  SHIPPED: { subject: 'Encomenda enviada', title: 'A sua encomenda foi enviada', body: 'A sua encomenda Nuralta saiu do nosso centro de preparação e iniciou o percurso até si.' },
  IN_TRANSIT: { subject: 'Encomenda em trânsito', title: 'A sua encomenda está em trânsito', body: 'A encomenda está a avançar pela rede da transportadora em direção ao destino.' },
  OUT_FOR_DELIVERY: { subject: 'Encomenda saiu para entrega', title: 'A sua encomenda saiu para entrega', body: 'A encomenda está com o distribuidor local e a entrega deverá acontecer em breve.' },
  DELIVERED: { subject: 'Encomenda entregue', title: 'A sua encomenda foi entregue', body: 'A viagem terminou. Esperamos que os seus produtos Nuralta transformem o espaço como imaginou.' },
  CANCELLED: { subject: 'Encomenda cancelada', title: 'A sua encomenda foi cancelada', body: 'Esta encomenda não continuará para preparação ou entrega. Responda a este e-mail se precisar de ajuda.' },
  REFUNDED: { subject: 'Reembolso confirmado', title: 'O seu reembolso foi confirmado', body: 'O valor foi enviado para o método de pagamento original. O banco poderá demorar alguns dias a apresentá-lo.' },
  PARTIALLY_REFUNDED: { subject: 'Reembolso parcial confirmado', title: 'O seu reembolso parcial foi confirmado', body: 'Parte do valor foi enviada para o método de pagamento original. O banco poderá demorar alguns dias a apresentá-la.' },
} as const;

export function renderNuraltaOrderStatus(input: OrderStatusEmailTemplateInput): RenderedOrderEmail {
  const content = CONTENT[input.status];
  const order = escapeHtml(input.orderNumber);
  const tracking = input.trackingNumber ? escapeHtml(input.trackingNumber) : null;
  const refund = input.refundAmount ? escapeHtml(`${input.currency} ${input.refundAmount}`) : null;
  const items = renderHtmlItems(input.items, '#201a17');
  const logoUrl = `${COMPANY.domain}/pt/images/LOGO_PRETA.webp`;
  const action = tracking && input.trackingUrl && !['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(input.status)
    ? `<p style="margin:28px 0"><a href="${input.trackingUrl}" style="display:inline-block;background:#8a5c3f;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px;line-height:20px">Acompanhar encomenda</a></p>`
    : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f3ef;font-family:Arial,Helvetica,sans-serif;color:#201a17"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:32px 16px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff"><tr><td align="center" style="background:#f7f3ef;border-bottom:1px solid #e6ded4;padding:14px 32px"><img src="${logoUrl}" width="170" alt="Nuralta Interiores" style="display:block;width:170px;max-width:100%;height:auto;border:0"><p style="font-size:10px;line-height:16px;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;color:#8a5c3f">Impulsionada pela marca E-com.casa</p></td></tr><tr><td style="padding:32px"><p style="font-size:20px;line-height:28px;margin:0 0 12px">${content.title}</p><p style="font-size:14px;line-height:22px;margin:0 0 24px;color:#665b54">${content.body}</p>${items}<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:10px 0;font-size:13px">Encomenda</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${order}</td></tr>${tracking ? `<tr><td style="padding:10px 0;font-size:13px">Rastreio</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${tracking}</td></tr>` : ''}${refund ? `<tr><td style="padding:10px 0;font-size:13px">Reembolso</td><td align="right" style="padding:10px 0;font-size:13px;font-weight:700">${refund}</td></tr>` : ''}</table>${action}<p style="font-size:13px;line-height:20px;color:#665b54;margin:26px 0 0">Se precisar de ajuda, responda a este e-mail. A equipa E-com.casa acompanha o seu pedido após a compra.</p><p style="font-size:11px;line-height:17px;color:#857a72;margin:28px 0 0">Compra processada pela E-com.casa.<br>${escapeHtml(COMPANY.legalName)} · Company No. ${escapeHtml(COMPANY.companyNumber)}</p></td></tr></table></td></tr></table></body></html>`;
  const text = `${content.title}\n\n${content.body}\n\nEncomenda: ${input.orderNumber}\n${renderTextItems(input.items)}${tracking ? `Rastreio: ${input.trackingNumber}\n` : ''}${refund ? `Reembolso: ${input.currency} ${input.refundAmount}\n` : ''}${action ? `Acompanhar: ${input.trackingUrl}\n` : ''}\nNuralta Interiores · Impulsionada pela marca E-com.casa`;

  return { profile: 'nuralta', fromName: 'Nuralta · E-com.casa', subject: `${content.subject} — ${input.orderNumber}`, html, text };
}
