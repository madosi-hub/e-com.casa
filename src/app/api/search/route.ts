import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, getFeaturedProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();

    if (!q || q === 'all') {
      const products = await getFeaturedProducts(12);
      return NextResponse.json({ products, query: q });
    }

    const { products } = await searchProducts(q, { perPage: 24 });
    return NextResponse.json({ products, query: q });
  } catch (error) {
    console.error('GET /api/search error', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
