// All content data for the Nuralta Interiores clone (European Portuguese, verbatim)

export const TICKER_ITEMS = [
  "Envio gratuito para Portugal Continental",
  "Pagamento seguro com Cartão · Apple Pay · MB WAY · Multibanco",
  "Entrega em 3 a 7 dias úteis",
  "Nuralta Interiores",
];

export type ColorOption = {
  name: string;
  src: string;
};

export const COLORS: ColorOption[] = [
  { name: "Carvalho", src: "/pt/images/img1.webp" },
  { name: "Carvalho Claro", src: "/pt/images/var2.webp" },
  { name: "Preto", src: "/pt/images/var3.webp" },
  { name: "Cinza", src: "/pt/images/var4.webp" },
  { name: "Nogueira", src: "/pt/images/var5.webp" },
  { name: "Marfim", src: "/pt/images/var6.webp" },
  { name: "Grafite", src: "/pt/images/var7.webp" },
];

export type SizeOption = {
  id: string;
  label: string;
  price: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export const SIZES: SizeOption[] = [
  { id: "240x60", label: "240 × 60 cm", price: "5,00 € / unidade" },
  { id: "260x70", label: "260 × 70 cm", price: "9,00 € / unidade" },
  { id: "270x80", label: "270 × 80 cm", price: "13,00 € / unidade" },
  {
    id: "270x110",
    label: "270 × 110 cm",
    price: "",
    disabled: true,
    disabledLabel: "Esgotado",
  },
];

export type GalleryItem = {
  type: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
  ariaLabel: string;
};

export const GALLERY: GalleryItem[] = [
  { type: "image", src: "/pt/images/img2.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 1" },
  {
    type: "video",
    src: "/pt/videos/video-painel-produto.mp4",
    poster: "/pt/images/video-painel-produto-poster.webp",
    alt: "Vídeo do produto",
    ariaLabel: "Reproduzir vídeo do produto",
  },
  { type: "image", src: "/pt/images/img3.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 3" },
  { type: "image", src: "/pt/images/img4.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 4" },
  { type: "image", src: "/pt/images/img5.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 5" },
  { type: "image", src: "/pt/images/img6.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 6" },
  { type: "image", src: "/pt/images/img7.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 7" },
  { type: "image", src: "/pt/images/img8.webp", alt: "Painel Carvalho", ariaLabel: "Ver imagem 8" },
];

export type DetailGroup = {
  number: string;
  title: string;
  subtitle: string;
  rows: { dt: string; dd: string }[];
};

export const DETAILS: DetailGroup[] = [
  {
    number: "01",
    title: "Medidas e cobertura",
    subtitle: "Dimensões, área e peso",
    rows: [
      { dt: "Dimensões", dd: "Escolha uma medida acima" },
      { dt: "Área por painel", dd: "1,44 a 2,97 m², consoante a medida" },
      { dt: "Espessura total", dd: "6 mm" },
      { dt: "Ripas", dd: "3,5 cm de largura · 2 cm de intervalo" },
      { dt: "Peso", dd: "Varia consoante a medida; confirme com o apoio antes da compra" },
    ],
  },
  {
    number: "02",
    title: "Materiais e acabamento",
    subtitle: "Composição e desempenho acústico",
    rows: [
      { dt: "Material de base", dd: "MDF com revestimento decorativo mate" },
      { dt: "Desempenho acústico", dd: "Ajuda a reduzir a reverberação; sem classificação certificada publicada" },
    ],
  },
  {
    number: "03",
    title: "Instalação e acessórios",
    subtitle: "O que recebe e como aplicar",
    rows: [
      { dt: "Conteúdo", dd: "1 painel; cola e elementos de fixação não incluídos" },
      { dt: "Fixação", dd: "Cola de montagem ou fixação mecânica adequada à parede" },
      { dt: "Rendimento da cola", dd: "1 kit recomendado por cada 3 painéis" },
      { dt: "Superfícies", dd: "Paredes interiores sólidas, limpas, secas e niveladas" },
    ],
  },
  {
    number: "04",
    title: "Cuidados e garantia",
    subtitle: "Utilização, embalagem e garantia",
    rows: [
      { dt: "Zonas húmidas", dd: "Apenas no interior e sem contacto direto com água ou vapor" },
      { dt: "Embalagem", dd: "Proteção de transporte nas faces e nos cantos" },
      { dt: "Garantia", dd: "1 ano" },
    ],
  },
];

export type Review = {
  name: string;
  location: string;
  time: string;
  title: string;
  body: string;
  photos: string[];
};

export const REVIEWS: Review[] = [
  {
    name: "João Martins",
    location: "Lisboa",
    time: "hoje às 06:28",
    title: "Muito bom pelo preço que paguei",
    body: "Paguei 56 € pela quantidade de que precisava para a parede da TV. Antes de encomendar, comparei com duas lojas e opções muito parecidas ficavam bastante mais caras. Pelo preço, superou mesmo as expectativas e o resultado ficou excelente.",
    photos: [
      "/pt/images/r1.webp",
      "/pt/images/review-joao-side-v2.webp",
      "/pt/images/review-joao-detail-v2.webp",
    ],
  },
  {
    name: "Inês Carvalho",
    location: "Porto",
    time: "ontem",
    title: "Bonitos e bem embalados",
    body: "Chegaram todos direitinhos e com os cantos bem protegidos. Tinha algum receio de escolher a cor pela internet, mas é bastante fiel às fotografias e não tem aquele brilho artificial. Para já, nada a apontar.",
    photos: ["/pt/images/r2.webp"],
  },
  {
    name: "Marta Ribeiro",
    location: "Braga",
    time: "anteontem",
    title: "Fez uma diferença enorme na sala",
    body: "Pusemos atrás da TV e o espaço deixou logo de parecer tão vazio. O meu marido tratou da montagem num sábado, sem precisarmos de contratar ninguém. Só aconselho a medir tudo com calma antes do primeiro corte 😅",
    photos: [
      "/pt/images/r5.webp",
      "/pt/images/review-marta-side-v2.webp",
      "/pt/images/review-marta-detail-v2.webp",
    ],
  },
  {
    name: "Tiago Sousa",
    location: "Coimbra",
    time: "há 4 dias",
    title: "Preço excelente comparado com outras lojas",
    body: "Com a promoção, ficou-me por pouco mais de 50 €. Vi painéis semelhantes noutros sites por quase o dobro e decidi experimentar estes. Nunca tinha feito este tipo de montagem, mas numa tarde ficou pronto e a qualidade surpreendeu-me pela positiva.",
    photos: ["/pt/images/r7.webp", "/pt/images/review-tiago-detail-v2.webp"],
  },
  {
    name: "Ana Ferreira",
    location: "Setúbal",
    time: "há 1 semana",
    title: "A entrada parece outra",
    body: "Colocámos só numa parede do hall para não pesar demasiado e ficou com muito mais pinta. A encomenda chegou sem estragos, os cantos vinham protegidos e recebemos as atualizações do envio até à entrega.",
    photos: [
      "/pt/images/r9.webp",
      "/pt/images/review-ana-side-v2.webp",
      "/pt/images/review-ana-detail-v2.webp",
    ],
  },
];

// 36-thumbnail review gallery (with reviewer attribution)
export type ReviewThumb = {
  src: string;
  alt: string;
  isVideo?: boolean;
};

export const REVIEW_THUMBS: ReviewThumb[] = [
  { src: "/pt/images/r1.webp", alt: "Projeto de João Martins, Lisboa" },
  { src: "/pt/images/review-joao-side-v2.webp", alt: "Projeto de João Martins, Lisboa" },
  { src: "/pt/images/review-joao-detail-v2.webp", alt: "Projeto de João Martins, Lisboa" },
  { src: "/pt/images/r2.webp", alt: "Projeto de Inês Carvalho, Porto" },
  { src: "/pt/images/r5.webp", alt: "Projeto de Marta Ribeiro, Braga" },
  { src: "/pt/images/review-marta-side-v2.webp", alt: "Projeto de Marta Ribeiro, Braga" },
  { src: "/pt/images/review-marta-detail-v2.webp", alt: "Projeto de Marta Ribeiro, Braga" },
  { src: "/pt/images/r7.webp", alt: "Projeto de Tiago Sousa, Coimbra" },
  { src: "/pt/images/review-tiago-detail-v2.webp", alt: "Projeto de Tiago Sousa, Coimbra" },
  { src: "/pt/images/r9.webp", alt: "Projeto de Ana Ferreira, Setúbal" },
  { src: "/pt/images/review-ana-side-v2.webp", alt: "Projeto de Ana Ferreira, Setúbal" },
  { src: "/pt/images/review-ana-detail-v2.webp", alt: "Projeto de Ana Ferreira, Setúbal" },
  { src: "/pt/images/reviews/customer-review-01.webp", alt: "Projeto de Miguel Almeida, Lisboa" },
  { src: "/pt/images/reviews/customer-review-02.webp", alt: "Projeto de Sofia Fernandes, Leiria" },
  { src: "/pt/images/reviews/customer-review-03.webp", alt: "Projeto de Rui Vieira, Cascais" },
  { src: "/pt/images/reviews/customer-review-04.webp", alt: "Projeto de Mariana Costa, Torres Vedras" },
  { src: "/pt/images/reviews/customer-review-05.webp", alt: "Projeto de Pedro Gomes, Aveiro" },
  { src: "/pt/images/reviews/customer-review-06.webp", alt: "Projeto de Catarina Monteiro, Faro" },
  { src: "/pt/images/reviews/customer-review-07.webp", alt: "Projeto de André Rodrigues, Évora" },
  { src: "/pt/images/reviews/customer-review-08.webp", alt: "Projeto de Beatriz Lopes, Coimbra" },
  { src: "/pt/images/reviews/customer-review-09.webp", alt: "Projeto de Nuno Cardoso, Guimarães" },
  { src: "/pt/videos/reviews/customer-review-09.mp4", alt: "Projeto de Nuno Cardoso, Guimarães", isVideo: true },
  { src: "/pt/images/reviews/customer-review-10-01.webp", alt: "Projeto de Teresa Pereira, Vila Nova de Gaia" },
  { src: "/pt/images/reviews/customer-review-10-02.webp", alt: "Projeto de Teresa Pereira, Vila Nova de Gaia" },
  { src: "/pt/images/reviews/customer-review-11-01.webp", alt: "Projeto de Diogo Moreira, Braga" },
  { src: "/pt/images/reviews/customer-review-11-02.webp", alt: "Projeto de Diogo Moreira, Braga" },
  { src: "/pt/images/reviews/customer-review-11-03.webp", alt: "Projeto de Diogo Moreira, Braga" },
  { src: "/pt/images/reviews/customer-review-12.webp", alt: "Projeto de Filipa Mendes, Viseu" },
  { src: "/pt/images/reviews/customer-review-13.webp", alt: "Projeto de Ricardo Silva, Matosinhos" },
  { src: "/pt/images/reviews/customer-review-14.webp", alt: "Projeto de Mafalda Nunes, Porto" },
  { src: "/pt/images/reviews/customer-review-15.webp", alt: "Projeto de Bruno Marques, Setúbal" },
  { src: "/pt/images/reviews/customer-review-16.webp", alt: "Projeto de Leonor Oliveira, Sintra" },
  { src: "/pt/images/reviews/customer-review-17-01.webp", alt: "Projeto de Gonçalo Ramos, Lisboa" },
  { src: "/pt/images/reviews/customer-review-17-02.webp", alt: "Projeto de Gonçalo Ramos, Lisboa" },
  { src: "/pt/images/reviews/customer-review-17-03.webp", alt: "Projeto de Gonçalo Ramos, Lisboa" },
  { src: "/pt/images/reviews/customer-review-17-04.webp", alt: "Projeto de Gonçalo Ramos, Lisboa" },
];

export type Faq = {
  number: string;
  question: string;
  answer: string;
};

export const FAQS: Faq[] = [
  {
    number: "01",
    question: "Porque conseguem oferecer este preço?",
    answer:
      "Temos fabrico próprio e vendemos diretamente ao cliente. Compramos a matéria-prima aos fornecedores e produzimos os painéis com a nossa equipa, reduzindo etapas entre a produção e a venda. É esta forma de trabalhar que nos permite oferecer preços mais acessíveis.",
  },
  {
    number: "02",
    question: "A que painel corresponde o preço desde 5,00 €?",
    answer:
      "O preço desde 5,00 € corresponde ao painel de 240 × 60 cm. Os restantes tamanhos têm preços diferentes, apresentados junto a cada opção de medida.",
  },
  {
    number: "03",
    question: "Como é feita a instalação?",
    answer:
      "A instalação é feita com cola de montagem ou fixação mecânica adequada à parede. Recomendamos 1 kit de cola por cada 3 painéis. A superfície deve ser sólida, limpa, seca e nivelada.",
  },
  {
    number: "04",
    question: "Posso cortar o painel à medida?",
    answer:
      "Sim. O painel pode ser cortado à medida com ferramenta adequada para MDF, permitindo adaptar a dimensão ao seu espaço.",
  },
  {
    number: "05",
    question: "Como calculo a quantidade necessária?",
    answer:
      "Meça a área da parede que pretende revestir e divida pela área de um painel (1,44 a 2,97 m², consoante a medida). Se precisar de ajuda, confirme com o nosso apoio antes da compra.",
  },
  {
    number: "06",
    question: "Quais são as medidas disponíveis?",
    answer:
      "Estão disponíveis as medidas 240 × 60 cm, 260 × 70 cm, 270 × 80 cm e 270 × 110 cm. Algumas medidas podem estar temporariamente esgotadas.",
  },
  {
    number: "07",
    question: "O painel ajuda na acústica?",
    answer:
      "O painel ajuda a reduzir a reverberação do som no espaço, embora não tenha classificação acústica certificada publicada.",
  },
  {
    number: "08",
    question: "Quanto tempo demora a entrega?",
    answer:
      "A entrega é feita em 3 a 7 dias úteis, com envio gratuito para Portugal Continental e acompanhamento pela Nuralta.",
  },
  {
    number: "09",
    question: "E se o produto chegar danificado?",
    answer:
      "Os painéis são expedidos com proteção nas faces e nos cantos. Se, ainda assim, chegar danificado, contacte o nosso apoio para substituição atempada.",
  },
  {
    number: "10",
    question: "Posso devolver se mudar de opinião?",
    answer:
      "Sim. Pode devolver o produto de acordo com a nossa política de troca e devolução. Consulte a informação legal no rodapé da página.",
  },
];

export const PAYMENT_METHODS = [
  { src: "/pt/payment-methods/visa.svg", alt: "Visa", width: 40 },
  { src: "/pt/payment-methods/mastercard.svg", alt: "Mastercard", width: 34 },
  { src: "/pt/payment-methods/apple-pay.svg", alt: "Apple Pay", width: 43 },
  { src: "/pt/payment-methods/mb-way.svg", alt: "MB WAY", width: 50 },
  { src: "/pt/payment-methods/multibanco.svg", alt: "Multibanco", width: 24 },
];
