// E-com.casa — Country / currency engine (data-driven)
// Central market configuration. Nothing here is hardcoded inside
// React components; UI reads configuration through these helpers.
// IMPORTANT:
// - VAT rates are REFERENCE values and must be validated per
// market before go-live.
// - Placeholders marked [TO BE CONFIRMED] must never be replaced
// with invented values (VAT numbers, EPR/WEEE registrations,
// ADR entities, mediator names, return warehouses).
// - Country-specific consumer protections EXTEND the EU/UK
// baseline; they never reduce mandatory rights.

export type Market = 'EU' | 'UK';

export interface ShippingProfile {
  standardDays: string; // placeholder until logistics confirmed
  expressDays: string;
  freeShippingThreshold: number | null; // EUR reference
  standardPrice: number; // EUR reference
  expressPrice: number; // EUR reference
}

export interface ReturnsProfile {
  /** Right of withdrawal baseline (EU: 14 days; UK: 14 days) */
  withdrawalDays: number;
  legalGuaranteeYears: number; // EU 2-year conformity guarantee baseline
  returnCostsBearer: 'consumer' | 'merchant' | 'CONFIGURED_AT_CHECKOUT';
  exceptionsNote: string;
}

export interface LegalDocsProfile {
  /** Which legal routes are emphasised for this market */
  required: string[];
  /** Country-specific mandatory notices */
  notices: string[];
}

export interface ComplaintsProfile {
  /** Livro de Reclamações (PT), médiation (FR), etc. */
  provider: string; // '[TO BE CONFIRMED]' placeholders until configured
  url: string | null;
  note: string;
}

export interface ADRProfile {
  /** Alternative dispute resolution — platform/entity placeholders */
  entity: string;
  note: string;
  /** The former EU ODR platform was discontinued on 20 July 2025 and
   *  must NOT be referenced as an active service. */
  odrStatus: 'DISCONTINUED';
}

export interface CookieRulesProfile {
  consentModel: 'opt-in' | 'soft-opt-in';
  categoriesRequired: string[];
}

export interface ProductRequirementsProfile {
  /** Product safety / market surveillance notes (GPSR baseline) */
  gpsr: boolean;
  /** Markets where electrical goods need extra workflow (WEEE etc.) */
  weeeRequired: boolean;
  batteryRequired: boolean;
  languageRequirements: string;
}

export interface EPRProfile {
  /** Extended Producer Responsibility registrations — placeholders only */
  packaging: string;
  weee: string;
  batteries: string;
  status: 'NOT_REGISTERED' | 'REGISTERED' | 'PENDING';
}

export interface PaymentMethodsProfile {
  /** Actual capability candidates for this market — resolved from the
   *  payment-method registry (never "(demo)" placeholders). */
  methods: string[];
  provider: string; // XPaymentsStripe — Stripe-compatible Direct API
  stripeEnabled: boolean;
}

export interface CountryConfiguration {
  code: string;
  name: string;
  nativeName: string;
  market: Market;
  locale: string;
  currency: string;
  vat: {
    standardRate: number; // reference — validate before go-live
    displayNote: string;
  };
  shipping: ShippingProfile;
  returns: ReturnsProfile;
  consumerRights: string[];
  legalDocuments: LegalDocsProfile;
  complaints: ComplaintsProfile;
  adr: ADRProfile;
  cookieRules: CookieRulesProfile;
  productRequirements: ProductRequirementsProfile;
  epr: EPRProfile;
  paymentMethods: PaymentMethodsProfile;
}

const EU_BASE_CONSUMER_RIGHTS = [
  '14-day right of withdrawal for distance purchases',
  '2-year legal guarantee of conformity',
  'Clear pre-contract information before ordering',
  'Delivery within the agreed timeframe (max 30 days unless agreed otherwise)',
  'Refunds using the original payment method',
  'Protection against faulty goods',
];

/**
 * Capability candidates per market. Real availability is
 * resolved at checkout by /api/payments/capabilities (country +
 * currency + gateway configuration stay authoritative).
 */
