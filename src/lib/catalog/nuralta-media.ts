import { mirrorProviderMedia } from './media';

const NURALTA_ACCESSORY_IMAGES: Record<string, string> = {
  'nuralta-kit-instalacao-completo': '/images/nuralta-accessories/kit-1.png',
  'nuralta-fita-led-rgb-3m': '/images/nuralta-accessories/fita-led-1.png',
};

const NURALTA_ACCESSORY_GALLERIES: Record<string, string> = {
  'nuralta-kit-instalacao-completo': [
    '/images/nuralta-accessories/kit-2.png',
    '/images/nuralta-accessories/kit-3.png',
    '/images/nuralta-accessories/kit-4.png',
    '/images/nuralta-accessories/kit-5.png',
  ].join(','),
  'nuralta-fita-led-rgb-3m': [
    '/images/nuralta-accessories/fita-led-2.png',
    '/images/nuralta-accessories/fita-led-3.png',
    '/images/nuralta-accessories/fita-led-4.png',
  ].join(','),
};

export function nuraltaCartImage(slug: string, fallback: string): string {
  return NURALTA_ACCESSORY_IMAGES[slug] ?? mirrorProviderMedia(fallback);
}

export function nuraltaCatalogImage(slug: string, fallback: string): string {
  return NURALTA_ACCESSORY_IMAGES[slug] ?? mirrorProviderMedia(fallback);
}

export function nuraltaCatalogGallery(slug: string, fallback?: string | null): string {
  return NURALTA_ACCESSORY_GALLERIES[slug] ?? fallback?.split(',').map((src) => mirrorProviderMedia(src.trim())).join(',') ?? '';
}
