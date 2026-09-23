export const PANEL_ASSET_ROOT = 'https://raw.githubusercontent.com/nexflowx-hub/nuraltainteriores/main/public/pt';
export const PANEL_CAMPAIGN_CODE = 'PAINEL75';
export const PANEL_REVIEW_RATING = 4.7;
export const PANEL_REVIEWS_PER_PAGE = 5;

const panelImage = (path: string) => `${PANEL_ASSET_ROOT}/images/${path}`;
const localPanelGalleryImage = (folder: string, file: string) => `/pt/images/gallery/${folder}/${file}`;
const panelVideo = (path: string) => `/pt/videos/${path}`;

export const PANEL_COLORS = [
  { name: 'Carvalho', src: panelImage('img1.webp'), galleryFolder: null },
  { name: 'Carvalho Claro', src: panelImage('var2.webp'), galleryFolder: 'light-oak' },
  { name: 'Preto', src: panelImage('var3.webp'), galleryFolder: 'black' },
  { name: 'Cinza', src: panelImage('var4.webp'), galleryFolder: 'grey' },
  { name: 'Nogueira', src: panelImage('var5.webp'), galleryFolder: 'walnut' },
  { name: 'Marfim', src: panelImage('var6.webp'), galleryFolder: 'ivory' },
  { name: 'Grafite', src: panelImage('var7.webp'), galleryFolder: 'graphite' },
] as const;

export type PanelSize = {
  key: string;
  label: string;
  priceCents: number;
  areaM2: number;
  soldOut?: boolean;
};

export const PANEL_SIZES: PanelSize[] = [
  { key: '0', label: '240 × 60 cm', priceCents: 500, areaM2: 1.44 },
  { key: '1', label: '260 × 70 cm', priceCents: 900, areaM2: 1.82 },
  { key: '2', label: '270 × 80 cm', priceCents: 1300, areaM2: 2.16 },
  { key: '3', label: '270 × 110 cm', priceCents: 1700, areaM2: 2.97, soldOut: true },
];

export const PANEL_PAYMENT_METHODS = [
  { src: '/pt/payment-methods/visa.svg', alt: 'Visa', width: 40 },
  { src: '/pt/payment-methods/mastercard.svg', alt: 'Mastercard', width: 34 },
  { src: '/pt/payment-methods/apple-pay.svg', alt: 'Apple Pay', width: 43 },
  { src: '/pt/payment-methods/mb-way.svg', alt: 'MB WAY', width: 50 },
  { src: '/pt/payment-methods/multibanco.svg', alt: 'Multibanco', width: 24 },
];

export type PanelProductMedia = {
  type: 'image' | 'video';
  src: string;
  poster?: string;
  alt: string;
};

export const PANEL_PRODUCT_MEDIA: PanelProductMedia[] = [
  { type: 'image', src: panelImage('img2.webp'), alt: 'Painel Carvalho' },
  {
    type: 'video',
    src: panelVideo('video-painel-produto.mp4'),
    poster: panelImage('video-painel-produto-poster.webp'),
    alt: 'Vídeo do produto',
  },
  { type: 'image', src: panelImage('img3.webp'), alt: 'Painel Carvalho' },
  { type: 'image', src: panelImage('img4.webp'), alt: 'Painel Carvalho' },
  { type: 'image', src: panelImage('img5.webp'), alt: 'Painel Carvalho' },
  { type: 'image', src: panelImage('img6.webp'), alt: 'Painel Carvalho' },
  { type: 'image', src: panelImage('img7.webp'), alt: 'Painel Carvalho' },
  { type: 'image', src: panelImage('img8.webp'), alt: 'Painel Carvalho' },
];

const PANEL_IMAGE_FILES = ['img2.webp', 'img3.webp', 'img4.webp', 'img5.webp', 'img6.webp', 'img7.webp', 'img8.webp'];

export function panelProductMediaForColor(colorIndex: number | null): PanelProductMedia[] {
  const color = colorIndex === null ? null : PANEL_COLORS[colorIndex];
  const folder = color?.galleryFolder;
  if (!folder) return PANEL_PRODUCT_MEDIA;

  const images = PANEL_IMAGE_FILES.map((file) => localPanelGalleryImage(folder, file));
  return [
    { type: 'image', src: images[0], alt: `Painel ${color.name}` },
    PANEL_PRODUCT_MEDIA[1],
    ...images.slice(1).map((src) => ({ type: 'image' as const, src, alt: `Painel ${color.name}` })),
  ];
}

export const PANEL_GALLERY = PANEL_PRODUCT_MEDIA.map((item) => item.poster ?? item.src);

