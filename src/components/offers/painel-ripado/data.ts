export const PANEL_ASSET_ROOT = 'https://raw.githubusercontent.com/nexflowx-hub/nuraltainteriores/main/public/pt';
export const PANEL_CAMPAIGN_CODE = 'PAINEL75';

export const PANEL_COLORS = [
  { name: 'Carvalho', src: `${PANEL_ASSET_ROOT}/images/img1.webp` },
  { name: 'Carvalho Claro', src: `${PANEL_ASSET_ROOT}/images/var2.webp` },
  { name: 'Preto', src: `${PANEL_ASSET_ROOT}/images/var3.webp` },
  { name: 'Cinza', src: `${PANEL_ASSET_ROOT}/images/var4.webp` },
  { name: 'Nogueira', src: `${PANEL_ASSET_ROOT}/images/var5.webp` },
  { name: 'Marfim', src: `${PANEL_ASSET_ROOT}/images/var6.webp` },
  { name: 'Grafite', src: `${PANEL_ASSET_ROOT}/images/var7.webp` },
] as const;

export const PANEL_GALLERY = [
  `${PANEL_ASSET_ROOT}/images/img2.webp`,
  `${PANEL_ASSET_ROOT}/images/video-painel-produto-poster.webp`,
  `${PANEL_ASSET_ROOT}/images/img3.webp`,
  `${PANEL_ASSET_ROOT}/images/img4.webp`,
  `${PANEL_ASSET_ROOT}/images/img5.webp`,
  `${PANEL_ASSET_ROOT}/images/img6.webp`,
  `${PANEL_ASSET_ROOT}/images/img7.webp`,
  `${PANEL_ASSET_ROOT}/images/img8.webp`,
] as const;

export const PANEL_REVIEWS = [
  { name: 'João Martins', location: 'Lisboa', time: 'hoje às 06:28', title: 'Muito bom pelo preço que paguei', body: 'Paguei 56 € pela quantidade de que precisava para a parede da TV. Antes de encomendar, comparei com duas lojas e opções muito parecidas ficavam bastante mais caras. Pelo preço, superou mesmo as expectativas e o resultado ficou excelente.', photos: [`${PANEL_ASSET_ROOT}/images/r1.webp`, `${PANEL_ASSET_ROOT}/images/review-joao-side-v2.webp`, `${PANEL_ASSET_ROOT}/images/review-joao-detail-v2.webp`] },
  { name: 'Inês Carvalho', location: 'Porto', time: 'ontem', title: 'Bonitos e bem embalados', body: 'Chegaram todos direitinhos e com os cantos bem protegidos. Tinha algum receio de escolher a cor pela internet, mas é bastante fiel às fotografias e não tem aquele brilho artificial. Para já, nada a apontar.', photos: [`${PANEL_ASSET_ROOT}/images/r2.webp`] },
  { name: 'Marta Ribeiro', location: 'Braga', time: 'anteontem', title: 'Fez uma diferença enorme na sala', body: 'Pusemos atrás da TV e o espaço deixou logo de parecer tão vazio. O meu marido tratou da montagem num sábado, sem precisarmos de contratar ninguém. Só aconselho a medir tudo com calma antes do primeiro corte 😅', photos: [`${PANEL_ASSET_ROOT}/images/r5.webp`, `${PANEL_ASSET_ROOT}/images/review-marta-side-v2.webp`, `${PANEL_ASSET_ROOT}/images/review-marta-detail-v2.webp`] },
  { name: 'Tiago Sousa', location: 'Coimbra', time: 'há 4 dias', title: 'Preço excelente comparado com outras lojas', body: 'Com a promoção, ficou-me por pouco mais de 50 €. Vi painéis semelhantes noutros sites por quase o dobro e decidi experimentar estes. Nunca tinha feito este tipo de montagem, mas numa tarde ficou pronto e a qualidade surpreendeu-me pela positiva.', photos: [`${PANEL_ASSET_ROOT}/images/r7.webp`, `${PANEL_ASSET_ROOT}/images/review-tiago-detail-v2.webp`] },
  { name: 'Ana Ferreira', location: 'Setúbal', time: 'há 1 semana', title: 'A entrada parece outra', body: 'Colocámos só numa parede do hall para não pesar demasiado e ficou com muito mais pinta. A encomenda chegou sem estragos, os cantos vinham protegidos e recebemos as atualizações do envio até à entrega.', photos: [`${PANEL_ASSET_ROOT}/images/r9.webp`, `${PANEL_ASSET_ROOT}/images/review-ana-side-v2.webp`, `${PANEL_ASSET_ROOT}/images/review-ana-detail-v2.webp`] },
] as const;

export const PANEL_REVIEW_THUMBS = [
  'r1.webp','review-joao-side-v2.webp','review-joao-detail-v2.webp','r2.webp','r5.webp','review-marta-side-v2.webp','review-marta-detail-v2.webp','r7.webp','review-tiago-detail-v2.webp','r9.webp','review-ana-side-v2.webp','review-ana-detail-v2.webp',
  'reviews/customer-review-01.webp','reviews/customer-review-02.webp','reviews/customer-review-03.webp','reviews/customer-review-04.webp','reviews/customer-review-05.webp','reviews/customer-review-06.webp','reviews/customer-review-07.webp','reviews/customer-review-08.webp','reviews/customer-review-09.webp','reviews/customer-review-10-01.webp','reviews/customer-review-10-02.webp','reviews/customer-review-11-01.webp','reviews/customer-review-11-02.webp','reviews/customer-review-11-03.webp','reviews/customer-review-12.webp','reviews/customer-review-13.webp','reviews/customer-review-14.webp','reviews/customer-review-15.webp','reviews/customer-review-16.webp','reviews/customer-review-17-01.webp','reviews/customer-review-17-02.webp','reviews/customer-review-17-03.webp','reviews/customer-review-17-04.webp',
].map((path) => `${PANEL_ASSET_ROOT}/images/${path}`);

export function campaignEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
