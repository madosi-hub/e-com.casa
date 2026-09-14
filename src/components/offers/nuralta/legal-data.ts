// Legal & institutional content for Nuralta Interiores (European Portuguese)
// All pages rendered inside a modal on the single "/" route (no extra routes).

export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "address"; lines: string[] }
  | { kind: "external"; label: string; href: string };

export type LegalPage = {
  id: string;
  title: string;
  subtitle?: string;
  updated?: string;
  blocks: LegalBlock[];
};

export const LEGAL_PAGES: LegalPage[] = [
  // ENVIO
  {
    id: "envio",
    title: "Envio e entregas",
    subtitle: "Condições de expedição, prazos e logística",
    updated: "Atualizado em janeiro de 2026",
    blocks: [
      {
        kind: "p",
        text: "Esta página explica como preparamos, expedimos e entregamos as suas encomendas de painéis ripados decorativos Nuralta, bem como os prazos previstos e os centros logísticos utilizados.",
      },
      { kind: "h3", text: "Prazos de entrega" },
      {
        kind: "ul",
        items: [
          "Portugal Continental: 3 a 7 dias úteis após confirmação do pagamento.",
          "Portugal Insular (Madeira e Açores): 5 a 10 dias úteis, sujeito a transporte marítimo.",
          "Espanha e restante União Europeia: 5 a 12 dias úteis, consoante o destino.",
          "Os prazos contam-se em dias úteis e iniciam-se após confirmação do pagamento e do stock.",
        ],
      },
      { kind: "h3", text: "Envio gratuito" },
      {
        kind: "p",
        text: "O envio é gratuito para Portugal Continental em todas as encomendas. Para outros destinos, o custo de envio é calculado e apresentado no checkout, antes do pagamento.",
      },
      { kind: "h3", text: "Acompanhamento da encomenda" },
      {
        kind: "p",
        text: "Após a expedição, enviamos um e-mail com o número de seguimento. Pode acompanhar o estado da entrega através do site do transportador ou contactando o nosso apoio.",
      },
      { kind: "h3", text: "Centros logísticos 3PL (União Europeia)" },
      {
        kind: "p",
        text: "Para garantir entregas rápidas e seguras em Portugal e no espaço UE, trabalhamos com parceiros logísticos 3PL nos seguintes centros:",
      },
      {
        kind: "address",
        lines: [
          "Trade Port Nord, Greenport Venlo",
          "Columbusweg / Voltastraat, 5928 Venlo, Países Baixos",
        ],
      },
      {
        kind: "address",
        lines: [
          "Plataforma Logística de Zaragoza (PLAZA)",
          "Calle Turiaso / Calle Bari, 50197 Zaragoza, Espanha",
        ],
      },
      {
        kind: "p",
        text: "As encomendas são expedidas a partir do centro mais próximo do destino, sempre que possível, de forma a reduzir o tempo de trânsito e o impacto ambiental do transporte.",
      },
      { kind: "h3", text: "Receção da encomenda" },
      {
        kind: "ul",
        items: [
          "Verifique o estado da embalagem à chegada e na presença do transportador, sempre que possível.",
          "Caso detete danos visíveis, registe-os no guia de transporte e contacte-nos em 48 horas.",
          "Os painéis são expedidos com proteção nas faces e nos cantos para minimizar danos de transporte.",
        ],
      },
      {
        kind: "external",
        label: "Contactar o apoio sobre entregas",
        href: "mailto:suporte@nuraltainteriores.online",
      },
    ],
  },
  // TROCA E DEVOLUÇÃO
  {
    id: "troca-devolucao",
    title: "Troca e devolução",
    subtitle: "Direito de resolução, prazos e processo",
    updated: "Atualizado em janeiro de 2026",
    blocks: [
      {
        kind: "p",
        text: "Cumprimos a legislação europeia e portuguesa aplicável às vendas à distância. Esta página explica os seus direitos de resolução do contrato, bem como o processo de troca e devolução.",
      },
      { kind: "h3", text: "Direito de resolução (14 dias)" },
      {
        kind: "p",
        text: "Disponde de 14 dias corridos, a contar da receção da encomenda, para exercer o direito de resolução do contrato sem necessidade de indicar motivo. Durante esse período, pode devolver o produto e obter o reembolso do preço de compra e do custo de envio inicial.",
      },
      { kind: "h3", text: "Condições do artigo devolvido" },
      {
        kind: "ul",
        items: [
          "O artigo deve ser devolvido no seu estado original, com a embalagem e acessórios.",
          "Admite-se uma ligeira manipulação para verificação do produto, à semelhança de uma loja física.",
          "Artigos cortados ou modificados à medida não podem ser devolvidos, salvo defeito de fabrico.",
          "Painéis personalizados ou produzidos por encomenda específica estão excluídos do direito de resolução, nos termos da lei.",
        ],
      },
      { kind: "h3", text: "Como pedir uma devolução" },
      {
        kind: "ul",
        items: [
          "Contacte o nosso apoio por e-mail, indicando o número da encomenda e o motivo.",
          "Receberá as instruções de devolução e o endereço do centro logístico a utilizar.",
          "Prepare a embalagem com a proteção original, sempre que possível.",
          "Expeda a devolução no prazo de 14 dias após a comunicação.",
        ],
      },
      { kind: "h3", text: "Endereços de devolução (logística 3PL — UE)" },
      {
        kind: "p",
        text: "As devoluções devem ser enviadas para o centro logístico indicado pelo nosso apoio, em função do seu país. Os centros disponíveis são:",
      },
      {
        kind: "address",
        lines: [
          "Trade Port Nord, Greenport Venlo",
          "Columbusweg / Voltastraat, 5928 Venlo, Países Baixos",
        ],
      },
      {
        kind: "address",
        lines: [
          "Plataforma Logística de Zaragoza (PLAZA)",
          "Calle Turiaso / Calle Bari, 50197 Zaragoza, Espanha",
        ],
      },
      { kind: "h3", text: "Reembolso" },
      {
        kind: "ul",
        items: [
          "O reembolso é processado no prazo de 14 dias após receção e verificação do artigo.",
          "O reembolso é efetuado pelo mesmo meio de pagamento utilizado na compra.",
          "Os custos de devolução ficam a cargo do cliente, salvo em caso de artigo defeituoso ou envio errado.",
        ],
      },
      {
        kind: "external",
        label: "Iniciar uma devolução",
        href: "mailto:suporte@nuraltainteriores.online",
      },
    ],
  },
  // PRIVACIDADE
  {
    id: "privacidade",
    title: "Política de privacidade",
    subtitle: "Tratamento de dados pessoais (RGPD)",
    updated: "Atualizado em janeiro de 2026",
    blocks: [
      {
        kind: "p",
        text: "A Nuralta Interiores respeita a privacidade dos seus clientes e cumpre o Regulamento Geral de Proteção de Dados (RGPD — Regulamento (UE) 2016/679) e a legislação nacional aplicável.",
      },
      { kind: "h3", text: "Responsável pelo tratamento" },
      {
        kind: "p",
        text: "O responsável pelo tratamento dos dados pessoais é a MGJ EXPERT LTD, titular da marca Nuralta Interiores, operada comercialmente através da E-com.casa. Os contactos do responsável encontram-se na página «Dados da empresa».",
      },
      { kind: "h3", text: "Dados recolhidos" },
      {
        kind: "ul",
        items: [
          "Dados de identificação e contacto (nome, e-mail, telefone, morada de entrega/faturação).",
          "Dados de encomenda e pagamento (necessários ao processamento da compra).",
          "Dados de navegação (endereço IP, tipo de dispositivo, páginas visitadas) via cookies e tecnologias similares.",
          "Comunicações com o apoio ao cliente, quando nos contacte.",
        ],
      },
      { kind: "h3", text: "Finalidades do tratamento" },
      {
        kind: "ul",
        items: [
          "Processar e enviar encomendas, gerir devoluções e reembolsos.",
          "Cumprir obrigações legais, fiscais e contabilísticas.",
          "Responder a contactos e prestar apoio ao cliente.",
          "Enviar comunicações comerciais, apenas com o seu consentimento prévio.",
          "Melhorar o site, os produtos e a experiência de compra (estatísticas e análise).",
        ],
      },
      { kind: "h3", text: "Fundamentos jurídicos" },
      {
        kind: "ul",
        items: [
          "Execução de contrato (compras e encomendas).",
          "Cumprimento de obrigações legais (faturação e contabilidade).",
          "Consentimento (newsletters e cookies opcionais).",
          "Interesse legítimo (segurança e melhoria do serviço).",
        ],
      },
      { kind: "h3", text: "Períodos de conservação" },
      {
        kind: "p",
        text: "Conservamos os dados pelo tempo estritamente necessário às finalidades indicadas e, em qualquer caso, durante o período legal aplicável (10 anos para fins fiscais). Os dados de marketing são conservados até retirada do consentimento.",
      },
      { kind: "h3", text: "Partilha com terceiros" },
      {
        kind: "ul",
        items: [
          "Transportadores e parceiros logísticos 3PL (para a entrega).",
          "Prestadores de pagamento (para processar transações).",
          "Prestadores de serviços técnicos (alojamento, análise, e-mail), sob contratos de tratamento.",
          "Autoridades públicas, quando legalmente exigido.",
        ],
      },
      { kind: "h3", text: "Os seus direitos" },
      {
        kind: "ul",
        items: [
          "Acesso, retificação, apagamento e portabilidade dos dados.",
          "Limitação e oposição ao tratamento.",
          "Retirada do consentimento a qualquer momento, sem afetar a licitude do tratamento anterior.",
          "Reclamar junto da autoridade de controlo competente (CNPD — www.cnpd.pt).",
        ],
      },
      {
        kind: "external",
        label: "Exercer os seus direitos por e-mail",
        href: "mailto:suporte@nuraltainteriores.online",
      },
    ],
  },
  // TERMOS DE USO
  {
    id: "termos",
    title: "Termos e condições de uso",
    subtitle: "Condições gerais de utilização e venda",
    updated: "Atualizado em janeiro de 2026",
    blocks: [
      {
        kind: "p",
        text: "Os presentes termos e condições regulam a utilização do site nuraltainteriores.online e a compra de produtos nele disponibilizados. Ao usar o site, aceita ficar vinculado a estas condições.",
      },
      { kind: "h3", text: "Identidade do operador" },
      {
        kind: "p",
        text: "A marca Nuralta Interiores é operada comercialmente pela E-com.casa, propriedade da MGJ EXPERT LTD, registada em England and Wales com o n.º de empresa 17422467. A identificação completa consta na página «Dados da empresa».",
      },
      { kind: "h3", text: "Produtos e preços" },
      {
        kind: "ul",
        items: [
          "Os produtos apresentados no site podem sofrer alterações de especificação, cor ou dimensão.",
          "Os preços incluem IVA à taxa legal em vigor e são apresentados em euros (€).",
          "Reservamo-nos o direito de corrigir erros tipográficos ou de stock. Em caso de erro de preço, contactaremos o cliente antes da expedição.",
          "As imagens são ilustrativas; as cores reais podem variar consoante o ecrã e a iluminação.",
        ],
      },
      { kind: "h3", text: "Encomendas e pagamento" },
      {
        kind: "ul",
        items: [
          "A aceitação da encomenda dá-se com a confirmação de pagamento.",
          "Aceitamos Cartão, Apple Pay, MB WAY e Multibanco.",
          "Os dados de pagamento são processados por prestadores certificados (PCI-DSS).",
          "Reservamo-nos o direito de recusar encomendas em caso de indícios de fraude.",
        ],
      },
      { kind: "h3", text: "Garantia" },
      {
        kind: "p",
        text: "Os painéis beneficiam de uma garantia de 1 ano contra defeitos de fabrico, nos termos legais. A garantia não cobre danos decorrentes de instalação incorreta, humidade, uso impróprio ou desgaste normal.",
      },
      { kind: "h3", text: "Propriedade intelectual" },
      {
        kind: "p",
        text: "Todos os conteúdos do site (textos, imagens, vídeos, logótipos, design) são da titularidade da Nuralta Interiores ou licenciados pelos respetivos titulares. É proibida a reprodução sem autorização prévia e por escrito.",
      },
      { kind: "h3", text: "Lei aplicável e resolução de litígios" },
      {
        kind: "p",
        text: "As presentes condições regem-se pela lei portuguesa e, subsidiariamente, pela lei aplicável ao consumidor no seu país de residência. Em caso de litígio, poderá recorrer à plataforma europeia de resolução de litígios em linha e ao Livro de Reclamações.",
      },
      {
        kind: "external",
        label: "Plataforma europeia de resolução de litígios",
        href: "https://ec.europa.eu/consumers/odr/",
      },
    ],
  },
  // CONTACTO
  {
    id: "contacto",
    title: "Contacto",
    subtitle: "Apoio ao cliente",
    blocks: [
      {
        kind: "p",
        text: "Estamos disponíveis para esclarecer dúvidas sobre produtos, encomendas, entregas e devoluções. Respondemos em até 2 dias úteis.",
      },
      { kind: "h3", text: "E-mail" },
      {
        kind: "external",
        label: "suporte@nuraltainteriores.online",
        href: "mailto:suporte@nuraltainteriores.online",
      },
      { kind: "h3", text: "Telefone" },
      {
        kind: "external",
        label: "+351 913 482 761",
        href: "tel:+351913482761",
      },
      { kind: "h3", text: "Morada de correspondência" },
      {
        kind: "address",
        lines: [
          "Nuralta Interiores",
          "Rua do Pinhal Novo, 84, Armazém 3",
          "4470-640 Maia · Portugal",
        ],
      },
      {
        kind: "external",
        label: "Livro de Reclamações (online)",
        href: "https://www.livroreclamacoes.pt/Inicio/",
      },
    ],
  },
  // DADOS DA EMPRESA
  {
    id: "dados-empresa",
    title: "Dados da empresa",
    subtitle: "Identificação institucional e fiscal",
    updated: "Atualizado em janeiro de 2026",
    blocks: [
      {
        kind: "p",
        text: "A Nuralta Interiores é uma marca comercial operada por E-com.casa, propriedade da MGJ EXPERT LTD, registada em England and Wales. A identificação completa das entidades envolvidas na exploração da marca é apresentada abaixo.",
      },
      { kind: "h3", text: "Marca comercial" },
      {
        kind: "address",
        lines: [
          "Nuralta Interiores",
          "Rua do Pinhal Novo, 84, Armazém 3",
          "4470-640 Maia · Portugal",
          "NIF 517 946 327",
        ],
      },
      { kind: "h3", text: "Operador comercial" },
      {
        kind: "p",
        text: "E-com.casa — operador comercial da marca Nuralta Interiores.",
      },
      { kind: "h3", text: "Entidade proprietária" },
      {
        kind: "address",
        lines: [
          "MGJ EXPERT LTD",
          "71-75 Shelton Street, Covent Garden",
          "London, WC2H 9JQ, United Kingdom",
          "N.º de empresa 17422467 (England and Wales)",
        ],
      },
      { kind: "h3", text: "Contactos" },
      {
        kind: "ul",
        items: [
          "E-mail: suporte@nuraltainteriores.online",
          "Telefone: +351 913 482 761",
        ],
      },
      { kind: "h3", text: "Centros logísticos 3PL (UE)" },
      {
        kind: "address",
        lines: [
          "Trade Port Nord, Greenport Venlo",
          "Columbusweg / Voltastraat, 5928 Venlo, Países Baixos",
        ],
      },
      {
        kind: "address",
        lines: [
          "Plataforma Logística de Zaragoza (PLAZA)",
          "Calle Turiaso / Calle Bari, 50197 Zaragoza, Espanha",
        ],
      },
      { kind: "h3", text: "Reclamações e resolução de litígios" },
      {
        kind: "ul",
        items: [
          "Livro de Reclamações eletrónico, nos termos da legislação portuguesa.",
          "Centro de Arbitragem de Conflitos de Consumo aplicável à sua zona.",
          "Plataforma europeia ODR para resolução de litígios em linha.",
        ],
      },
      {
        kind: "external",
        label: "Livro de Reclamações",
        href: "https://www.livroreclamacoes.pt/Inicio/",
      },
      {
        kind: "external",
        label: "Resolução Alternativa de Litígios (ASAE)",
        href: "https://www.asae.gov.pt/perguntas-frequentes1/area-economica/resolucao-alternativa-de-litigios-de-consumo.aspx",
      },
    ],
  },
];

export function getLegalPage(id: string): LegalPage | undefined {
  return LEGAL_PAGES.find((p) => p.id === id);
}