function eurPayments(countryCode: string, stripeEnabled = true): PaymentMethodsProfile {
  const cc = countryCode.toUpperCase();
  const local: Record<string, string[]> = {
    PT: ['mb_way', 'multibanco'],
    ES: ['bizum'],
    PL: ['blik'],
    BE: ['bancontact'],
  };
  const methods = [
    'card',
    ...(local[cc] ?? []),
    // wallets render dynamically via the Stripe Express Checkout Element
    'apple_pay',
    'google_pay',
  ];
  return { methods, provider: 'XPaymentsStripe', stripeEnabled };
}

function baseCountry(
  config: Omit<
    CountryConfiguration,
    'shipping' | 'returns' | 'consumerRights' | 'adr' | 'cookieRules' | 'productRequirements' | 'epr' | 'paymentMethods'
  > & {
    consumerRightsExtra?: string[];
    legalNotices?: string[];
    weee?: boolean;
    shipping?: Partial<ShippingProfile>;
    cookieRules?: Partial<CookieRulesProfile>;
    productRequirements?: Partial<ProductRequirementsProfile>;
    epr?: Partial<EPRProfile>;
  },
): CountryConfiguration {
  return {
    ...config,
    shipping: {
      standardDays: 'EU_STANDARD_DELIVERY', // placeholder — displayed at checkout
      expressDays: 'EXPRESS_DELIVERY', // placeholder
      freeShippingThreshold: 50,
      standardPrice: 4.9,
      expressPrice: 9.9,
      ...(config.shipping ?? {}),
    },
    returns: {
      withdrawalDays: 14,
      legalGuaranteeYears: 2,
      returnCostsBearer: 'CONFIGURED_AT_CHECKOUT',
      exceptionsNote:
        'Sealed goods unsuitable for return for hygiene or health reasons, and personalised items, are excluded from withdrawal where permitted by law.',
    },
    consumerRights: [...EU_BASE_CONSUMER_RIGHTS, ...(config.consumerRightsExtra ?? [])],
    adr: {
      entity: '[ADR ENTITY TO BE CONFIRMED]',
      note: 'We will provide information about the competent alternative dispute resolution entity once appointed. The former EU ODR platform was discontinued on 20 July 2025 and is no longer available.',
      odrStatus: 'DISCONTINUED',
    },
    cookieRules: {
      consentModel: 'opt-in',
      categoriesRequired: ['Necessary', 'Preferences', 'Analytics', 'Marketing'],
      ...(config.cookieRules ?? {}),
    },
    productRequirements: {
      gpsr: true,
      weeeRequired: config.weee ?? false,
      batteryRequired: config.weee ?? false,
      languageRequirements: `Consumer-facing product safety information must be provided in the language(s) required by ${config.name}.`,
      ...(config.productRequirements ?? {}),
    },
    epr: {
      packaging: '[EPR PACKAGING REGISTRATION TO BE CONFIRMED]',
      weee: '[WEEE REGISTRATION TO BE CONFIRMED]',
      batteries: '[BATTERY REGISTRATION TO BE CONFIRMED]',
      status: 'NOT_REGISTERED',
      ...(config.epr ?? {}),
    },
    paymentMethods: eurPayments(config.code),
  };
}

