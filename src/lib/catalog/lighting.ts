/** Presentation shared by the lighting collection; commercial data comes from the catalogue. */
export const FADO_KIT_SLUG = 'fado-wiz-a60-rgb-comando';
export const WIZ_BULB_SLUG = 'wiz-a60-rgb-comando';
const fadoScenes = [
  { src: '/images/offers/fado/real-bedroom-v2.webp', alt: 'Ambiente ilustrativo: FADO com luz lavanda numa mesa de cabeceira', kind: 'scene' },
  { src: '/images/offers/fado/real-vanity-v2.webp', alt: 'Ambiente ilustrativo: FADO com luz rosa numa penteadeira', kind: 'scene' },
  { src: '/images/offers/fado/real-setup-v2.webp', alt: 'Ambiente ilustrativo: FADO com luz azul junto a um computador', kind: 'scene' },
  { src: '/images/offers/fado/real-study-v2.webp', alt: 'Ambiente ilustrativo: FADO com luz coral numa secretária', kind: 'scene' },
];
const fadoPresentation = { src: '/images/offers/fado/candeeiro-apresentacao.png', alt: 'Apresentação do candeeiro FADO com luz quente; lâmpada vendida separadamente', kind: 'presentation' };
export const fadoGalleryImages = [
  fadoPresentation,
  { src: '/images/offers/fado/product.webp', alt: 'Candeeiro FADO branco, sem lâmpada', kind: 'product' },
  ...fadoScenes,
];
export const fadoKitGalleryImages = [
  { src: '/images/offers/fado/kit-completo.png', alt: 'Kit completo: candeeiro FADO, lâmpada WiZ A60 RGB e comando; telemóvel ilustrativo, não incluído', kind: 'presentation' },
  { src: '/images/offers/fado/wiz-rgb-comando.png', alt: 'Lâmpada WiZ A60 RGB E27 com comando físico e apresentação das funcionalidades', kind: 'presentation' },
  fadoPresentation,
  ...fadoScenes,
];
export const lightingCollection = [
  { slug: 'lexman-e27-2700k', name: 'LED E27 · Luz quente', brand: 'Lexman', subtitle: '2700 K · 806 lm · 1 unidade', headline: 'Luz quente.\nUm toque acolhedor.', description: 'Lâmpada LED de filamento A60 E27 em branco opala. Luz quente de 2700 K para a iluminação do dia a dia. Vendida à unidade, sem comando ou ligação à aplicação.', features: ['Casquilho E27 · formato A60', 'Branco quente · 2700 K', '806 lúmenes · consumo de 5,9 W', 'Vidro opaco · Ø 60 × 104 mm', 'Luz fixa · não regulável', '1 lâmpada · sem comando'], source: 'https://www.leroymerlin.pt/produtos/lampada-led-filamento-a60-e27-806-lm-2700-k-milky-86577606.html', images: 1 },
  { slug: 'lexman-e27-4000k', name: 'LED E27 · Luz neutra', brand: 'Lexman', subtitle: '4000 K · 806 lm · 1 unidade', headline: 'Luz neutra.\nSimples, todos os dias.', description: 'Lâmpada LED de filamento A60 E27 em branco opala. Luz neutra de 4000 K, sem cores RGB, comando ou ligação à aplicação. Vendida à unidade.', features: ['Casquilho E27 · formato A60', 'Branco neutro · 4000 K', '806 lúmenes · consumo de 5,9 W', 'Vidro opaco · Ø 60 × 104 mm', 'Luz fixa · não regulável', '1 lâmpada · sem comando'], source: 'https://www.leroymerlin.pt/produtos/lampada-led-filamento-a60-e27-806-lm-4000-k-milky-86577608.html', images: 1 },
  { slug: 'lexman-e27-6500k', name: 'LED E27 · Luz fria', brand: 'Lexman', subtitle: '6500 K · 806 lm · 1 unidade', headline: 'Luz fria.\nOutra forma de iluminar.', description: 'Lâmpada LED de filamento A60 E27 em branco opala. Luz fria de 6500 K, com funcionamento simples no interruptor do candeeiro. Vendida à unidade, sem comando.', features: ['Casquilho E27 · formato A60', 'Branco frio · 6500 K', '806 lúmenes · consumo de 5,9 W', 'Vidro opaco · Ø 60 × 104 mm', 'Luz fixa · não regulável', '1 lâmpada · sem comando'], source: 'https://www.leroymerlin.pt/produtos/lampada-led-filamento-a60-e27-806-lm-6500-k-milky-86577610.html', images: 1 },
  { slug: 'casper-glow', name: 'Glow', brand: 'Casper', subtitle: 'Uma luz para abrandar.', headline: 'O dia termina.\nA luz acompanha.', description: 'Uma presença suave na mesa de cabeceira. A Glow combina luz quente com gestos simples para acompanhar a sua rotina.', features: ['Luz quente', 'Intensidade ajustável com um gesto', 'Utilização sem fios'], source: 'https://casper.com/products/glow', images: 3 },
  { slug: 'tala-the-muse', name: 'The Muse', brand: 'Tala', subtitle: 'Uma presença que vai consigo.', headline: 'Dentro de casa.\nOu lá fora.', description: 'Uma lanterna de linhas clássicas, em Hackles Black. Luz portátil com uma forma que merece ficar à vista.', features: ['Portátil', 'Acabamento Hackles Black', 'Proteção IP44'], source: 'https://tala.co.uk/products/the-muse-portable-lamp-in-hackles-black', images: 3 },
  { slug: 'wooj-mini-wavy', name: 'Mini Wavy', brand: 'Wooj', subtitle: 'Pequena, com personalidade.', headline: 'Uma forma diferente.\nUma luz só sua.', description: 'Uma silhueta ondulada e uma escala pequena para dar outra presença ao seu canto. Esta é a versão sem fios, em Olive Oil.', features: ['Sem fios · carregamento USB-C', 'Três níveis de luz', 'Abajur impresso em 3D'], source: 'https://wooj.design/products/cordless-mini-wavy-lamp', images: 3 },
  { slug: 'gantri-kobble', name: 'Kobble', brand: 'Gantri', subtitle: 'Luz com uma forma escultural.', headline: 'Um objeto de design.\nTodos os dias.', description: 'Desenhado por Karim Rashid, o Kobble combina volumes arredondados com uma presença escultural. Aqui, no acabamento Carbon.', features: ['Design Karim Rashid', 'Candeeiro de mesa', 'Acabamento Carbon'], source: 'https://www.gantri.com/products/10101/kobble-table-light-by-karim-rashid?sku=10101-sm-carbon', images: 3 },
  { slug: 'govee-table-lamp-2', name: 'Table Lamp 2', brand: 'Govee', subtitle: 'Cor para cada momento.', headline: 'Mude a cor.\nMude o ambiente.', description: 'Uma luz de mesa para explorar cores e criar diferentes ambientes em casa. Controlo na aplicação Govee.', features: ['Iluminação RGBIC', 'Brilho regulável', 'Controlo na aplicação'], source: 'https://eu.govee.com/pt-pt/products/led-table-lamp-2', images: 2 },
  { slug: WIZ_BULB_SLUG, name: 'A60 RGB + Comando', brand: 'WiZ', subtitle: 'A sua luz, à sua maneira.', headline: 'Uma lâmpada.\nMilhões de ambientes.', description: 'Mude a cor, ajuste a luz branca ou regule o brilho. Com a aplicação WiZ ou com o comando físico incluído, sem precisar de hub.', features: ['16 milhões de cores · RGB', 'Branco quente a frio · 2200–6500 K', 'Brilho regulável', 'Aplicação WiZ + comando incluído', 'Wi-Fi · sem hub', 'Casquilho E27'], source: 'https://www.wizconnected.com/pt-pt/p/lampada-led-lampada-a60-e27/8719514551091', images: 2 },
  { slug: FADO_KIT_SLUG, name: 'FADO + WiZ', brand: 'IKEA + WiZ', subtitle: 'Candeeiro + lâmpada RGB + comando', headline: 'O FADO que conhece.\nA luz que escolher.', description: 'Um candeeiro FADO branco, uma lâmpada WiZ A60 RGB E27 e um comando físico. O conjunto para escolher a cor, o branco e a intensidade da sua luz.', features: ['1 candeeiro FADO branco · Ø 25 cm', '1 lâmpada WiZ A60 RGB · E27', '1 comando físico WiZ', '16 milhões de cores · 2200–6500 K', 'Aplicação WiZ · Wi-Fi sem hub'], source: 'https://www.wizconnected.com/pt-pt/p/lampada-led-lampada-a60-e27/8719514551091', images: fadoKitGalleryImages.length },
] as const;

export type LightingPresentation = (typeof lightingCollection)[number];
export function getLightingPresentation(slug: string) { return lightingCollection.find(item => item.slug === slug); }
export function isLightingProductPath(pathname: string) { return lightingCollection.some(item => pathname === `/product/${item.slug}`); }
export function lightingImage(slug: string, index = 0) {
  if (slug === FADO_KIT_SLUG) return fadoKitGalleryImages[index % fadoKitGalleryImages.length].src;
  if (slug === WIZ_BULB_SLUG) return index === 0 ? '/images/offers/fado/wiz-rgb-comando.png' : `/images/lighting/${slug}/${index - 1}.webp`;
  return `/images/lighting/${slug}/${index}.webp`;
}
