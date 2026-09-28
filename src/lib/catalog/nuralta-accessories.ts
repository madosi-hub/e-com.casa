export const NURALTA_KIT_SLUG = 'nuralta-kit-instalacao-completo';

export const NURALTA_STANDALONE_ACCESSORY_SLUGS = [
  'nuralta-cola-montagem-500g',
  'nuralta-estilete-retratil',
  'nuralta-aplicador-cola-reutilizavel',
  'nuralta-fita-led-rgb-3m',
] as const;

export const NURALTA_ACCESSORY_SLUGS = [
  NURALTA_KIT_SLUG,
  ...NURALTA_STANDALONE_ACCESSORY_SLUGS,
] as const;

type NuraltaAccessoryPresentation = {
  name: string;
  description: string;
  eyebrow: string;
  tagline: string;
  intro: string;
  features: string[];
  sectionTitle: string;
};

const PRESENTATIONS: Partial<Record<string, NuraltaAccessoryPresentation>> = {
  [NURALTA_KIT_SLUG]: {
    name: 'Kit de instalação completo',
    description: 'Prepare a instalação dos seus painéis com um conjunto de acessórios práticos: 1 embalagem de cola de montagem, 1 pistola aplicadora reutilizável, 1 guia para medir e alinhar e 1 x-ato retrátil para abrir embalagens e cortar materiais finos. A cola pode render até 3 painéis, consoante a superfície e a quantidade aplicada. Para cortar os painéis em MDF, utilize uma ferramenta adequada. Os painéis e a fita LED são vendidos separadamente.',
    eyebrow: 'Instalação',
    tagline: 'Os acessórios de montagem reunidos num só kit.',
    intro: 'Prepare a instalação dos seus painéis com cola de montagem, aplicador, guia e x-ato. Uma opção prática para quem vai começar e ainda não tem estes acessórios.',
    features: [
      '1 embalagem de cola de montagem',
      '1 pistola aplicadora reutilizável',
      '1 guia para medir e alinhar',
      '1 x-ato retrátil para pequenos cortes em materiais finos',
    ],
    sectionTitle: 'O que inclui o kit',
  },
  'nuralta-cola-montagem-500g': {
    name: 'Cola de montagem 500 g',
    description: 'Cola de montagem em embalagem de 500 g para fixar painéis ripados em superfícies interiores adequadas. Uma escolha prática para quem já tem aplicador ou precisa de mais cola para continuar a instalação. Uma embalagem pode render até 3 painéis, dependendo da superfície e da quantidade aplicada. Confirme a compatibilidade com a parede e siga as instruções do rótulo, incluindo o tempo de secagem. Inclui 1 embalagem de cola; o aplicador é vendido separadamente.',
    eyebrow: 'Fixação',
    tagline: 'A cola de que precisa para dar continuidade à montagem.',
    intro: 'Já tem as ferramentas? Acrescente apenas a cola de montagem necessária para fixar os painéis numa superfície interior adequada.',
    features: [
      '1 embalagem de 500 g',
      'Para montagem de painéis em superfícies interiores adequadas',
      'O rendimento depende da superfície e da quantidade aplicada',
      'Aplicador vendido separadamente',
    ],
    sectionTitle: 'Antes de aplicar',
  },
  'nuralta-estilete-retratil': {
    name: 'X-ato retrátil',
    description: 'X-ato de lâmina retrátil com punho antiderrapante, útil na preparação da montagem. Permite abrir embalagens e fazer pequenos cortes em materiais finos, como cartão ou fita adesiva. Inclui 1 unidade. Para cortar os painéis em MDF, utilize uma ferramenta própria para esse material. Recolha a lâmina após cada utilização.',
    eyebrow: 'Preparação',
    tagline: 'À mão para abrir embalagens e fazer pequenos cortes.',
    intro: 'Uma ferramenta útil para preparar a montagem: abra as embalagens e corte materiais finos com um x-ato de lâmina retrátil.',
    features: [
      '1 x-ato com lâmina retrátil',
      'Punho antiderrapante',
      'Para embalagens e pequenos cortes em materiais finos',
      'Para cortar os painéis, utilize uma ferramenta própria para MDF',
    ],
    sectionTitle: 'Utilização recomendada',
  },
  'nuralta-aplicador-cola-reutilizavel': {
    name: 'Aplicador de cola reutilizável',
    description: 'Pistola aplicadora reutilizável para distribuir a cola de montagem de forma controlada durante a instalação dos painéis. A estrutura metálica e o punho ergonómico facilitam o manuseamento. Confirme a compatibilidade do cartucho e encaixe-o corretamente antes de começar. Após a utilização, retire os resíduos de cola e guarde o aplicador para o próximo projeto. Inclui 1 aplicador; a cola é vendida separadamente.',
    eyebrow: 'Aplicação',
    tagline: 'Mais controlo ao aplicar a cola de montagem.',
    intro: 'Aplique a cola com um gesto controlado ao longo da montagem. Depois de limpo, o aplicador pode voltar a ser utilizado nos seus próximos projetos.',
    features: [
      '1 pistola aplicadora reutilizável',
      'Para cartuchos de cola de montagem compatíveis',
      'Estrutura metálica com punho ergonómico',
      'Cola vendida separadamente',
    ],
    sectionTitle: 'Detalhes do aplicador',
  },
  'nuralta-fita-led-rgb-3m': {
    name: 'Fita LED RGB 3 m',
    description: 'Dê destaque ao painel e crie um ambiente mais acolhedor com esta fita LED RGB flexível de 3 metros. O controlo tátil incluído permite ajustar a cor e a intensidade da luz ao espaço e ao momento. Pode ser colocada entre as ripas, conforme as instruções de instalação, para realçar o desenho do painel. Destina-se a interiores secos. Inclui a fita LED e o controlo; os painéis são vendidos separadamente.',
    eyebrow: 'Iluminação',
    tagline: 'Dê outra luz ao painel e ao ambiente da sua casa.',
    intro: 'Realce as linhas do painel com iluminação decorativa. Ajuste a cor e a intensidade para criar o ambiente que prefere na sala, no quarto ou no escritório.',
    features: [
      '1 fita LED RGB flexível de 3 metros',
      'Cores e intensidade ajustáveis',
      'Controlo tátil incluído',
      'Para utilização em interiores secos',
    ],
    sectionTitle: 'O que inclui e como utilizar',
  },
};

export function getNuraltaAccessoryPresentation(slug: string): NuraltaAccessoryPresentation | undefined {
  return Object.prototype.hasOwnProperty.call(PRESENTATIONS, slug) ? PRESENTATIONS[slug] : undefined;
}
