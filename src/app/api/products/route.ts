import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/catalog';
import { toStorefrontProduct } from '@/lib/catalog/public-product';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const perPage = Math.min(48, parseInt(searchParams.get('perPage') ?? '24', 10) || 24);

    const result = await getProducts({
      category: searchParams.get('category') ?? undefined,
      subcategory: searchParams.get('subcategory') ?? undefined,
      space: searchParams.get('space') ?? undefined,
      style: searchParams.get('style') ?? undefined,
      collection: searchParams.get('collection') ?? undefined,
      material: searchParams.get('material') ?? undefined,
      colour: searchParams.get('colour') ?? undefined,
      availability: searchParams.get('availability') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      minPrice: parseFloat(searchParams.get('minPrice') ?? '') || undefined,
      maxPrice: parseFloat(searchParams.get('maxPrice') ?? '') || undefined,
      sort: (searchParams.get('sort') as 'featured' | undefined) ?? 'featured',
      page,
      perPage,
    });

    return NextResponse.json({
      ...result,
      products: result.products.map(toStorefrontProduct),
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ products: [], total: 0, page: 1, perPage: 24, totalPages: 1 }, { status: 503 });
  }
}
