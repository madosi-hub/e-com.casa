export interface ReportRefund {
  amount: string;
  currency: string;
  status: string;
}

export interface ReportOrder {
  orderNumber: string;
  total: string;
  currency: string;
  country: string;
  city: string;
  postalCode: string;
  itemsJson: string;
  paymentStatus: string;
  refunds: ReportRefund[];
}

interface ProductTotal {
  slug: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface RegionTotal {
  region: string;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  orderCount: number;
  grossRevenue: number;
  refundedRevenue: number;
  netRevenue: number;
  averageTicket: number;
  itemsSold: number;
  nonEurOrders: number;
  products: ProductTotal[];
  portugalRegions: RegionTotal[];
}

type ParsedLine = {
  slug?: unknown;
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
};

function amount(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function orderLines(itemsJson: string): ParsedLine[] {
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((line): line is ParsedLine => Boolean(line) && typeof line === 'object') : [];
  } catch {
    return [];
  }
}

/**
 * Approximate macro-region derived from the first Portuguese postal-code digit.
 * The order schema stores no district/NUTS code, so this must not be presented
 * as an official administrative classification.
 */
export function portugalPostalRegion(postalCode: string): string {
  const digit = postalCode.trim().match(/^\d/)?.[0];
  if (digit === '1' || digit === '2') return 'Lisboa e Vale do Tejo';
  if (digit === '3' || digit === '6') return 'Centro';
  if (digit === '4' || digit === '5') return 'Norte';
  if (digit === '7') return 'Alentejo';
  if (digit === '8') return 'Algarve';
  if (digit === '9') return 'Madeira e Açores';
  return 'Zona postal não identificada';
}

export function buildSalesReport(orders: ReportOrder[]): SalesReport {
  const eurOrders = orders.filter((order) => order.currency.toUpperCase() === 'EUR');
  const grossRevenue = eurOrders.reduce((sum, order) => sum + amount(order.total), 0);
  const refundedRevenue = eurOrders.reduce((sum, order) => sum + order.refunds
    .filter((refund) => refund.status === 'SUCCEEDED' && refund.currency.toUpperCase() === 'EUR')
    .reduce((refundSum, refund) => refundSum + amount(refund.amount), 0), 0);

  const products = new Map<string, ProductTotal>();
  let itemsSold = 0;
  for (const order of orders) {
    for (const line of orderLines(order.itemsJson)) {
      if (typeof line.slug !== 'string' || !line.slug) continue;
      const quantity = typeof line.quantity === 'number' && Number.isFinite(line.quantity)
        ? Math.max(0, line.quantity)
        : 0;
      const linePrice = typeof line.price === 'string' ? amount(line.price) : 0;
      const current = products.get(line.slug) ?? {
        slug: line.slug,
        name: typeof line.name === 'string' && line.name ? line.name : line.slug,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += quantity;
      if (order.currency.toUpperCase() === 'EUR') current.revenue += linePrice * quantity;
      products.set(line.slug, current);
      itemsSold += quantity;
    }
  }

  const regions = new Map<string, RegionTotal>();
  for (const order of eurOrders.filter((candidate) => candidate.country.toUpperCase() === 'PT')) {
    const region = portugalPostalRegion(order.postalCode);
    const current = regions.get(region) ?? { region, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += amount(order.total);
    regions.set(region, current);
  }

  return {
    orderCount: orders.length,
    grossRevenue,
    refundedRevenue,
    netRevenue: grossRevenue - refundedRevenue,
    averageTicket: eurOrders.length ? grossRevenue / eurOrders.length : 0,
    itemsSold,
    nonEurOrders: orders.length - eurOrders.length,
    products: [...products.values()].sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue),
    portugalRegions: [...regions.values()].sort((left, right) => right.orders - left.orders || right.revenue - left.revenue),
  };
}

export function reportDateRange(fromValue?: string, toValue?: string, now = new Date()) {
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const from = fromValue && validDate.test(fromValue) ? new Date(`${fromValue}T00:00:00.000Z`) : defaultFrom;
  const to = toValue && validDate.test(toValue) ? new Date(`${toValue}T23:59:59.999Z`) : defaultTo;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return { from: defaultFrom, to: defaultTo };
  }
  return { from, to };
}

export function dateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}
