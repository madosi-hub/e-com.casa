'use client';
import { useEffect, useState } from 'react';
import type { CatalogProduct } from '@/lib/catalog/types';
import { applyCommerce } from '@/lib/catalog/commerce';
/** Expire locally on time; refresh merchant ON/OFF/price changes while a funnel is open. */
export function useLiveProduct(initial: CatalogProduct): CatalogProduct {
  const [live, setLive] = useState<CatalogProduct | null>(null);
  const [expired, setExpired] = useState(false);
  const product = live?.slug === initial.slug ? live : initial;
  useEffect(() => {
    if (!initial.funnelOffer) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const r = await fetch(`/api/products/${encodeURIComponent(initial.slug)}`);
        if (r.ok) { const data = await r.json(); if (!cancelled && data.product) setLive(data.product); }
      } catch { /* Checkout always reprices on the server. */ }
    };
    const id = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [initial.slug, Boolean(initial.funnelOffer)]);
  useEffect(() => {
    const update = () => setExpired(Boolean(product.promoEndsAt && Date.now() >= Date.parse(product.promoEndsAt)));
    update(); const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [product.promoEndsAt]);
  return expired ? applyCommerce(product) : product;
}
