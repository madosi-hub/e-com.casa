'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FADO_KIT_SLUG, WIZ_BULB_SLUG, lightingCollection, lightingImage } from '@/lib/catalog/lighting';
import type { CatalogProduct } from '@/lib/catalog/types';
import styles from './page.module.css';

const descriptions: Record<string, string> = {
  [FADO_KIT_SLUG]: 'Candeeiro + lâmpada RGB E27 + comando',
  [WIZ_BULB_SLUG]: 'Lâmpada RGB E27 + comando',
  'casper-glow': 'Candeeiro de mesa portátil',
  'tala-the-muse': 'Candeeiro portátil · Hackles Black',
  'wooj-mini-wavy': 'Candeeiro sem fios · Olive Oil',
  'gantri-kobble': 'Candeeiro de mesa · Carbon',
  'govee-table-lamp-2': 'Candeeiro de mesa RGBIC',
};
const priceFormatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

export function LightingCollection({ exclude, products }: { exclude?: string; products: CatalogProduct[] }) {
  const bySlug = new Map(products.map(product => [product.slug, product]));
  const rank = (slug: string) => slug === FADO_KIT_SLUG ? 0 : slug === WIZ_BULB_SLUG ? 1 : slug.startsWith('lexman-e27-') ? 2 : 3;
  const items = [...lightingCollection].filter(item => item.slug !== exclude && bySlug.has(item.slug)).sort((a, b) => rank(a.slug) - rank(b.slug));
  return <section id="mais-luz" className={styles.collectionSection} aria-labelledby="lighting-collection-title">
    <div className={styles.collectionHeading}><div><p className={styles.eyebrow}>Mais formas de iluminar</p><h2 id="lighting-collection-title">Encontre a sua <em>próxima luz.</em></h2></div><span>Deslize para descobrir <ArrowRight size={17} /></span></div>
    <div className={styles.collectionTrack}>{items.map(item => {
      const product = bySlug.get(item.slug)!;
      return <Link key={item.slug} href={`/product/${item.slug}`} className={styles.collectionCard} aria-label={`${item.brand} ${item.name}, ${priceFormatter.format(product.priceCents / 100)}. Ver produto`}>
        <div className={styles.collectionImage}>
          <Image src={lightingImage(item.slug)} alt={`${item.brand} ${item.name}`} fill sizes="(max-width: 760px) 64vw, 260px" className={item.slug === FADO_KIT_SLUG || item.slug === WIZ_BULB_SLUG ? styles.presentationImage : styles.productImage} />
        </div>
        <div className={styles.collectionInfo}><p className={styles.collectionBrand}>{item.brand}</p><h3>{item.name}</h3><p className={styles.collectionDescription}>{descriptions[item.slug] ?? item.subtitle}</p><div className={styles.collectionPriceRow}><strong>{priceFormatter.format(product.priceCents / 100)}</strong><span className={styles.collectionOpen} aria-hidden="true"><ArrowRight size={18} strokeWidth={1.5} /></span></div></div>
      </Link>;
    })}</div>
  </section>;
}
