import { getProducts, getCategories } from '@/lib/catalog';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { Hero } from '@/components/home/hero';
import { CatalogShowcase } from '@/components/home/catalog-showcase';
import { CatalogCategoryStrip } from '@/components/product/catalog-category-strip';
import { JournalBanner } from '@/components/home/journal-banner';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const [first,categories] = await Promise.all([getProducts({perPage:24}),getCategories('shop')]);
  const { products: offers } = await getProducts({ perPage: 24, funnelOnly: true });
  const featured=offers.length?offers:first.products.filter(p=>p.categorySlug!=='acessorios-instalacao').slice(0,10);
  return <><Hero /><CatalogCategoryStrip categories={categories} /><CatalogShowcase featured={featured.map(toStorefrontProduct)} initial={first.products.map(toStorefrontProduct)} totalPages={first.totalPages} /><JournalBanner /></>;
}
