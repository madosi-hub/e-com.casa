// Central legal/company data — single source of truth for legal pages & footer.
// Placeholders use [TO BE COMPLETED] and must never be fabricated.

export const COMPANY = {
  brand: 'E-com.casa',
  tagline: 'Make Your Space Yours.',
  legalName: 'MGJ EXPERT LTD',
  companyNumber: '17422467',
  registeredOffice: {
    line1: '71-75 Shelton Street',
    line2: 'Covent Garden',
    city: 'London',
    postcode: 'WC2H 9JQ',
    country: 'United Kingdom',
  },
  countryOfIncorporation: 'England and Wales',
  domain: 'https://e-com.casa',
  emails: {
    // Institutional contact of the legal entity (MGJ EXPERT LTD)
    institutional: 'contact@mgj.expert',
    general: 'hello@e-com.casa',
    support: 'support@e-com.casa',
    orders: 'orders@e-com.casa',
    returns: 'returns@e-com.casa',
    legal: 'legal@e-com.casa',
    privacy: 'privacy@e-com.casa',
    compliance: 'compliance@e-com.casa',
  },
  // Customer & operational phone line (Clients & Support).
  telephone: '+44 7451 214299',
  vatNumber: '[TO BE COMPLETED]',
  hostingProvider: '[TO BE COMPLETED]',
  representative: '[TO BE COMPLETED]',
  ptComplaintsBook: 'https://www.livroreclamacoes.pt/',
  frMediator: '[MÉDIATEUR DE LA CONSOMMATION À DÉSIGNER]',

  // EU 3PL logistics warehouses — fulfilment & returns network.
  // These are the operational hubs from which EU orders ship.
  warehouses: [
    {
      id: 'venlo',
      name: 'Trade Port Nord, Greenport Venlo',
      streets: 'Columbusweg / Voltastraat',
      postalCode: '5928',
      city: 'Venlo',
      country: 'Netherlands',
      role: 'Fulfilment hub — Northern & Central Europe',
    },
    {
      id: 'zaragoza',
      name: 'Plataforma Logística de Zaragoza (PLAZA)',
      streets: 'Calle Turiaso / Calle Bari',
      postalCode: '50197',
      city: 'Zaragoza',
      country: 'Spain',
      role: 'Fulfilment hub — Iberian Peninsula & Mediterranean',
    },
  ],
} as const;

export const EMAILS = COMPANY.emails;

/** Resolve the dispatch warehouse for a destination country (ISO-2). */
export function warehouseForCountry(countryIso2: string): (typeof COMPANY.warehouses)[number] {
  const c = countryIso2.toUpperCase();
  // Iberian Peninsula & Mediterranean routes ship from PLAZA (Zaragoza).
  if (['PT', 'ES', 'IT', 'GR', 'MT', 'CY', 'HR'].includes(c)) {
    return COMPANY.warehouses[1];
  }
  // All other EU markets + UK ship from Greenport Venlo.
  return COMPANY.warehouses[0];
}

export function getWarehouseById(id: string | null | undefined): (typeof COMPANY.warehouses)[number] | undefined {
  if (!id) return undefined;
  return COMPANY.warehouses.find((w) => w.id === id);
}
