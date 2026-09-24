import { NextRequest } from 'next/server';
import { GET as lookupOrder } from '../route';

export const dynamic = 'force-dynamic';

// Share the authenticated, paid-order lookup with the query-string endpoint.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const url = new URL(req.url);
  url.searchParams.set('order', orderNumber);
  return lookupOrder(new NextRequest(url, { headers: req.headers }));
}
