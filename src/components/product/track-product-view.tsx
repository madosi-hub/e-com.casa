'use client';

import { useEffect } from 'react';
import { useRecentlyViewed } from '@/lib/recently-viewed-store';

/** Records a product view once per mount. Render inside product pages. */
export function TrackProductView({ slug }: { slug: string }) {
  const track = useRecentlyViewed((s) => s.track);
  const hydrated = useRecentlyViewed((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) track(slug);
  }, [hydrated, slug, track]);

  return null;
}
