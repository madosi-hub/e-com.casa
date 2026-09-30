import { expect, test } from 'bun:test';
import { parseOrderEmailLines, resolveOrderEmailProfile } from '../src/lib/email/order-profile';
import { renderNuraltaPaymentConfirmed } from '../src/lib/email/templates/nuralta/payment-confirmed';
import { renderNuraltaOrderStatus } from '../src/lib/email/templates/nuralta/order-status';
import { renderStoreOrderStatus } from '../src/lib/email/templates/store/order-status';

test('routes Nuralta offer purchases to the isolated Nuralta email profile', () => {
  const items = parseOrderEmailLines(JSON.stringify([
    { slug: 'nuralta-painel-ripado-decorativo', name: 'Painel Ripado Decorativo Nuralta', quantity: 2, variantLabel: 'Carvalho · 240 × 60 cm' },
    { slug: 'nuralta-kit-instalacao-completo', name: 'Kit de instalação completo', quantity: 1 },
  ]));

  expect(resolveOrderEmailProfile(items)).toBe('nuralta');
});

test('keeps ordinary catalogue purchases on the store email profile', () => {
  const items = parseOrderEmailLines(JSON.stringify([
    { slug: 'odem-painel-ripado-acustico-carvalho', name: 'Painel ODEM', quantity: 1 },
  ]));

  expect(resolveOrderEmailProfile(items)).toBe('store');
});

test('renders a Portuguese Nuralta payment confirmation with the correct tracking contract', () => {
  const message = renderNuraltaPaymentConfirmed({
    orderNumber: 'EC-123456',
    customerEmail: 'buyer@example.test',
    firstName: 'Márcio',
    total: '149.90',
    currency: 'EUR',
    itemsJson: '[]',
    items: [{ slug: 'nuralta-painel-ripado-decorativo', name: 'Painel Nuralta', quantity: 2 }],
    trackingNumber: 'ECC-2609-ABC234',
    originWarehouse: 'zaragoza',
    trackingUrl: 'https://e-com.casa/track?code=ECC-2609-ABC234',
  });

  expect(message.profile).toBe('nuralta');
  expect(message.subject).toContain('Pagamento confirmado');
  expect(message.html).toContain('Nuralta Interiores');
  expect(message.html).toContain('https://e-com.casa/pt/images/LOGO_PRETA.webp');
  expect(message.html).toContain('/track?code=ECC-2609-ABC234');
  expect(message.html).not.toContain('/track?number=');
  expect(message.text).toContain('Painel Nuralta');
});

test('renders every requested Nuralta post-purchase status with the offer identity', () => {
  const statuses = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
  for (const status of statuses) {
    const message = renderNuraltaOrderStatus({
      status,
      orderNumber: 'EC-123456',
      customerEmail: 'buyer@example.test',
      firstName: 'Márcio',
      total: '149.90',
      currency: 'EUR',
      itemsJson: '[]',
      items: [{ slug: 'nuralta-painel-ripado-decorativo', name: 'Painel Nuralta', quantity: 2 }],
      trackingNumber: 'ECC-2609-ABC234',
      originWarehouse: 'zaragoza',
      trackingUrl: 'https://e-com.casa/track?code=ECC-2609-ABC234',
      refundAmount: status === 'REFUNDED' ? '149.90' : null,
    });
    expect(message.profile).toBe('nuralta');
    expect(message.html).toContain('https://e-com.casa/pt/images/LOGO_PRETA.webp');
    expect(message.subject).toContain('EC-123456');
  }
});

test('keeps general-store status templates separate from Nuralta', () => {
  const message = renderStoreOrderStatus({
    status: 'SHIPPED',
    orderNumber: 'EC-STORE',
    customerEmail: 'buyer@example.test',
    firstName: 'Buyer',
    total: '20.00',
    currency: 'EUR',
    itemsJson: '[]',
    items: [{ slug: 'store-product', name: 'Store product', quantity: 1 }],
    trackingNumber: 'ECC-2609-XYZ234',
    trackingUrl: 'https://e-com.casa/track?code=ECC-2609-XYZ234',
  });
  expect(message.profile).toBe('store');
  expect(message.html).not.toContain('LOGO_PRETA.webp');
});
