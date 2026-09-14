import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/catalog';
import type { CatalogCategory } from '@/lib/catalog/types';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set<CatalogCategory['type']>(['shop', 'space', 'style', 'collection']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedType = url.searchParams.get('type') as CatalogCategory['type'] | null;
  const type = requestedType && ALLOWED_TYPES.has(requestedType) ? requestedType : undefined;
  const categories = await getCategories(type);

  return NextResponse.json(
    { categories },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
