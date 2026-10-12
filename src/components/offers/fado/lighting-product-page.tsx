'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Lightbulb, LockKeyhole, Minus, Plus, Truck } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog/types';
import { type LightingPresentation, FADO_KIT_SLUG, WIZ_BULB_SLUG, fadoKitGalleryImages, lightingImage } from '@/lib/catalog/lighting';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import { cartStockLimit, quantityLimit } from '@/lib/catalog/inventory';
import { useFadoCart as useCart } from '@/lib/fado-cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { useLanguage } from '@/lib/language-store';
import { useLiveProduct } from '@/hooks/use-live-product';
import { LightingCollection } from './lighting-collection';
import { LightingGallery } from './lighting-gallery';
import { LightingHeader } from './lighting-header';
import { LightingReviews } from './lighting-reviews';
import styles from './page.module.css';

const money = (cents: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function LightingProductPage({ product: initialProduct, presentation, collectionProducts }: { product: CatalogProduct; presentation: LightingPresentation; collectionProducts: CatalogProduct[] }) {
  const product = useLiveProduct(initialProduct);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const buyButton = useRef<HTMLButtonElement>(null);
  const openCart = useCartDrawer(state => state.open);
  const saleable = isCatalogProductSaleable(product);
  const kit = product.slug === FADO_KIT_SLUG;
  const bulb = product.slug === WIZ_BULB_SLUG || product.slug.startsWith('lexman-e27-');
  const maxQuantity = quantityLimit(product);
  const chosenQuantity = Math.max(1, Math.min(quantity, maxQuantity));
  const subtitle = kit ? 'Candeeiro + lâmpada + comando' : bulb ? product.slug === WIZ_BULB_SLUG ? 'Lâmpada RGB + comando' : 'Lâmpada LED E27' : 'Candeeiro de mesa';
  const photos = kit ? fadoKitGalleryImages : Array.from({ length: presentation.images }, (_, index) => ({
    src: lightingImage(product.slug, index),
    alt: `${presentation.brand} ${presentation.name}, fotografia ${index + 1}`,
    kind: product.slug === WIZ_BULB_SLUG && index === 0 ? 'presentation' : index === 0 ? 'product' : 'scene',
  }));
  const fado = collectionProducts.find(item => item.slug === 'ikea-fado-candeeiro-mesa-branco');
  const wiz = collectionProducts.find(item => item.slug === WIZ_BULB_SLUG);
  const separatePrice = fado && wiz ? fado.priceCents + wiz.priceCents : null;
  const savings = separatePrice !== null ? Math.max(0, separatePrice - product.priceCents) : 0;
  const savingsText = separatePrice === null ? null : savings > 0 ? `Poupa ${money(savings)} face às peças à parte` : separatePrice === product.priceCents ? 'Mesmo preço das peças à parte' : `Peças à parte: ${money(separatePrice)}`;

  useEffect(() => {
    const target = buyButton.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function addToCart() {
    if (!saleable) return;
    useLanguage.getState().setLang('pt');
    useCart.getState().add({ slug: product.slug, name: product.name, subtitle: product.subtitle, image: product.image, price: product.price, brand: product.brand, categorySlug: product.categorySlug, maxStock: cartStockLimit(product), automaticDiscountPct: product.promoDiscountPct, promoEndsAt: product.promoEndsAt }, chosenQuantity);
    openCart();
  }

  return <div lang="pt-PT" id="top" className={`${styles.page} ${styles.adLanding}`}>
    <LightingHeader />

    <section id="comprar" className={styles.productSection} aria-labelledby="lighting-product-title">
      <p className={styles.breadcrumb}><Link href="/offers/fado#mais-luz">Iluminação</Link><span>/</span><span>{presentation.name}</span></p>
      <div className={styles.productGrid}>
        <LightingGallery photos={photos} activeImage={activeImage} onImageChange={setActiveImage} name={presentation.name} />
        <div className={styles.buyBox}>
          <div className={styles.productTitle}><div><h1 id="lighting-product-title">{presentation.name}</h1><p className={styles.quickSubtitle}>{subtitle}</p></div></div>
          <fieldset className={`${styles.bundleOptions} ${styles.singleOption}`}>
            <legend>O que recebe · IVA incluído</legend>
            <div className={styles.purchaseCard}><span><strong>{kit ? 'Kit completo' : bulb ? 'Lâmpada' : 'Candeeiro'}</strong><small>{kit ? 'FADO + WiZ RGB + comando' : product.slug === WIZ_BULB_SLUG ? 'WiZ A60 RGB · comando incluído' : presentation.subtitle}</small></span><b>{money(product.priceCents)}</b>{kit && savingsText && <small className={styles.bundleSavings}>{savingsText}</small>}</div>
          </fieldset>
          <p role="status" className={styles.stock}><span data-available={saleable} />{saleable ? 'Em stock · Disponível para encomendar' : 'Temporariamente indisponível'}</p>
          <div className={styles.purchaseRow}>
            <div className={styles.quantity} role="group" aria-label="Quantidade">
              <button type="button" disabled={!saleable || chosenQuantity <= 1} onClick={() => setQuantity(Math.max(1, chosenQuantity - 1))} aria-label="Diminuir quantidade"><Minus size={14} /></button><span aria-live="polite">{chosenQuantity}</span><button type="button" disabled={!saleable || chosenQuantity >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, chosenQuantity + 1))} aria-label="Aumentar quantidade"><Plus size={14} /></button>
            </div>
            <button ref={buyButton} type="button" onClick={addToCart} disabled={!saleable} className={styles.addButton}>{saleable ? 'Adicionar ao carrinho' : 'Indisponível'}<ArrowRight size={18} strokeWidth={1.5} /></button>
          </div>
          <p className={styles.bulbNote}><Lightbulb size={15} strokeWidth={1.5} />{kit || product.slug === WIZ_BULB_SLUG ? '16 milhões de cores · Wi-Fi sem hub · comando incluído.' : presentation.features[0]}</p>
          <div className={styles.serviceNotes}><span><Truck size={17} strokeWidth={1.5} />CTT Express · Portugal</span><span><LockKeyhole size={16} strokeWidth={1.5} />Pagamento seguro</span></div>
        </div>
      </div>
    </section>

    <nav className={styles.sectionNav} aria-label="Explore o produto"><a href="#comprar" className={styles.navProduct}>{presentation.name}</a><div><a href="#apresentacao">O produto</a><a href="#detalhes">Detalhes</a><a href="#avaliacoes">Avaliações</a><a href="#mais-luz">Mais luz</a></div><a href="#comprar" className={styles.navPrice}>{money(product.priceCents)} <ArrowRight size={15} /></a></nav>

    <section id="apresentacao" className={styles.lightingStory}>
      <div><p className={styles.eyebrow}>{presentation.brand} · Iluminação</p><h2 className={styles.lightingHeadline}>{presentation.headline}</h2><p>{presentation.description}</p></div>
      <div className={styles.lightingStoryImage}><Image src={lightingImage(product.slug, presentation.images > 1 ? 1 : 0)} alt={`${presentation.name} em detalhe`} fill sizes="(max-width: 760px) 100vw, 50vw" className={kit || bulb ? styles.presentationImage : styles.lifestyleImage} /></div>
    </section>

    <section id="detalhes" className={styles.essentialSection} aria-labelledby="lighting-details-title">
      <h2 id="lighting-details-title">O essencial</h2>
      <ul className={styles.essentialFeatures}>{presentation.features.slice(0, 3).map(feature => <li key={feature}>{feature}</li>)}</ul>
      <details className={styles.technicalDetails}>
        <summary>Ver detalhes<Plus size={17} strokeWidth={1.5} /></summary>
        {presentation.features.length > 3 && <ul className={styles.essentialFeatures}>{presentation.features.slice(3).map(feature => <li key={feature}>{feature}</li>)}</ul>}
        <dl className={styles.essentialFacts}><div><dt>Marca</dt><dd>{presentation.brand}</dd></div><div><dt>Incluído</dt><dd>{kit ? 'Candeeiro, lâmpada e comando' : product.slug === WIZ_BULB_SLUG ? 'Lâmpada e comando' : '1 unidade'}</dd></div></dl>
      </details>
    </section>

    <LightingReviews slug={product.slug} />
    <LightingCollection exclude={product.slug} products={collectionProducts} />
    <section className={styles.finalSection} aria-labelledby="lighting-final-title"><div className={styles.finalImage}><Image src={photos[0].src} alt={photos[0].alt} fill sizes="(max-width: 760px) 100vw, 50vw" className={styles.presentationImage} /></div><div className={styles.finalCopy}><p className={styles.eyebrow}>{presentation.brand}</p><h2 id="lighting-final-title">A sua próxima<br /><em>luz.</em></h2><a href="#comprar" className={styles.finalButton}>{presentation.name} · {money(product.priceCents)}<ArrowRight size={20} /></a>{product.slug === WIZ_BULB_SLUG && <Link href={`/product/${FADO_KIT_SLUG}`} className={styles.kitTextLink}>Ver o kit com FADO<ArrowRight size={16} /></Link>}{kit && <Link href="/offers/fado" className={styles.kitTextLink}>Ver o candeeiro FADO<ArrowRight size={16} /></Link>}</div></section>
    <footer className={styles.footer}><div className={styles.footerTop}><div><Link href="/" className={styles.footerBrand}>E-com.casa</Link><p>Objetos para fazer da casa o seu lugar.</p></div><nav aria-label="Informações da loja"><Link href="/offers/fado">FADO</Link><Link href="/shipping">Envios</Link><Link href="/returns">Devoluções</Link><Link href="/legal/terms">Termos</Link><Link href="/legal/privacy">Privacidade</Link><Link href="/contact">Contactos</Link></nav></div></footer>
    {showSticky && saleable && <div className={styles.mobilePurchase}><div><span>{presentation.name}</span><strong>{money(product.priceCents)}</strong></div><button type="button" onClick={addToCart}>Adicionar{chosenQuantity > 1 ? ` (${chosenQuantity})` : ''}<ArrowRight size={18} /></button></div>}
  </div>;
}
