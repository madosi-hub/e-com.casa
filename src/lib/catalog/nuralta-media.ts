import { mirrorProviderMedia } from './media';

const NURALTA_ACCESSORY_IMAGES: Record<string, string> = {
  'nuralta-kit-instalacao-completo': 'https://media.discordapp.net/attachments/1551363790367629333/1551403503119769701/content.png?ex=6ab1d89a&is=6ab0871a&hm=18d56ccf78a198399daa18917ac1313e6b9cbcc6185ebd5c2925f83ee6fde6ef&=&format=webp&quality=lossless&width=819&height=1024',
  'nuralta-fita-led-rgb-3m': 'https://media.discordapp.net/attachments/1551363790367629333/1551399799386021999/D_NQ_NP_724380-MLB113328695782_072026-O-10m-fita-led-rgb-neon-ip67-a-prova-de-agua-bluethoothfonte.png?ex=6ab1d527&is=6ab083a7&hm=009423cc7a9a9c7a3eac84277b51d5d55fd53230c6e3a8c5570c4e6f9950faef&=&format=webp&quality=lossless&width=1024&height=902',
};

const NURALTA_ACCESSORY_GALLERIES: Record<string, string> = {
  'nuralta-kit-instalacao-completo': [
    'https://media.discordapp.net/attachments/1551363790367629333/1551403505502396578/content.png?ex=6ab1d89b&is=6ab0871b&hm=4425945a78213e474277d1cca77643d088d4876f36917befbbe8afdf671e51d7&=&format=webp&quality=lossless&width=819&height=1024',
    'https://cdn.discordapp.com/attachments/1551363790367629333/1551406491498717345/image.png?ex=6ab1db63&is=6ab089e3&hm=e7988d0cefb6431bb685ec36404b3661db8fd3b01e15b9333f784a41675ba435&',
    'https://media.discordapp.net/attachments/1551363790367629333/1551403504441106542/content.png?ex=6ab1d89b&is=6ab0871b&hm=5e9bde20ea830a828bc468e18757f599c52dbfcc2951620afa936e53c043cb45&=&format=webp&quality=lossless&width=819&height=1024',
    'https://media.discordapp.net/attachments/1551363790367629333/1551403503765950516/content.png?ex=6ab1d89a&is=6ab0871a&hm=37f79005b8c82faec411a6ff93386cea22b95ba8a8eb09493c714e0aa558165a&=&format=webp&quality=lossless&width=819&height=1024',
  ].join(','),
  'nuralta-fita-led-rgb-3m': [
    'https://media.discordapp.net/attachments/1551363790367629333/1551399799830482994/content.png?ex=6ab1d527&is=6ab083a7&hm=40d6e986cabbbf20db83525d422f91fe5de8ff9360e6204e5ae9f433a80b6d51&=&format=webp&quality=lossless&width=977&height=1024',
    'https://media.discordapp.net/attachments/1551363790367629333/1551399800342061056/content.png?ex=6ab1d528&is=6ab083a8&hm=f605dcfcc5ac17a0f5d96b6adee847345273a784941bc90d077547ff6655f629&=&format=webp&quality=lossless&width=1024&height=935',
    'https://media.discordapp.net/attachments/1551363790367629333/1551399800837242920/content.png?ex=6ab1d528&is=6ab083a8&hm=6f5319bafe6e4582a54ab7f436576f67b347b8c522831f40367bcf6f7994fdc9&=&format=webp&quality=lossless&width=1024&height=935',
    'https://media.discordapp.net/attachments/1551363790367629333/1551399799386021999/D_NQ_NP_724380-MLB113328695782_072026-O-10m-fita-led-rgb-neon-ip67-a-prova-de-agua-bluethoothfonte.png?ex=6ab1d527&is=6ab083a7&hm=009423cc7a9a9c7a3eac84277b51d5d55fd53230c6e3a8c5570c4e6f9950faef&=&format=webp&quality=lossless&width=1024&height=902',
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
