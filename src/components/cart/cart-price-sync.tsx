'use client';
import { applyBundleOffer } from '@/lib/catalog/bundle';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart-store';
import type { CatalogProduct } from '@/lib/catalog/types';
import { cartStockLimit } from '@/lib/catalog/inventory';
/** Refresh stale persisted carts; never send the browser's price to payment as authority. */
export function CartPriceSync() {
  const key = useCart(s => s.lines.map(l => `${l.slug}|${l.variantId ?? ''}`).join(','));
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const slugs = [...new Set(useCart.getState().lines.map(l => l.slug))];
      const products = new Map<string, CatalogProduct>();
      await Promise.all(slugs.map(async slug => {
        try { const r = await fetch(`/api/products/${encodeURIComponent(slug)}`); if (r.ok) products.set(slug, (await r.json()).product); } catch { /* Server repricing remains authoritative on connection loss. */ }
      }));
      if (cancelled) return;
      useCart.setState(state => ({ lines: state.lines.map(line => {
        const raw = products.get(line.slug); if (!raw) return line;
        const p = applyBundleOffer(raw, [...products.values()]);
        const v = p.variants.find(v => v.id === line.variantId);
        return { ...line, brand: p.brand, categorySlug: p.categorySlug, price: ((p.priceCents + (v?.priceDeltaCents ?? 0)) / 100).toFixed(2), regularUnitPrice: (((p.regularPriceCents ?? p.priceCents) + (v?.regularPriceDeltaCents ?? v?.priceDeltaCents ?? 0)) / 100).toFixed(2), promoEndsAt: p.promoEndsAt, automaticDiscountPct: p.promoDiscountPct, maxStock: cartStockLimit(p) };
      }) }));
    };
    void refresh(); const id = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [key]);
  useEffect(() => {
    const id = setInterval(() => {
      const lines = useCart.getState().lines;
      if (lines.some(l => l.promoEndsAt && Date.parse(l.promoEndsAt) <= Date.now())) useCart.setState({ lines: lines.map(l => l.promoEndsAt && Date.parse(l.promoEndsAt) <= Date.now() && l.regularUnitPrice ? { ...l, price: l.regularUnitPrice, promoEndsAt: null, automaticDiscountPct: null } : l) });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
