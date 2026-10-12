'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useFadoCart } from '@/lib/fado-cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { FADO_KIT_SLUG, WIZ_BULB_SLUG } from '@/lib/catalog/lighting';
import type { CatalogProduct } from '@/lib/catalog/types';
import { cartStockLimit } from '@/lib/catalog/inventory';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { FADO_OFFER_ALIAS, dedicatedOfferPath, fadoOfferSlugFromPathname } from '@/lib/offers/route-policy';
import { offerTrackingParameters, withOfferAttribution } from '@/lib/offers/attribution';
import { trackOfferEvent } from '@/lib/offers/analytics';
import { buildPanelCheckoutPayload, PANEL_CHECKOUT_COUNTRY } from '@/lib/offers/panel-checkout-payload';
import { acquirePreparedOfferPayment, resetPreparedOfferPayment } from '@/lib/payments/offer-payment-preparation';
import { shippingPrice } from '@/lib/shipping';
import styles from './cart-drawer.module.css';

const FADO_PRODUCT = 'ikea-fado-candeeiro-mesa-branco';
const suggestions = [WIZ_BULB_SLUG, 'lexman-e27-2700k', 'lexman-e27-4000k', 'lexman-e27-6500k'];
const money = (cents: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function FadoCartDrawer() {
  const pathname = usePathname();
  const offerSlug = fadoOfferSlugFromPathname(pathname) ?? FADO_OFFER_ALIAS;
  const offerPath = dedicatedOfferPath(offerSlug);
  const isOpen = useCartDrawer(state => state.isOpen);
  const close = useCartDrawer(state => state.close);
  const cart = useFadoCart();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const lines = cart.hydrated ? cart.lines : [];
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + Math.round(Number(line.price) * 100) * line.quantity, 0);
  const shipping = shippingPrice('PT', subtotal / 100);
  const standalone = lines.find(line => line.slug === FADO_PRODUCT);
  const kit = products.find(product => product.slug === FADO_KIT_SLUG && isCatalogProductSaleable(product));
  const needsBulb = Boolean(standalone && !lines.some(line => line.slug === FADO_KIT_SLUG || suggestions.includes(line.slug)));
  const recommended = products.filter(product => suggestions.includes(product.slug) && isCatalogProductSaleable(product));

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('carrinho') === 'aberto') useCartDrawer.getState().open();
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    void Promise.all([...suggestions, FADO_KIT_SLUG].map(async slug => {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(slug)}`, { signal: controller.signal });
        if (!response.ok) return null;
        const data = await response.json();
        return (data.product ?? null) as CatalogProduct | null;
      } catch { return null; }
    })).then(items => { if (!controller.signal.aborted) setProducts(items.filter((item): item is CatalogProduct => item !== null)); });
    return () => controller.abort();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !cart.hydrated || !cart.lines.length || pathname.includes('/checkout')) return;
    const timer = window.setTimeout(() => {
      const payload = buildPanelCheckoutPayload(cart.lines, cart.promoCode, PANEL_CHECKOUT_COUNTRY, offerTrackingParameters(offerSlug));
      void acquirePreparedOfferPayment(payload).catch(() => undefined);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isOpen, cart.hydrated, cart.lines, cart.promoCode, offerSlug, pathname]);

  function addProduct(product: CatalogProduct, quantity = 1) {
    cart.add({ slug: product.slug, name: product.name, subtitle: product.subtitle, brand: product.brand, categorySlug: product.categorySlug, price: product.price, image: product.image, maxStock: cartStockLimit(product), automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt }, quantity);
    trackOfferEvent('add_to_cart', { offerSlug, productSlug: product.slug, quantity, value: product.priceCents * quantity / 100, currency: 'EUR', source: 'fado_cart' });
  }

  return <Sheet open={isOpen} onOpenChange={open => open ? useCartDrawer.getState().open() : close()}>
    <SheetContent side="right" className={styles.drawer}>
      <SheetHeader className={styles.heading}><SheetTitle>O seu carrinho{count > 0 && <span> · {count} {count === 1 ? 'artigo' : 'artigos'}</span>}</SheetTitle><SheetDescription>Reveja a sua iluminação antes de continuar.</SheetDescription></SheetHeader>
      {!cart.hydrated ? <p className={styles.empty} role="status">A carregar o carrinho…</p> : !lines.length ? <div className={styles.empty}><ShoppingBag size={36} strokeWidth={1.3} /><h2>O seu carrinho está vazio</h2><Link href={offerPath} onClick={close} className={styles.checkout}>Escolher iluminação<ArrowRight size={18} /></Link></div> : <>
        <div className={styles.scroll}>
          <ul className={styles.items}>{lines.map(line => {
            const key = `${line.slug}|${line.variantId ?? ''}`;
            const productPath = line.slug === FADO_PRODUCT ? offerPath : `/product/${line.slug}`;
            return <li key={key} className={styles.item}>
              <Link href={productPath} onClick={close} className={styles.photo}><Image src={line.image} alt={line.name} fill sizes="88px" className={styles.productImage} /></Link>
              <div className={styles.itemCopy}><Link href={productPath} onClick={close}>{line.name}</Link>{line.subtitle && <p>{line.subtitle}</p>}<strong>{money(Math.round(Number(line.price) * 100) * line.quantity)}</strong>
                <div className={styles.actions}><div className={styles.quantity}><button type="button" aria-label={`Diminuir quantidade de ${line.name}`} onClick={() => { cart.setQty(key, line.quantity - 1); if (cart.lines.length === 1 && line.quantity === 1) resetPreparedOfferPayment(); }}><Minus size={15} /></button><span aria-live="polite">{line.quantity}</span><button type="button" aria-label={`Aumentar quantidade de ${line.name}`} disabled={line.quantity >= (line.maxStock ?? Number.MAX_SAFE_INTEGER)} onClick={() => cart.setQty(key, line.quantity + 1)}><Plus size={15} /></button></div><button type="button" className={styles.remove} aria-label={`Remover ${line.name}`} onClick={() => { cart.remove(key); if (cart.lines.length === 1) resetPreparedOfferPayment(); }}><Trash2 size={17} /></button></div>
              </div>
            </li>;
          })}</ul>
          {needsBulb && kit && standalone && standalone.quantity <= (cartStockLimit(kit) ?? Infinity) && <button type="button" className={styles.upgrade} onClick={() => { addProduct(kit, standalone.quantity); cart.remove(`${standalone.slug}|${standalone.variantId ?? ''}`); }}><span><strong>Prefere o kit completo?</strong><small>FADO + WiZ RGB + comando · {money(kit.priceCents)} por kit</small></span><ArrowRight size={19} /></button>}
          {needsBulb && recommended.length > 0 && <section className={styles.extras}><h2>Junte uma lâmpada</h2><p>O candeeiro sozinho vem sem lâmpada.</p><div className={styles.suggestions}>{recommended.map(product => <article key={product.slug}><Link href={`/product/${product.slug}`} onClick={close} className={styles.suggestionPhoto}><Image src={product.image} alt={product.name} fill sizes="140px" className={styles.productImage} /></Link><h3>{product.name}</h3><strong>{money(product.priceCents)}</strong><button type="button" onClick={() => addProduct(product)}>Adicionar<Plus size={15} /></button></article>)}</div></section>}
        </div>
        <div className={styles.summary}><dl><div><dt>Subtotal · IVA incluído</dt><dd>{money(subtotal)}</dd></div><div><dt><Truck size={16} />CTT Express · Portugal</dt><dd>{shipping === 0 ? 'Grátis' : money(Math.round(shipping * 100))}</dd></div></dl><Link href={withOfferAttribution(dedicatedOfferPath(offerSlug, '/checkout'), offerSlug)} className={styles.checkout} onClick={() => { trackOfferEvent('begin_checkout', { offerSlug, quantity: count, value: subtotal / 100, currency: 'EUR', source: 'fado_cart' }); close(); }}><span><LockKeyhole size={17} />Continuar para o pagamento</span><ArrowRight size={19} /></Link><p>Dados de entrega e pagamento no próximo passo.</p></div>
      </>}
    </SheetContent>
  </Sheet>;
}
