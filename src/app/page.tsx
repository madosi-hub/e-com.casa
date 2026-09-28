import { getProducts, getCategories, getProduct } from '@/lib/catalog';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { Hero } from '@/components/home/hero';
import { CatalogShowcase } from '@/components/home/catalog-showcase';
import { CatalogCategoryStrip } from '@/components/product/catalog-category-strip';
import { JournalBanner } from '@/components/home/journal-banner';
import { InstallationAccessories } from '@/components/home/installation-accessories';
import { NURALTA_ACCESSORY_SLUGS, NURALTA_STANDALONE_ACCESSORY_SLUGS } from '@/lib/catalog/nuralta-accessories';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const [first,categories,accessoryProducts] = await Promise.all([getProducts({perPage:24}),getCategories('shop'),Promise.all(NURALTA_STANDALONE_ACCESSORY_SLUGS.map(getProduct))]);
  const { products: offers } = await getProducts({ perPage: 24, funnelOnly: true });
  const featured=(offers.length?offers:first.products.filter(p=>p.categorySlug!=='acessorios-instalacao').slice(0,10)).filter(p=>!NURALTA_ACCESSORY_SLUGS.some(slug=>slug===p.slug));
  const accessories=accessoryProducts.filter((item): item is NonNullable<typeof item> => item !== null).map(toStorefrontProduct);
  return <><Hero /><CatalogCategoryStrip categories={categories} /><CatalogShowcase featured={featured.map(toStorefrontProduct)} initial={first.products.map(toStorefrontProduct)} totalPages={first.totalPages}><InstallationAccessories products={accessories} /></CatalogShowcase><JournalBanner /></>;
}
