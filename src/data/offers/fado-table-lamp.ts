import type { OfferConfig } from '@/lib/offers/types';

export const fadoTableLampOffer: OfferConfig = {
  slug: 'fado-table-lamp',
  productSlug: 'ikea-fado-candeeiro-mesa-branco',
  markets: ['PT'],
  announcement: 'Uma nova luz para a sua casa.',
  eyebrow: 'IKEA · FADO · Branco',
  headline: 'Ligue a luz.\nMude o ambiente.',
  subheadline: 'Um globo de vidro branco, linhas simples e uma luz que convida a ficar. Conheça o FADO.',
  valueProposition: {
    title: 'Pequenos rituais. Uma luz só sua.',
    body: 'Ao lado do sofá, na mesa de cabeceira ou naquele canto que merece mais atenção. Há sempre espaço para tornar a casa mais acolhedora.',
  },
  transformation: {
    title: 'A casa muda quando a luz muda.',
    body: 'O vidro branco suaviza a luz e dá outra presença ao espaço. Acenda o FADO e crie um canto para abrandar, conversar ou simplesmente estar.',
    image: '/images/offers/fado/living-room.webp',
  },
  benefits: [
    { title: 'Luz suave e difusa', body: 'O globo em vidro branco distribui a luz de forma suave pelo ambiente.' },
    { title: 'Design que encontra o seu lugar', body: 'Uma forma redonda e simples para a sala, o quarto ou o escritório.' },
    { title: 'Escolha a sua luz', body: 'Use uma lâmpada LED E27 opala. A lâmpada é vendida separadamente.' },
  ],
  why: {
    title: 'Simples por fora. Acolhedor por dentro.',
    body: 'O FADO combina uma forma essencial com a textura do vidro branco.',
    points: ['Globo de vidro branco', '25 cm de diâmetro', 'Casquilho E27'],
  },
  installation: [
    { title: 'Escolha o seu canto', body: 'Coloque o candeeiro numa superfície plana e estável, perto de uma tomada.' },
    { title: 'Adicione uma lâmpada E27', body: 'Siga as instruções de montagem. A IKEA recomenda LED globo opala branco, vendido separadamente.' },
    { title: 'Acenda e abrande', body: 'Ligue o candeeiro e desfrute de uma iluminação ambiente suave.' },
  ],
  inspirationImages: ['/images/offers/fado/reading-corner.webp', '/images/offers/fado/sideboard.webp', '/images/offers/fado/evening.webp'],
  reviews: { mode: 'none' },
  faqs: [
    { question: 'A lâmpada está incluída?', answer: 'O candeeiro FADO a 13,99 € é vendido sem lâmpada. O kit a 20,99 € inclui o FADO branco, uma lâmpada WiZ A60 RGB E27 e um comando físico. A lâmpada WiZ com comando à parte custa 9 €. No kit, poupa 2 € face à compra das peças em separado.' },
    { question: 'Quais são as medidas?', answer: 'O candeeiro tem 25 cm de diâmetro, 24 cm de altura e um cabo de 1,8 m.' },
    { question: 'O FADO muda de cor ou regula a intensidade?', answer: 'O candeeiro sozinho não inclui essas funções. Com a WiZ A60 RGB do kit, pode escolher entre 16 milhões de cores, ajustar o branco de 2200 a 6500 K e regular o brilho pela aplicação WiZ ou pelo comando incluído. Liga-se por Wi-Fi, sem hub.' },
    { question: 'De que materiais é feito?', answer: 'O abajur é de vidro branco e a base é de plástico de polipropileno. O design é da IKEA of Sweden.' },
    { question: 'Como devo limpar o candeeiro?', answer: 'Desligue o candeeiro e limpe com um espanador. Manuseie o globo de vidro com cuidado e siga as instruções do fabricante.' },
    { question: 'Qual é a referência desta versão?', answer: 'A oferta corresponde à versão portuguesa FADO branco, referência IKEA 800.963.72, com casquilho E27.' },
    { question: 'Como funciona a entrega?', answer: 'A entrega em Portugal é realizada por CTT Express. O destino, os portes e o prazo são confirmados no checkout antes do pagamento. Esta oferta é apresentada em euros.' },
    { question: 'E se chegar danificado ou precisar de devolver?', answer: 'Fotografe o produto e a embalagem e contacte o apoio E-com.casa. Consulte as políticas de envios e devoluções da nossa loja para conhecer as condições aplicáveis.' },
  ],
  finalCta: { title: 'O seu novo canto favorito começa aqui.', body: 'FADO branco. Uma forma simples de dar outra luz à casa.', button: 'Adicionar ao carrinho' },
  seo: { title: 'FADO — Candeeiro de mesa branco, 25 cm', description: 'FADO branco por 13,99 € ou kit FADO + WiZ A60 RGB com comando por 20,99 €. Vidro branco, 25 cm e casquilho E27. E-com.casa.' },
};
