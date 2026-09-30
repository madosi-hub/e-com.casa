import { expect, test } from 'bun:test';
import { buildSalesReport, portugalPostalRegion, reportDateRange } from '../src/lib/admin/reports';

test('aggregates paid-order products, ticket and successful refunds', () => {
  const report = buildSalesReport([
    {
      orderNumber: 'EC-1', total: '120.00', currency: 'EUR', country: 'PT', city: 'Lisboa', postalCode: '1000-001', paymentStatus: 'PAID',
      itemsJson: JSON.stringify([{ slug: 'panel', name: 'Painel', quantity: 2, price: '50.00' }, { slug: 'kit', name: 'Kit', quantity: 1, price: '20.00' }]),
      refunds: [],
    },
    {
      orderNumber: 'EC-2', total: '80.00', currency: 'EUR', country: 'PT', city: 'Porto', postalCode: '4000-001', paymentStatus: 'PARTIALLY_REFUNDED',
      itemsJson: JSON.stringify([{ slug: 'panel', name: 'Painel', quantity: 1, price: '80.00' }]),
      refunds: [{ amount: '20.00', currency: 'EUR', status: 'SUCCEEDED' }],
    },
  ]);

  expect(report.orderCount).toBe(2);
  expect(report.grossRevenue).toBe(200);
  expect(report.refundedRevenue).toBe(20);
  expect(report.netRevenue).toBe(180);
  expect(report.averageTicket).toBe(100);
  expect(report.itemsSold).toBe(4);
  expect(report.products[0]).toMatchObject({ slug: 'panel', quantity: 3, revenue: 180 });
  expect(report.portugalRegions.map((region) => region.region)).toEqual(['Lisboa e Vale do Tejo', 'Norte']);
});

test('maps Portuguese postal macro-regions without inferring customer gender', () => {
  expect(portugalPostalRegion('8000-001')).toBe('Algarve');
  expect(portugalPostalRegion('7000-001')).toBe('Alentejo');
  expect(portugalPostalRegion('9500-001')).toBe('Madeira e Açores');
});

test('falls back to a valid default period for inverted dates', () => {
  const range = reportDateRange('2026-09-30', '2026-09-01', new Date('2026-09-29T12:00:00Z'));
  expect(range.from.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  expect(range.to.toISOString()).toBe('2026-09-29T23:59:59.999Z');
});