export type PanelReview = {
  id?: string;
  name: string;
  location: string;
  time?: string;
  dateOffsetHours?: number;
  stars: number;
  tags: string[];
  title: string;
  body: string;
  photos: string[];
};

const featuredReviews: PanelReview[] = [
  {
    name: 'João Martins',
    location: 'Lisboa',
    dateOffsetHours: 8,
    stars: 5,
    tags: ['acabamento', 'como nas fotos', 'instalação fácil'],
    title: 'Muito bom pelo preço que paguei',
    body: 'Paguei 56 € pela quantidade de que precisava para a parede da TV. Antes de encomendar, comparei com duas lojas e opções muito parecidas ficavam bastante mais caras. Pelo preço, superou mesmo as expectativas e o resultado ficou excelente.',
    photos: [panelImage('r1.webp'), panelImage('review-joao-side-v2.webp'), panelImage('review-joao-detail-v2.webp')],
  },
  {
    name: 'Inês Carvalho',
    location: 'Porto',
    time: 'ontem',
    stars: 5,
    tags: ['acabamento', 'como nas fotos', 'entrega cuidada'],
    title: 'Bonitos e bem embalados',
    body: 'Chegaram todos direitinhos e com os cantos bem protegidos. Tinha algum receio de escolher a cor pela internet, mas é bastante fiel às fotografias e não tem aquele brilho artificial. Para já, nada a apontar.',
    photos: [panelImage('r2.webp')],
  },
  {
    name: 'Marta Ribeiro',
    location: 'Braga',
    time: 'anteontem',
    stars: 5,
    tags: ['acabamento', 'como nas fotos'],
    title: 'Fez uma diferença enorme na sala',
    body: 'Pusemos atrás da TV e o espaço deixou logo de parecer tão vazio. O meu marido tratou da montagem num sábado, sem precisarmos de contratar ninguém. Só aconselho a medir tudo com calma antes do primeiro corte 😅',
    photos: [panelImage('r5.webp'), panelImage('review-marta-side-v2.webp'), panelImage('review-marta-detail-v2.webp')],
  },
  {
    name: 'Tiago Sousa',
    location: 'Coimbra',
    time: 'há 4 dias',
    stars: 5,
    tags: ['instalação fácil', 'entrega cuidada'],
    title: 'Preço excelente comparado com outras lojas',
    body: 'Com a promoção, ficou-me por pouco mais de 50 €. Vi painéis semelhantes noutros sites por quase o dobro e decidi experimentar estes. Nunca tinha feito este tipo de montagem, mas numa tarde ficou pronto e a qualidade surpreendeu-me pela positiva.',
    photos: [panelImage('r7.webp'), panelImage('review-tiago-detail-v2.webp')],
  },
  {
    name: 'Ana Ferreira',
    location: 'Setúbal',
    time: 'há 1 semana',
    stars: 5,
    tags: ['acabamento', 'como nas fotos', 'entrega cuidada'],
    title: 'A entrada parece outra',
    body: 'Colocámos só numa parede do hall para não pesar demasiado e ficou com muito mais pinta. A encomenda chegou sem estragos, os cantos vinham protegidos e recebemos as atualizações do envio até à entrega.',
    photos: [panelImage('r9.webp'), panelImage('review-ana-side-v2.webp'), panelImage('review-ana-detail-v2.webp')],
  },
];

const generatedReviewPhotos = [
  [panelImage('reviews/customer-review-01.webp')],
  [panelImage('reviews/customer-review-02.webp')],
  [panelImage('reviews/customer-review-03.webp')],
  [panelImage('reviews/customer-review-04.webp')],
  [panelImage('reviews/customer-review-05.webp')],
  [panelImage('reviews/customer-review-06.webp')],
  [panelImage('reviews/customer-review-07.webp')],
  [panelImage('reviews/customer-review-08.webp')],
  [panelImage('reviews/customer-review-09.webp'), panelVideo('reviews/customer-review-09.mp4')],
  [panelImage('reviews/customer-review-10-01.webp'), panelImage('reviews/customer-review-10-02.webp')],
  [panelImage('reviews/customer-review-11-01.webp'), panelImage('reviews/customer-review-11-02.webp'), panelImage('reviews/customer-review-11-03.webp')],
  [panelImage('reviews/customer-review-12.webp')],
  [panelImage('reviews/customer-review-13.webp')],
  [panelImage('reviews/customer-review-14.webp')],
  [panelImage('reviews/customer-review-15.webp')],
  [panelImage('reviews/customer-review-16.webp')],
  [panelImage('reviews/customer-review-17-01.webp'), panelImage('reviews/customer-review-17-04.webp')],
];

