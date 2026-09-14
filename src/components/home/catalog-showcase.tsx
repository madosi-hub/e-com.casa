'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import type { CatalogProduct } from '@/lib/catalog/types';
export function CatalogShowcase({ featured, initial, totalPages }: { featured: CatalogProduct[]; initial: CatalogProduct[]; totalPages: number }) {
  const rail = useRef<HTMLDivElement>(null);
  const [products,setProducts] = useState(initial);
  const [page,setPage] = useState(1);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  async function more() { setLoading(true);setError(''); try { const r=await fetch(`/api/products?perPage=24&page=${page+1}`);if(!r.ok)throw Error();const d=await r.json();setProducts(p=>[...p,...d.products]);setPage(p=>p+1); } catch {setError('Não foi possível carregar. Tente novamente.');} finally {setLoading(false);} }
  return <>
    <section className="container-ecom py-12 lg:py-16" aria-labelledby="featured-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow text-muted-foreground">ODEM · WoodUpp</p><h2 id="featured-title" className="mt-2 font-display text-3xl sm:text-4xl">Produtos em destaque</h2><p className="mt-3 text-sm text-muted-foreground">Acabamentos para dar uma nova presença ao seu espaço.</p></div><div className="flex gap-2"><button aria-label="Destaques anteriores" onClick={()=>rail.current?.scrollBy({left:-640,behavior:'smooth'})} className="rounded-full border p-3"><ArrowLeft className="h-4 w-4" /></button><button aria-label="Próximos destaques" onClick={()=>rail.current?.scrollBy({left:640,behavior:'smooth'})} className="rounded-full border p-3"><ArrowRight className="h-4 w-4" /></button></div></div><div ref={rail} className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5">{featured.map((p,i)=><div key={p.slug} className="w-[70vw] max-w-[285px] shrink-0 snap-start"><ProductCard product={p} priority={i<2} /></div>)}</div><Link href="/offers" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Ver todas as ofertas <ArrowRight className="h-4 w-4" /></Link></section>
    <section className="border-t bg-background py-12 lg:py-16" aria-labelledby="catalog-title"><div className="container-ecom"><div className="mb-8 flex items-end justify-between"><h2 id="catalog-title" className="font-display text-3xl sm:text-4xl">Explore o catálogo</h2><Link href="/shop" className="text-sm underline">Categorias e filtros</Link></div><div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.map(p=><ProductCard key={p.slug} product={p} />)}</div>{page<totalPages&&<div className="mt-10 text-center"><button disabled={loading} onClick={more} className="rounded-full border px-8 py-3 text-sm font-semibold disabled:opacity-50">{loading?'A carregar…':'Mostrar mais produtos'}</button><p role="status" className="mt-3 text-sm">{error}</p></div>}</div></section>
  </>;
}
