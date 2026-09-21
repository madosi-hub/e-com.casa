import { useProviderMediaMirror } from './media';

const NURALTA_ACCESSORY_IMAGES: Record<string, string> = {
  'nuralta-kit-instalacao-completo': 'https://media.discordapp.net/attachments/1551363790367629333/1551403503119769701/content.png?ex=6ab1d89a&is=6ab0871a&hm=18d56ccf78a198399daa18917ac1313e6b9cbcc6185ebd5c2925f83ee6fde6ef&=&format=webp&quality=lossless&width=819&height=1024',
  'nuralta-fita-led-rgb-3m': 'https://media.discordapp.net/attachments/1551363790367629333/1551399799386021999/D_NQ_NP_724380-MLB113328695782_072026-O-10m-fita-led-rgb-neon-ip67-a-prova-de-agua-bluethoothfonte.png?ex=6ab1d527&is=6ab083a7&hm=009423cc7a9a9c7a3eac84277b51d5d55fd53230c6e3a8c5570c4e6f9950faef&=&format=webp&quality=lossless&width=1024&height=902',
};

export function nuraltaCartImage(slug: string, fallback: string): string {
  return NURALTA_ACCESSORY_IMAGES[slug] ?? useProviderMediaMirror(fallback);
}

export function nuraltaCatalogImage(slug: string, fallback: string): string {
  return NURALTA_ACCESSORY_IMAGES[slug] ?? useProviderMediaMirror(fallback);
}

export function nuraltaCatalogGallery(slug: string, fallback: string): string {
  return NURALTA_ACCESSORY_IMAGES[slug] ?? fallback.split(',').map((src) => useProviderMediaMirror(src.trim())).join(',');
}