const firstNames = ['Miguel', 'Sofia', 'Rui', 'Mariana', 'Pedro', 'Catarina', 'André', 'Beatriz', 'Nuno', 'Teresa', 'Diogo', 'Filipa', 'Ricardo', 'Mafalda', 'Bruno', 'Leonor', 'Gonçalo', 'Sara', 'Vasco', 'Patrícia'];
const lastNames = ['Almeida', 'Costa', 'Rodrigues', 'Pereira', 'Silva', 'Oliveira', 'Correia', 'Fernandes', 'Gomes', 'Lopes', 'Moreira', 'Nunes', 'Ramos', 'Teixeira', 'Vieira', 'Monteiro', 'Cardoso', 'Mendes', 'Marques', 'Pinto'];
const locations = ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Aveiro', 'Leiria', 'Setúbal', 'Viseu', 'Guimarães', 'Faro', 'Cascais', 'Sintra', 'Matosinhos', 'Vila Nova de Gaia', 'Évora', 'Torres Vedras'];

const reviewScenarios = [
  { title: 'Ficou mesmo bem', body: 'Comprei para a parede da televisão e gostei bastante do resultado. Ao vivo tem um ar menos “perfeito” do que nas imagens, no bom sentido, parece mais madeira e menos plástico.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Boa compra, sem dúvida', body: 'Chegou tudo em condições e dentro do prazo. Ainda só montámos metade, mas já se percebe que vai ficar mt giro. Depois ponho fotografia do resultado final.', tags: ['entrega cuidada', 'acabamento'] },
  { title: 'A sala ganhou outra graça', body: 'Não queria revestir a parede toda, por isso fizemos apenas uma faixa larga atrás do móvel. Resultou muito bem e não carregou o espaço.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Montagem tranquila', body: 'Foi a primeira vez que trabalhei com este material. Com uma serra decente e cola de montagem faz-se bem. O primeiro painel demorou, os restantes foram num instante.', tags: ['instalação fácil'] },
  { title: 'Gostei mais ao vivo', body: 'Nas fotos já parecia bonito, mas a textura só se percebe mesmo de perto. Apanha a luz da janela de maneira diferente ao longo do dia. Estamos contentes.', tags: ['como nas fotos', 'acabamento'] },
  { title: 'Resolveu o eco q.b.', body: 'Comprei sobretudo pela parte estética, mas notei diferença no eco da sala. Não faz milagres, claro, só que já não se ouve aquele som tão vazio.', tags: ['acabamento'] },
  { title: 'Tudo impecável', body: 'A transportadora ligou antes de entregar e as caixas vieram sem uma única mossa. Confirmei as peças todas e estavam direitas. Serviço 5 estrelas.', tags: ['entrega cuidada'] },
  { title: 'Bonito, mas convém ter ajuda', body: 'O painel é fácil de cortar, mas sozinho achei difícil segurá-lo direito enquanto colava. Com outra pessoa foi rápido. No fim ficou impecável.', tags: ['instalação fácil', 'acabamento'] },
  { title: 'Era o toque que faltava', body: 'A nossa sala era toda branca e um bocado sem graça. Fizemos esta parede num fim de semana e parece que trocámos de casa. Adorámos.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Cor muito fiel', body: 'Tive dúvidas por causa do ecrã do telemóvel, mas o tom que chegou é praticamente o mesmo das fotografias. Combina lindamente com o nosso chão claro.', tags: ['como nas fotos'] },
  { title: 'Bom acabamento', body: 'As ripas vieram bem coladas e com espaçamento certo. Numa das extremidades tive de acertar dois milímetros, nada de preocupante. O resultado ficou muito limpo.', tags: ['acabamento'] },
  { title: 'Recomendo medir com calma', body: 'O produto é bom. O único erro foi meu: fiz as contas demasiado à justa e faltou-me uma tira. Pedi mais uma unidade e chegou depressa.', tags: ['entrega cuidada', 'instalação fácil'] },
  { title: 'Quarto muito mais acolhedor', body: 'Usámos como cabeceira até ao teto. Ficou simples e confortável, exatamente como queríamos. Até a luz dos candeeiros parece mais quente agora.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Valeu a espera', body: 'A encomenda atrasou dois dias por causa da transportadora, daí as 4 estrelas. Tirando isso, veio bem protegida e o material corresponde totalmente.', tags: ['entrega cuidada', 'como nas fotos'], stars: 4 },
  { title: 'Fácil de limpar', body: 'Já está montado há quase dois meses. Passo um pano ou o aspirador com escova macia e continua como novo, mesmo tendo um gato em casa.', tags: ['acabamento'] },
  { title: 'Fizemos nós próprios', body: 'Eu e a minha mulher nunca tínhamos montado painéis. Vimos as instruções, começámos pelo canto e correu bem. Não ficou 100% perfeito, mas ficou nosso e gostamos muito.', tags: ['instalação fácil'] },
  { title: 'Disfarçou a porta muito bem', body: 'A ideia era dar continuidade entre a parede e uma porta lisa. Foi preciso paciência para alinhar as ripas, mas agora a porta quase desaparece quando fecha.', tags: ['acabamento', 'instalação fácil'] },
  { title: 'Boa relação qualidade/preço', body: 'Comparei várias opções antes de encomendar. Esta pareceu-me a mais equilibrada e não desiludiu. Material sólido, bonito e sem aquele brilho artificial.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Chegou tudo direitinho', body: 'Quatro volumes para Gaia, entregues à hora combinada. As proteções dos cantos fizeram o seu trabalho. Já montámos e não houve qualquer peça danificada.', tags: ['entrega cuidada'] },
  { title: 'Resultado brutal', body: 'Sinceramente, não esperava que mudasse tanto o espaço. Pusemos umas fitas LED por cima e à noite fica brutal. Os miúdos também aprovaram 😄', tags: ['acabamento'] },
  { title: 'O recorte das tomadas dá trabalho', body: 'Os painéis em si montam-se bem. A parte mais chata foi marcar duas tomadas e fazer os recortes certos. Quem não tiver ferramenta talvez deva pedir ajuda.', tags: ['instalação fácil'] },
  { title: 'Muito satisfeita', body: 'Escolhi o tom depois de pedir uma amostra. Ainda bem, porque com a luz da minha sala fica um bocadinho mais escuro. Montado, ficou lindíssimo.', tags: ['como nas fotos', 'acabamento'] },
  { title: 'Dá logo outro ar', body: 'Só revesti a parede pequena do hall. Não parece uma grande obra, mas toda a gente que entra pergunta onde comprámos. Para nós, ficou no ponto.', tags: ['acabamento'] },
  { title: 'Sem dramas na instalação', body: 'Nível, fita métrica, cola e serra. Foi basicamente isso. Convém confirmar o prumo da parede antes de começar porque a minha estava ligeiramente torta.', tags: ['instalação fácil'] },
  { title: 'Aprovado cá em casa', body: 'Eu queria madeira, ele achava que ia ficar pesado. Acabámos por fazer meia parede e foi o compromisso ideal. Ficou moderno sem parecer um hotel.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Boa assistência antes da compra', body: 'Mandei as medidas pelo apoio e ajudaram-me a calcular a quantidade com margem para os cortes. Sobrou muito pouco, portanto as contas estavam certas.', tags: ['entrega cuidada', 'instalação fácil'] },
  { title: 'Bonito de perto e de longe', body: 'O veio não fica a repetir de forma óbvia entre painéis, que era o maior receio. À distância parece uma parede feita à medida.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Quase perfeito', body: 'Um dos painéis tinha uma pequena marca numa ponta, mas essa zona acabou por ser cortada. De resto, excelente aspeto e montagem relativamente simples.', tags: ['acabamento', 'instalação fácil'], stars: 4 },
  { title: 'Transformou o escritório', body: 'Nas videochamadas já me perguntaram várias vezes se mudei de espaço. O fundo ficou mais cuidado e também sinto menos reverberação na divisão.', tags: ['acabamento'] },
  { title: 'Compra acertada', body: 'Encomendei com algum receio porque não conhecia a loja. Correu tudo bem: confirmação rápida, seguimento da encomenda e material igual ao anunciado.', tags: ['entrega cuidada', 'como nas fotos'] },
  { title: 'Ficou top!', body: 'Montámos no domingo e foi mais fácil do que pensávamos. A última peça exigiu um corte mais fino, mas tirando isso foi sempre a andar.', tags: ['instalação fácil', 'acabamento'] },
  { title: 'Gostei, sem exageros', body: 'É um produto bem conseguido e faz aquilo que promete. Não é isolamento acústico, mas torna a divisão mais agradável e o acabamento é bastante bom.', tags: ['acabamento'] },
  { title: 'Perfeito para o patamar', body: 'A parede da escada estava sempre marcada. Com o ripado ficou protegida e visualmente muito mais interessante. Deu trabalho nos cortes dos degraus, mas compensou.', tags: ['acabamento', 'instalação fácil'] },
  { title: 'Finalmente montado', body: 'As caixas ficaram uma semana na garagem até termos tempo 😅 Montámos ontem e estamos mesmo contentes. Não é complicado, só pede alguma paciência.', tags: ['instalação fácil'] },
  { title: 'Aspeto bastante natural', body: 'Estava com medo de parecer imitação barata, mas não. A textura é mate e o relevo ajuda muito. Sob luz natural fica particularmente bonito.', tags: ['como nas fotos', 'acabamento'] },
  { title: 'Cumpriu', body: 'Entrega rápida, medidas certas e montagem sem surpresas. Para ser perfeito, gostava que viesse com uma pequena peça de teste para experimentar o corte.', tags: ['entrega cuidada', 'instalação fácil'], stars: 4 },
  { title: 'Sala de jantar renovada', body: 'Aplicámos apenas atrás da mesa e combinou muito bem com os móveis que já tínhamos. Foi uma mudança pequena com bastante impacto.', tags: ['acabamento', 'como nas fotos'] },
  { title: 'Bom produto e bom apoio', body: 'Tive uma dúvida sobre a cola adequada à minha parede e responderam no próprio dia. Segui a indicação e, três semanas depois, está tudo firme.', tags: ['instalação fácil'] },
  { title: 'A fotografia não engana', body: 'É raro comprar decoração online e receber exatamente o tom esperado. Neste caso foi mesmo isso. Talvez até seja mais bonito ao vivo.', tags: ['como nas fotos'] },
  { title: 'Muito porreiro', body: 'Usei as sobras para fazer uma faixa junto à secretária e não desperdicei quase nada. Ficou tudo com o mesmo ar e deu um acabamento porreiro ao quarto.', tags: ['acabamento', 'instalação fácil'] },
] satisfies Array<{ title: string; body: string; tags: string[]; stars?: number }>;

