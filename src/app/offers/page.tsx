import type { Metadata } from 'next';
import Link from 'next/link';
import { getProduct, getProducts } from '@/lib/catalog';
import { toStorefrontProduct } from '@/lib/catalog/public-product';
import { ProductCard } from '@/components/product/product-card';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ofertas | E-com.casa', description: 'Descubra ofertas de iluminação e painéis decorativos. FADO, Nuralta, ODEM e WoodUpp na E-com.casa.', alternates: { canonical: '/offers' } };
export default async function OffersPage() {
  const [first, nuraltaProduct, fadoProduct] = await Promise.all([
    getProducts({ perPage: 48, funnelOnly: true }),
    getProduct('nuralta-painel-ripado-decorativo'),
    getProduct('ikea-fado-candeeiro-mesa-branco'),
  ]);
  const rest = await Promise.all(Array.from({length:first.totalPages-1},(_,i)=>getProducts({perPage:48,page:i+2,funnelOnly:true})));
  const campaignProducts = [first,...rest].flatMap(p=>p.products).filter(p=>p.offerSlug);
  const dedicatedProducts = [
    ...(nuraltaProduct ? [{ ...nuraltaProduct, offerSlug: 'nuralta-painel-ripado' }] : []),
    ...(fadoProduct ? [{ ...fadoProduct, offerSlug: 'fado-table-lamp' }] : []),
  ];
  const products = [...dedicatedProducts, ...campaignProducts.filter(product => !dedicatedProducts.some(dedicated => dedicated.slug === product.slug))];
  return <main className="bg-[#f7f3ef] text-[#201a17]"><section className="bg-[#201a17] px-4 py-16 text-white"><div className="mx-auto max-w-6xl"><Link href="/" className="text-sm">E-com.casa</Link><p className="mt-8 text-xs uppercase tracking-widest text-[#c79a68]">Iluminação · Painéis decorativos</p><h1 className="mt-4 font-display text-4xl sm:text-6xl">Encontre a sua próxima transformação.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-[#cbbbaf]">Luz, textura e peças escolhidas para dar outra vida à sua casa. Descubra cada oferta e escolha a sua.</p></div></section><section className="container-ecom py-12">{products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4">{products.map(p=><ProductCard key={p.slug} product={toStorefrontProduct(p)} />)}</div> : <p>Não existem ofertas ativas neste momento. <Link className="underline" href="/shop">Explorar catálogo</Link></p>}<p className="mt-10 text-xs text-muted-foreground">Os descontos têm como referência o preço de catálogo do fornecedor. Consulte o prazo e as condições em cada produto.</p></section></main>;
}
