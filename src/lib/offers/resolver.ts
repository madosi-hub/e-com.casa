import { cache } from 'react';
import { db } from '@/lib/db';
import { getProduct } from '@/lib/catalog';
import { isCatalogProductSaleable } from '@/lib/catalog/saleability';
import type { CatalogProduct } from '@/lib/catalog/types';
import { getProductOffers } from './store';
import { isOfferActive } from './promotion';
import type { OfferConfig, OfferReviewItem } from './types';

export interface ResolvedOffer {
  offer: OfferConfig;
  product: CatalogProduct;
}

async function getVerifiedReviews(productSlug: string): Promise<OfferReviewItem[]> {
  try {
    const reviews = await db.review.findMany({
      where: { productSlug, status: 'APPROVED', verified: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return reviews.map((review) => ({
      author: review.author,
      location: review.country,
      date: review.createdAt.toISOString().slice(0, 10),
      rating: review.rating,
      body: review.body,
      verified: true,
    }));
  } catch (error) {
    console.warn('[offers] Verified reviews unavailable.', error);
    return [];
  }
}

export function configForProduct(product: CatalogProduct, slug: string, reviews: OfferReviewItem[] = []): OfferConfig {
  return {
    slug,
    productSlug: product.slug,
    announcement: 'Portes grátis Portugal e Espanha · Europa acima de 50 €',
    eyebrow: `${product.brand ?? 'E-com.casa'} · Oferta`,
    headline: product.name,
    subheadline: product.shortDescription,
    valueProposition: { title: 'Escolha o acabamento. Transforme o seu espaço.', body: product.shortDescription },
    transformation: { title: 'Detalhes que fazem a diferença.', body: product.description, image: product.image },
    benefits: [],
    why: { title: 'Do fabricante para o seu projeto.', body: product.shortDescription, points: [] },
    installation: [],
    inspirationImages: product.gallery.split(',').filter(Boolean),
    reviews: reviews.length ? { mode: 'verified', reviews } : { mode: 'none' },
    faqs: [
      { question: 'A que opção corresponde o preço apresentado?', answer: `O valor inicial corresponde à primeira variante disponível de ${product.name}. Se outra medida ou acabamento tiver um suplemento, o preço é atualizado antes de adicionar ao carrinho.` },
      { question: 'Como é feita a instalação?', answer: 'A superfície deve estar sólida, limpa, seca e nivelada. Utilize cola de montagem ou fixação mecânica compatível com a parede e com os materiais indicados na ficha do fabricante.' },
      { question: 'Posso cortar o painel à medida?', answer: `O corte depende da composição do produto (${product.materials || 'consulte a ficha técnica'}). Utilize ferramenta adequada ao material e confirme as instruções do fabricante antes do primeiro corte.` },
      { question: 'Como calculo a quantidade necessária?', answer: `Use a calculadora junto às opções do produto. Introduza a largura e a altura aproximadas da parede e confirme as dimensões da variante selecionada (${product.dimensions || 'ver ficha do produto'}). Considere margem para cortes e remates.` },
      { question: 'Quais são as medidas e acabamentos disponíveis?', answer: `As opções atualmente disponíveis são apresentadas no configurador e vêm do catálogo de ${product.brand ?? product.manufacturer ?? 'E-com.casa'}. Uma opção marcada como esgotada não pode ser adicionada ao carrinho.` },
      { question: 'O painel ajuda na acústica?', answer: 'O desempenho depende da composição, da parede e do método de instalação. Não apresentamos uma classe acústica que não esteja documentada pelo fabricante.' },
      { question: 'Como devo limpar e manter o painel?', answer: 'Siga as indicações de manutenção do fabricante. Como regra geral, remova o pó com um pano macio e seco ou ligeiramente humedecido e evite produtos abrasivos ou excesso de água.' },
      { question: 'Quanto tempo demora a entrega?', answer: 'O prazo depende do produto, do fabrico e do destino e é confirmado durante a encomenda.' },
      { question: 'E se o produto chegar danificado?', answer: 'Fotografe a embalagem e o produto no momento da receção e contacte o apoio E-com.casa. A equipa acompanha a ocorrência e indica o procedimento aplicável.' },
      { question: 'Posso devolver se mudar de opinião?', answer: 'Consulte a política de devoluções antes da compra. Aplicam-se os direitos legais do consumidor e as exceções previstas para produtos personalizados ou fabricados segundo especificações do cliente.' },
    ],
    finalCta: { title: 'O próximo passo para o seu espaço.', body: 'Escolha a opção e a quantidade para concluir a encomenda.', button: 'Comprar agora' },
    seo: { title: `${product.name} | E-com.casa`, description: product.shortDescription.slice(0, 155) },
  };
}

function nuraltaConfig(product: CatalogProduct, slug: string): OfferConfig {
  const base = configForProduct(product, slug);
  return {
    ...base,
    announcement: 'Envio gratuito para Portugal Continental',
    eyebrow: 'Nuralta · Fabrico próprio',
    headline: 'Painel Ripado Decorativo',
    subheadline: 'Design que transforma. Instalação que simplifica.',
    seo: {
      title: 'Painel Ripado Decorativo Nuralta',
      description: 'Painel Ripado Decorativo em MDF, fabricado pela Nuralta. Configuração e encomenda online através da E-com.casa.',
    },
  };
}

export const resolveOffer = cache(async (requestedSlug: string): Promise<ResolvedOffer | null> => {
  const offers = await getProductOffers();
  const offer = offers.find((candidate) =>
    candidate.slug === requestedSlug ||
    (requestedSlug === 'painel-ripado' && candidate.productSlug === 'odem-painel-ripado-acustico-carvalho')
  );

  if (!isOfferActive(offer)) return null;

  const product = await getProduct(offer.productSlug);
  if (!product || !isCatalogProductSaleable(product)) return null;

  if (offer.productSlug === 'nuralta-painel-ripado-decorativo') {
    return { product, offer: nuraltaConfig(product, requestedSlug) };
  }

  const reviews = await getVerifiedReviews(product.slug);
  return { product, offer: configForProduct(product, requestedSlug, reviews) };
});
