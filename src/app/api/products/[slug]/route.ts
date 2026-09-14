import { NextRequest, NextResponse } from 'next/server';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { getProduct } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ product: toStorefrontProduct(product) });
  } catch (error) {
    console.error('GET /api/products/[slug] error', error);
    return NextResponse.json({ error: 'Failed to load product' }, { status: 500 });
  }
}