// EU — EUR area
export const COUNTRIES: CountryConfiguration[] = [
  baseCountry({
    code: 'PT', name: 'Portugal', nativeName: 'Portugal', market: 'EU', locale: 'pt-PT', currency: 'EUR',
    vat: { standardRate: 23, displayNote: 'IVA incluído (taxa normal de referência: 23%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution', 'complaints'],
      notices: ['Livro de Reclamações link must use the official portal once configured', 'Electronic complaints book reference required for PT traders'],
    },
    complaints: {
      provider: '[LIVRO DE RECLAMAÇÕES — OFFICIAL PORTAL LINK TO BE CONFIGURED]',
      url: null,
      note: 'Portuguese consumers may use the official electronic complaints book (Livro de Reclamações) once the business configuration is confirmed.',
    },
    consumerRightsExtra: ['Access to the electronic complaints book (Livro de Reclamações)'],
    legalNotices: [],
    weee: true,
  }),
  baseCountry({
    code: 'ES', name: 'Spain', nativeName: 'España', market: 'EU', locale: 'es-ES', currency: 'EUR',
    vat: { standardRate: 21, displayNote: 'IVA incluido (tipo general de referencia: 21%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Spanish consumer arbitration information to be provided once configured'],
    },
    complaints: { provider: '[CONSUMER ARBITRATION BOARD TO BE CONFIRMED]', url: null, note: 'Consumer arbitration boards may be competent for Spanish consumers.' },
  }),
  baseCountry({
    code: 'FR', name: 'France', nativeName: 'France', market: 'EU', locale: 'fr-FR', currency: 'EUR',
    vat: { standardRate: 20, displayNote: 'TVA incluse (taux normal de référence : 20 %)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [
        'Mentions légales and CGV must be available in French',
        'Consumer mediator: [MEDIATEUR À DÉSIGNER] — must not be invented',
      ],
    },
    complaints: {
      provider: '[MEDIATEUR À DÉSIGNER]',
      url: null,
      note: 'French consumers may refer the matter to the appointed consumer mediator once the company has formally designated one.',
    },
    consumerRightsExtra: ['Right to refer a dispute to a consumer mediation body (médiateur à désigner)'],
  }),
  baseCountry({
    code: 'DE', name: 'Germany', nativeName: 'Deutschland', market: 'EU', locale: 'de-DE', currency: 'EUR',
    vat: { standardRate: 19, displayNote: 'inkl. MwSt. (Regelsteuersatz-Referenz: 19 %)' },
    legalDocuments: {
      required: ['impressum', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Impressum must be clearly accessible in German', 'Widerrufsbelehrung and Widerrufsformular required'],
    },
    complaints: { provider: '[UNIVERSAL SCHLICHTSTELLE TO BE CONFIRMED]', url: null, note: 'German consumers may contact the universal arbitration board once designated.' },
    weee: true,
  }),
  baseCountry({
    code: 'IT', name: 'Italy', nativeName: 'Italia', market: 'EU', locale: 'it-IT', currency: 'EUR',
    vat: { standardRate: 22, displayNote: 'IVA inclusa (aliquota ordinaria di riferimento: 22%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Italian consumer code disclosures required'],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Italian ADR entities may become competent once appointed.' },
  }),
  baseCountry({
    code: 'NL', name: 'Netherlands', nativeName: 'Nederland', market: 'EU', locale: 'nl-NL', currency: 'EUR',
    vat: { standardRate: 21, displayNote: 'incl. btw (referentietarief: 21%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Dutch consumer law disclosures required'],
    },
    complaints: { provider: '[GESCHILLENCOMMISSIE TO BE CONFIRMED]', url: null, note: 'Dutch consumers may use the relevant disputes committee once connected.' },
  }),
  baseCountry({
    code: 'BE', name: 'Belgium', nativeName: 'België', market: 'EU', locale: 'nl-NL', currency: 'EUR',
    vat: { standardRate: 21, displayNote: 'incl. BTW (referentietarief: 21%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Belgian consumer mediation entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'AT', name: 'Austria', nativeName: 'Österreich', market: 'EU', locale: 'de-DE', currency: 'EUR',
    vat: { standardRate: 20, displayNote: 'inkl. USt (Regelsteuersatz-Referenz: 20 %)' },
    legalDocuments: {
      required: ['impressum', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Impressum required for AT'],
    },
    complaints: { provider: '[SCHLICHTUNGSTELLE TO BE CONFIRMED]', url: null, note: 'Austrian arbitration bodies may apply once appointed.' },
    weee: true,
  }),
  baseCountry({
    code: 'IE', name: 'Ireland', nativeName: 'Ireland', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 23, displayNote: 'VAT included (reference standard rate: 23%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Irish consumers may use competent ADR entities once appointed.' },
  }),
  baseCountry({
    code: 'FI', name: 'Finland', nativeName: 'Suomi', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 25.5, displayNote: 'VAT included (reference standard rate: 25.5%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[KULUTTAJARIITALAUTAKUNTA TO BE CONFIRMED]', url: null, note: 'Finnish Consumer Disputes Board may be competent.' },
  }),
  baseCountry({
    code: 'HR', name: 'Croatia', nativeName: 'Hrvatska', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 25, displayNote: 'PDV uključen (referentna stopa: 25%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Croatian ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'SI', name: 'Slovenia', nativeName: 'Slovenija', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 22, displayNote: 'DDV vključen (referenčna stopa: 22 %)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Slovenian ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'SK', name: 'Slovakia', nativeName: 'Slovensko', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 20, displayNote: 'VRN zahrnutá (referenčná sadzba: 20 %)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Slovak ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'EE', name: 'Estonia', nativeName: 'Eesti', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 22, displayNote: 'KM hindades (referentsmäär: 22%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Estonian consumer protection bodies may be competent.' },
  }),
  baseCountry({
    code: 'LV', name: 'Latvia', nativeName: 'Latvija', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 21, displayNote: 'PVN iekļauts (atsauces likme: 21%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Latvian consumer rights protection centres may be competent.' },
  }),
  baseCountry({
    code: 'LT', name: 'Lithuania', nativeName: 'Lietuva', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 21, displayNote: 'PVM įskaičiuotas (ataskaitinis tarifas: 21%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Lithuanian ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'LU', name: 'Luxembourg', nativeName: 'Lëtzebuerg', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 17, displayNote: 'TVA incluse (taux normal de référence : 17 %)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Luxembourg ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'MT', name: 'Malta', nativeName: 'Malta', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 18, displayNote: 'VAT included (reference standard rate: 18%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Maltese ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'CY', name: 'Cyprus', nativeName: 'Κύπρος', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 19, displayNote: 'ΠΕΚ περιλαμβάνεται (ενδεικτικός συντελεστής: 19%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Cypriot ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'GR', name: 'Greece', nativeName: 'Ελλάδα', market: 'EU', locale: 'en-GB', currency: 'EUR',
    vat: { standardRate: 24, displayNote: 'ΦΠΑ included (ενδεικτικός συντελεστής: 24%)' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Greek consumer ombudsman may be competent.' },
  }),

  // EU — non-EUR
  baseCountry({
    code: 'DK', name: 'Denmark', nativeName: 'Danmark', market: 'EU', locale: 'en-GB', currency: 'DKK',
    vat: { standardRate: 25, displayNote: 'Priserne er vist i DKK med moms (referencetakst: 25%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: ['Danish right of withdrawal baseline 14 days'],
    },
    complaints: { provider: '[FORBRUGERKLAGENÆVNET TO BE CONFIRMED]', url: null, note: 'Danish consumers may use the Consumer Complaints Board.' },
  }),
  baseCountry({
    code: 'SE', name: 'Sweden', nativeName: 'Sverige', market: 'EU', locale: 'en-GB', currency: 'SEK',
    vat: { standardRate: 25, displayNote: 'Priser visas i SEK inkl. moms (referens: 25%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ARN TO BE CONFIRMED]', url: null, note: 'Swedish consumers may use the National Board for Consumer Disputes (ARN).' },
  }),
  baseCountry({
    code: 'PL', name: 'Poland', nativeName: 'Polska', market: 'EU', locale: 'en-GB', currency: 'PLN',
    vat: { standardRate: 23, displayNote: 'Ceny w PLN z VAT (stawka referencyjna: 23%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Polish ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'CZ', name: 'Czechia', nativeName: 'Česko', market: 'EU', locale: 'en-GB', currency: 'CZK',
    vat: { standardRate: 21, displayNote: 'Ceny v CZK včetně DPH (referenční sazba: 21 %) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ČESKÁ OBCHODNÍ INSPEKCE TO BE CONFIRMED]', url: null, note: 'Czech ADR via the Czech Trade Inspection may apply.' },
  }),
  baseCountry({
    code: 'HU', name: 'Hungary', nativeName: 'Magyarország', market: 'EU', locale: 'en-GB', currency: 'HUF',
    vat: { standardRate: 27, displayNote: 'ÁFÁS árak HUF-ban (referencia-kulcs: 27%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[Békéltető Testület TO BE CONFIRMED]', url: null, note: 'Hungarian conciliation boards may be competent.' },
  }),
  baseCountry({
    code: 'RO', name: 'Romania', nativeName: 'România', market: 'EU', locale: 'en-GB', currency: 'RON',
    vat: { standardRate: 19, displayNote: 'Prețuri în RON cu TVA (cota de referință: 19%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Romanian SAL-Fin / ADR entities may apply once appointed.' },
  }),
  baseCountry({
    code: 'BG', name: 'Bulgaria', nativeName: 'България', market: 'EU', locale: 'en-GB', currency: 'BGN',
    vat: { standardRate: 20, displayNote: 'Цените в BGN са с ДДС (справочна ставка: 20%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [],
    },
    complaints: { provider: '[ADR ENTITY TO BE CONFIRMED]', url: null, note: 'Bulgarian consumer protection commission may be competent.' },
  }),

  // UK
  baseCountry({
    code: 'GB', name: 'United Kingdom', nativeName: 'United Kingdom', market: 'UK', locale: 'en-GB', currency: 'GBP',
    vat: { standardRate: 20, displayNote: 'Prices shown in GBP incl. UK VAT (reference: 20%) — currency conversion configured at checkout' },
    legalDocuments: {
      required: ['notice', 'terms', 'privacy', 'cookies', 'returns', 'shipping', 'consumer-rights', 'dispute-resolution'],
      notices: [
        'Company identity must be displayed correctly (UK Companies Act / Ecommerce Regulations)',
        'UK GDPR + Data Protection Act 2018 + PECR apply',
        'Consumer Rights Act 2015 baseline applies',
      ],
    },
    complaints: { provider: '[ADR SCHEME TO BE CONFIRMED]', url: null, note: 'UK consumers may use a competent certified ADR scheme once joined.' },
    consumerRightsExtra: [
      'Consumer Rights Act 2015: goods must be of satisfactory quality, as described, fit for purpose',
      'Short-term right to reject within 30 days for faulty goods',
    ],
    shipping: {
      standardDays: 'UK_STANDARD_DELIVERY', // placeholder — displayed at checkout
    },
    productRequirements: {
      gpsr: false, // GPSR is an EU regulation — UK retains its own regime (Consumer Protection Act 1987 + equivalent duties)
      languageRequirements: 'English-language product safety information required.',
    },
    epr: {
      packaging: '[UK PACKAGING EPR REGISTRATION TO BE CONFIRMED]',
      weee: '[UK WEEE REGISTRATION TO BE CONFIRMED]',
      batteries: '[UK BATTERY REGISTRATION TO BE CONFIRMED]',
    },
  }),
];

/** Full country configuration — the single source of truth for market data. */
export function getCountryConfiguration(countryCode: string): CountryConfiguration | null {
  const code = countryCode?.toUpperCase?.();
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

/** Safe lookup that falls back to the EU baseline rather than failing. */
export function getCountryConfigurationOrDefault(countryCode: string): CountryConfiguration {
  return getCountryConfiguration(countryCode) ?? getCountryConfiguration('PT')!;
}

export function getShipToCountries(): CountryConfiguration[] {
  return COUNTRIES;
}

export function isMarket(countryCode: string, market: Market): boolean {
  return getCountryConfiguration(countryCode)?.market === market;
}