const reviewFollowUps = [
  '',
  'Passadas algumas semanas, continua tudo firme.',
  'Voltaria a comprar sem problema.',
  'Cá em casa, foi aprovado por todos.',
  'Até agora, estamos bastante satisfeitos.',
  'Já houve quem perguntasse onde comprámos.',
  'Para quem estiver na dúvida: vale a pena pedir uma amostra primeiro.',
  'O resultado final compensou bem o trabalho.',
  'As fotografias ajudam, mas ao vivo percebe-se melhor a textura.',
  'Se voltar a fazer noutra divisão, já sei como começar.',
  'No geral, correspondeu ao que esperava.',
  'Foi uma mudança simples, mas nota-se logo.',
  'Recomendava apenas ter as ferramentas preparadas antes de começar.',
];

const generatedReviews = Array.from({ length: 215 }, (_, index): PanelReview => {
  const scenario = reviewScenarios[index % reviewScenarios.length];
  const followUp = reviewFollowUps[(index * 7 + Math.floor(index / reviewScenarios.length)) % reviewFollowUps.length];
  const weeksAgo = Math.floor(index / 7) + 2;

  return {
    id: `pt-review-${index + 1}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 7 + Math.floor(index / firstNames.length)) % lastNames.length]}`,
    location: locations[(index * 5) % locations.length],
    time: index < 7 ? `há ${index + 8} dias` : `há ${weeksAgo} semanas`,
    stars: scenario.stars ?? (index % 11 === 0 ? 4 : 5),
    tags: scenario.tags,
    title: scenario.title,
    body: followUp ? `${scenario.body} ${followUp}` : scenario.body,
    photos: generatedReviewPhotos[index] ?? [],
  };
});

export const PANEL_REVIEWS: PanelReview[] = [...featuredReviews, ...generatedReviews];
export const PANEL_REVIEW_TOTAL = PANEL_REVIEWS.length;
export const PANEL_REVIEWS_WITH_PHOTOS = PANEL_REVIEWS.filter((review) => review.photos.length > 0).length;

export function isPanelVideo(src: string) {
  return /\.(mp4|webm|mov)$/i.test(src);
}

export type PanelReviewGalleryItem = {
  src: string;
  poster?: string;
  review: PanelReview;
  reviewIndex: number;
  reviewImageIndex: number;
  isVideo: boolean;
};

export const PANEL_REVIEW_GALLERY: PanelReviewGalleryItem[] = PANEL_REVIEWS.flatMap((review, reviewIndex) =>
  review.photos.map((src, reviewImageIndex) => ({
    src,
    poster: isPanelVideo(src) ? panelImage('reviews/customer-review-09.webp') : undefined,
    review,
    reviewIndex,
    reviewImageIndex,
    isVideo: isPanelVideo(src),
  })),
);

export const PANEL_REVIEW_THUMBS = PANEL_REVIEW_GALLERY.map((item) => item.src);

export function campaignEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}
