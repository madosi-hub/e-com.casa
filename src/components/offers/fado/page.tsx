'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Lightbulb, LockKeyhole, Minus, Plus, Truck } from 'lucide-react';
import { useLiveProduct } from '@/hooks/use-live-product';
import { useFadoCart as useCart } from '@/lib/fado-cart-store';
import { useCartDrawer } from '@/lib/cart-drawer-store';
import { useLanguage } from '@/lib/language-store';
import { cartStockLimit, quantityLimit } from '@/lib/catalog/inventory';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import type { CatalogProduct } from '@/lib/catalog/types';
import { captureOfferAttribution } from '@/lib/offers/attribution';
import { trackOfferEvent } from '@/lib/offers/analytics';
import type { OfferConfig, OfferMarketContext } from '@/lib/offers/types';
import { COMPANY } from '@/lib/company';
import { FADO_KIT_SLUG, WIZ_BULB_SLUG, fadoGalleryImages, fadoKitGalleryImages, lightingImage } from '@/lib/catalog/lighting';
import { LightingCollection } from './lighting-collection';
import { LightingGallery } from './lighting-gallery';
import { LightingHeader } from './lighting-header';
import { LightingReviews } from './lighting-reviews';
import styles from './page.module.css';

const details = [
  ['Comprimento do cabo', '1,8 m'], ['Potência máxima', '75 W'],
  ['Base', 'Polipropileno'],
  ['Referência IKEA', '800.963.72'],
];
const money = (cents: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function FadoOfferPage({ product: initialProduct, offer, market, accessories = [] }: { product: CatalogProduct; offer: OfferConfig; market: OfferMarketContext; accessories?: CatalogProduct[] }) {
  const product = useLiveProduct(initialProduct);
  const kit = useLiveProduct(accessories.find(item => item.slug === FADO_KIT_SLUG) ?? initialProduct);
  const [selectedKit, setSelectedKit] = useState(false);
  const [comparison, setComparison] = useState(50);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const buyButton = useRef<HTMLButtonElement>(null);
  const add = useCart((state) => state.add);
  const openCart = useCartDrawer((state) => state.open);
  const galleryImages = selectedKit ? fadoKitGalleryImages : fadoGalleryImages;
  const bulbPrice = accessories.find(item => item.slug === WIZ_BULB_SLUG)?.priceCents ?? 900;
  const separatePrice = product.priceCents + bulbPrice;
  const kitSavings = Math.max(0, separatePrice - kit.priceCents);
  const savingsText = kitSavings > 0 ? `Poupa ${money(kitSavings)} face às peças à parte` : kit.priceCents === separatePrice ? 'Mesmo preço das peças à parte' : `Peças à parte: ${money(separatePrice)}`;
  const purchaseProduct = selectedKit ? kit : product;
  const saleable = (!selectedKit || kit.slug === FADO_KIT_SLUG) && isCatalogProductSaleable(purchaseProduct);
  const maxQuantity = quantityLimit(purchaseProduct);
  const chosenQuantity = Math.max(1, Math.min(quantity, maxQuantity));

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = market.locale;
    captureOfferAttribution(offer.slug);
    trackOfferEvent('offer_view', { offerSlug: offer.slug, productSlug: product.slug, country: market.countryCode, locale: market.locale });
    trackOfferEvent('product_view', { offerSlug: offer.slug, productSlug: product.slug, country: market.countryCode });
    return () => { document.documentElement.lang = previousLanguage; };
  }, [market.countryCode, market.locale, offer.slug, product.slug]);

  useEffect(() => {
    const target = buyButton.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function changeQuantity(next: number) {
    const value = Math.max(1, Math.min(maxQuantity, next));
    setQuantity(value);
    trackOfferEvent('quantity_changed', { offerSlug: offer.slug, productSlug: product.slug, quantity: value });
  }

  function addToCart() {
    if (!saleable) return;
    useLanguage.getState().setLang('pt');
    add({ slug: purchaseProduct.slug, name: purchaseProduct.name, subtitle: purchaseProduct.subtitle, brand: purchaseProduct.brand, categorySlug: purchaseProduct.categorySlug, price: purchaseProduct.price, image: purchaseProduct.image, maxStock: cartStockLimit(purchaseProduct), automaticDiscountPct: purchaseProduct.promoDiscountPct, promoEndsAt: purchaseProduct.promoEndsAt }, chosenQuantity);
    trackOfferEvent('add_to_cart', { offerSlug: offer.slug, productSlug: purchaseProduct.slug, quantity: chosenQuantity, value: purchaseProduct.priceCents * chosenQuantity / 100, currency: 'EUR' });
    openCart();
  }

  function chooseBundle(withBulb: boolean) {
    setSelectedKit(withBulb);
    setQuantity(1);
    setActiveImage(0);
  }

  return <div lang="pt-PT" id="top" className={`${styles.page} ${styles.adLanding}`}>
    <LightingHeader />

    <section id="comprar" className={styles.productSection} aria-labelledby="fado-title">
      <p className={styles.breadcrumb}><Link href="/offers">Ofertas</Link><span>/</span><span>Iluminação</span><span>/</span><span>FADO</span></p>
      <div className={styles.productGrid}>
        <LightingGallery photos={galleryImages} activeImage={activeImage} onImageChange={setActiveImage} name="FADO" />

        <div className={styles.buyBox}>
          <p className={styles.eyebrow}>IKEA · Candeeiro de mesa</p>
          <div className={styles.productTitle}>
            <div><h1 id="fado-title">FADO</h1><p className={styles.quickSubtitle}>Candeeiro de mesa</p></div>
          </div>
          <h2 className={styles.productHeadline}>Uma pequena luz.<br /><em>Uma grande diferença.</em></h2>
          <p className={styles.productDescription}>Vidro branco, uma forma redonda e luz suave. O essencial para fazer de qualquer canto o seu lugar favorito.</p>
          {kit.slug === FADO_KIT_SLUG && <fieldset className={styles.bundleOptions}><legend>Escolha o que recebe · IVA incluído</legend><label><input type="radio" name="fado-bundle" checked={!selectedKit} onChange={() => chooseBundle(false)} /><span><strong>Só o candeeiro</strong><small>Branco · sem lâmpada</small></span><b>{money(product.priceCents)}</b></label><label><input type="radio" name="fado-bundle" checked={selectedKit} onChange={() => chooseBundle(true)} /><span><strong>Kit FADO + WiZ RGB</strong><small>Lâmpada + comando incluídos</small></span><b>{money(kit.priceCents)}</b><small className={styles.bundleSavings}>{savingsText}</small></label></fieldset>}
          <p role="status" className={styles.stock}><span data-available={saleable} />{saleable ? 'Em stock · Disponível para encomendar' : selectedKit ? 'Kit · disponibilidade WiZ por confirmar' : 'Temporariamente indisponível'}</p>
          <div className={styles.purchaseRow}>
            <div className={styles.quantity} role="group" aria-label="Quantidade">
              <button type="button" onClick={() => changeQuantity(chosenQuantity - 1)} disabled={chosenQuantity <= 1 || !saleable} aria-label="Diminuir quantidade"><Minus size={14} /></button><span aria-live="polite">{chosenQuantity}</span><button type="button" onClick={() => changeQuantity(chosenQuantity + 1)} disabled={chosenQuantity >= maxQuantity || !saleable} aria-label="Aumentar quantidade"><Plus size={14} /></button>
            </div>
            <button ref={buyButton} type="button" onClick={addToCart} disabled={!saleable} className={styles.addButton}>{saleable ? 'Adicionar ao carrinho' : selectedKit ? 'Disponibilidade por confirmar' : 'Indisponível'}<ArrowRight size={18} strokeWidth={1.5} /></button>
          </div>
          <p className={styles.bulbNote}><Lightbulb size={15} strokeWidth={1.5} />{selectedKit ? '16 milhões de cores · Wi-Fi sem hub · comando incluído.' : 'Para ter as cores das imagens, escolha o kit com WiZ.'}</p>
          <div className={styles.serviceNotes}><span><Truck size={17} strokeWidth={1.5} />CTT Express · Portugal</span><span><LockKeyhole size={16} strokeWidth={1.5} />Pagamento seguro</span></div>
          <p className={styles.checkoutNote}>Portes e opções de entrega no checkout.</p>
          <a href="#ambiente" className={styles.discoverLink}>Veja o FADO em casa <ArrowDown size={15} /></a>
        </div>
      </div>
    </section>

    <nav className={styles.sectionNav} aria-label="Explore o FADO"><a href="#comprar" className={styles.navProduct}>FADO <span>por IKEA</span></a><div><a href="#ambiente">Ligado / apagado</a><a href="#kit">O kit</a><a href="#mais-luz">Mais luz</a><a href="#detalhes">Detalhes</a><a href="#avaliacoes">Avaliações</a></div><a href="#comprar" className={styles.navPrice}>{money(product.priceCents)} <ArrowRight size={15} strokeWidth={1.5} className={styles.diagonalArrow} /></a></nav>

    <section id="ambiente" className={styles.comparisonSection} aria-labelledby="ambience-title">
      <p className={styles.eyebrow}>À noite, a diferença sente-se.</p><h2 id="ambience-title">De um canto apagado<br /><em>ao seu ambiente favorito.</em></h2>
      <div className={styles.comparisonFrame}>
        <Image src="/images/offers/fado/real-bedroom-off-v2.webp" alt="Simulação do quarto ao anoitecer com o FADO apagado" fill sizes="(max-width: 760px) 100vw, 800px" className={styles.lifestyleImage} />
        <Image src="/images/offers/fado/real-bedroom-v2.webp" alt="Simulação do mesmo quarto com luz lavanda suave do FADO" fill sizes="(max-width: 760px) 100vw, 800px" className={styles.lifestyleImage} style={{ clipPath: `inset(0 0 0 ${comparison}%)` }} />
        <span className={styles.comparisonOff}>Apagado</span><span className={styles.comparisonOn}>Ligado</span>
        <div className={styles.comparisonDivider} style={{ left: `${comparison}%` }}><span><ChevronLeft size={17} /><ChevronRight size={17} /></span></div>
        <input type="range" min="0" max="100" value={comparison} onChange={event => setComparison(Number(event.target.value))} className={styles.comparisonInput} aria-label="Comparar ambiente com FADO apagado e ligado" aria-valuetext={`${comparison}% apagado, ${100 - comparison}% ligado`} />
      </div>
      <div className={styles.comparisonCaption}><button type="button" onClick={() => setComparison(100)}>Apagado</button><span>Arraste para comparar</span><button type="button" onClick={() => setComparison(0)}>Ligado</button></div>
      <p className={styles.simulationNote}>Ambientes ilustrativos criados com IA. Cores com lâmpada RGB, incluída no kit. A luz real varia com o espaço e as definições.</p>
    </section>

    <section id="kit" className={styles.kitSection} aria-labelledby="kit-title"><div className={`${styles.kitVisual} ${styles.kitPresentation}`}><Image src="/images/offers/fado/kit-apresentacao-v2.png" alt="Apresentação do kit FADO com lâmpada WiZ RGB e comando: milhões de cores, branco quente e frio, brilho regulável e Wi-Fi sem hub" fill sizes="(max-width: 760px) 100vw, 50vw" className={styles.presentationImage} /></div><div className={styles.kitCopy}><p className={styles.eyebrow}>O conjunto para mudar o ambiente</p><h2 id="kit-title">O seu FADO.<br /><em>Milhões de possibilidades.</em></h2><p>Candeeiro branco + lâmpada WiZ A60 RGB E27 + comando físico.</p><ul><li>16 milhões de cores</li><li>Branco quente e frio · 2200–6500 K</li><li>Brilho regulável</li><li>Aplicação WiZ ou comando incluído</li><li>Wi-Fi · sem necessidade de hub</li></ul><button type="button" className={styles.addButton} onClick={() => { chooseBundle(true); document.getElementById('comprar')?.scrollIntoView(); }}>Escolher o kit · {money(kit.slug === FADO_KIT_SLUG ? kit.priceCents : 2099)}<ArrowRight size={18} /></button><Link href={`/product/${WIZ_BULB_SLUG}`} className={styles.kitTextLink}>Ver a lâmpada à parte <ArrowRight size={15} /></Link></div></section>

    <LightingCollection products={accessories} />

    <section id="detalhes" className={styles.essentialSection} aria-labelledby="details-title">
      <h2 id="details-title">O essencial</h2>
      <dl className={styles.essentialFacts}>
        <div><dt>Tamanho</dt><dd>25 cm de diâmetro · 24 cm de altura</dd></div>
        <div><dt>Acabamento</dt><dd>Vidro branco, para uma luz suave</dd></div>
        <div><dt>Lâmpada</dt><dd>E27 · vendida à parte ou incluída no kit</dd></div>
      </dl>
      <details className={styles.technicalDetails}>
        <summary>Ver detalhes técnicos<Plus size={17} strokeWidth={1.5} /></summary>
        <dl className={styles.essentialFacts}>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </details>
    </section>

    <LightingReviews slug={product.slug} />

    <section id="perguntas" className={styles.faqSection} aria-labelledby="faq-title"><div><p className={styles.eyebrow}>Tudo às claras</p><h2 id="faq-title">Ainda tem<br /><em>alguma dúvida?</em></h2><p>Os detalhes que faltam antes de levar uma nova luz para casa.</p></div><div>{offer.faqs.map((faq) => <details key={faq.question} className={styles.faq} onToggle={(event) => { if (event.currentTarget.open) trackOfferEvent('faq_open', { offerSlug: offer.slug, question: faq.question }); }}><summary>{faq.question}<Plus size={17} strokeWidth={1.5} /></summary><p>{faq.answer}</p></details>)}</div></section>

    <section className={styles.finalSection} aria-labelledby="final-title"><div className={styles.finalImage}><Image src="/images/offers/fado/real-vanity-v2.webp" alt="Ambiente ilustrativo com FADO de luz rosa suave numa penteadeira" fill sizes="(max-width: 760px) 100vw, 50vw" className={styles.lifestyleImage} /></div><div className={styles.finalCopy}><p className={styles.eyebrow}>A casa pede uma pausa.</p><h2 id="final-title">O seu novo<br />canto favorito<br /><em>começa aqui.</em></h2><a href="#comprar" className={styles.finalButton}>FADO · {money(product.priceCents)}<ArrowRight size={20} strokeWidth={1.5} /></a><p>Vidro branco · Ø 25 cm · Lâmpada não incluída</p></div></section>

    <footer className={styles.footer}><div className={styles.footerTop}><div><Link href="/" className={styles.footerBrand}>E-com.casa</Link><p>Objetos para fazer da casa o seu lugar.</p></div><nav aria-label="Informações da loja"><Link href="/shipping">Envios</Link><Link href="/returns">Devoluções</Link><Link href="/legal/terms">Termos</Link><Link href="/legal/privacy">Privacidade</Link><Link href="/contact">Contactos</Link></nav></div><div className={styles.footerBottom}><p>© {new Date().getFullYear()} {COMPANY.brand} · {COMPANY.legalName}</p><p>FADO é um produto IKEA. Venda realizada pela E-com.casa. Foto do produto: IKEA. Ambientes ilustrativos criados com IA.</p></div></footer>

    {showSticky && saleable && <div className={styles.mobilePurchase}><div><span>{selectedKit ? 'Kit FADO + WiZ' : 'FADO · Branco'}</span><strong>{money(purchaseProduct.priceCents)}</strong></div><button type="button" onClick={addToCart}>Adicionar{chosenQuantity > 1 ? ` (${chosenQuantity})` : ''}<ArrowRight size={18} /></button></div>}


  </div>;
}
