// E-com.casa — legal document content (single source of truth)
// Placeholders use [TO BE COMPLETED] and must NEVER be fabricated.
// Content is deliberately cautious: no claims that cannot be
// substantiated, no invented authorities/numbers/addresses.

import { COMPANY } from './company';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  intro?: string;
  sections: LegalSection[];
}

export const LEGAL_LAST_UPDATED = '2026-09-10';

const POSTAL = `${COMPANY.registeredOffice.line1}, ${COMPANY.registeredOffice.line2}, ${COMPANY.registeredOffice.city}, ${COMPANY.registeredOffice.postcode}, ${COMPANY.registeredOffice.country}`;

const WAREHOUSE_LINES = COMPANY.warehouses.map(
  (w) => `${w.name} — ${w.streets}, ${w.postalCode} ${w.city}, ${w.country} (${w.role}).`,
);

export const legalDocuments: LegalDocument[] = [
  {
    slug: 'notice',
    title: 'Legal Notice',
    description: 'Business identity, legal entity and operator information for e-com.casa.',
    intro:
      'The website e-com.casa (the “Website”) is operated by the legal entity identified below. This notice identifies the provider of the service and the responsible operator of the online shop.',
    sections: [
      {
        heading: 'Business identity',
        paragraphs: [
          `${COMPANY.brand} is a consumer-facing trading brand. The Website and the online shop are operated by ${COMPANY.legalName}, a company incorporated in ${COMPANY.countryOfIncorporation} under company number ${COMPANY.companyNumber}.`,
        ],
      },
      {
        heading: 'Registered office',
        bullets: [
          COMPANY.legalName,
          COMPANY.registeredOffice.line1,
          COMPANY.registeredOffice.line2,
          `${COMPANY.registeredOffice.city}`,
          `${COMPANY.registeredOffice.postcode}`,
          COMPANY.registeredOffice.country,
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['You can reach us through the following channels:'],
        bullets: [
          `Institutional contact (${COMPANY.legalName}): ${COMPANY.emails.institutional}`,
          `Customer support: ${COMPANY.emails.support}`,
          `Orders: ${COMPANY.emails.orders}`,
          `Returns: ${COMPANY.emails.returns}`,
          `Legal matters: ${COMPANY.emails.legal}`,
          `Privacy matters: ${COMPANY.emails.privacy}`,
          `Product compliance: ${COMPANY.emails.compliance}`,
          ...(COMPANY.telephone ? [`Telephone (customers & support): ${COMPANY.telephone}`] : []),
        ],
      },
      {
        heading: 'Fulfilment and logistics network',
        paragraphs: [
          'Orders are fulfilled through our third-party logistics (3PL) warehouses in the European Union. Orders ship from the warehouse that serves your delivery region:',
        ],
        bullets: WAREHOUSE_LINES,
      },
      {
        heading: 'Registration and tax information',
        paragraphs: [
          `Company registration: ${COMPANY.legalName}, company number ${COMPANY.companyNumber}, registered in ${COMPANY.countryOfIncorporation}.`,
          `VAT number: ${COMPANY.vatNumber}.`,
        ],
      },
      {
        heading: 'Responsible operator',
        paragraphs: [
          `The content of the Website is published by ${COMPANY.legalName} in its capacity as operator of the Website. Legal representative: ${COMPANY.representative}.`,
        ],
      },
      {
        heading: 'Hosting provider',
        paragraphs: [
          `The Website is hosted by: ${COMPANY.hostingProvider}. The hosting provider’s name and address will be completed before go-live.`,
        ],
      },
      {
        heading: 'Website',
        paragraphs: [`Website address: ${COMPANY.domain}.`],
      },
    ],
  },

  {
    slug: 'terms',
    title: 'Terms & Conditions',
    description: 'The terms governing purchases made through the e-com.casa online shop.',
    intro:
      `These Terms & Conditions govern your use of the Website and any order placed through the online shop operated by ${COMPANY.legalName} (“we”, “us”). Please read them before placing an order. Nothing in these terms limits your mandatory consumer rights, including your statutory rights in your country of residence.`,
    sections: [
      {
        heading: 'Definitions',
        bullets: [
          '“Website” — the website e-com.casa and any sub-domains.',
          '“Products” — the goods offered for sale on the Website.',
          '“Order” — an offer by you to purchase Products through the Website.',
          '“Contract” — the contract between you and us for the purchase of Products, formed when we accept your Order.',
        ],
      },
      {
        heading: 'Scope and eligibility',
        paragraphs: [
          'The shop is directed at consumers purchasing for personal, non-commercial use. You must be at least 18 years old to place an order. If you wish to purchase as a business customer, please contact us so we can agree separate terms.',
        ],
      },
      {
        heading: 'Products and product information',
        paragraphs: [
          'Product images are illustrative; colours and finishes may vary slightly depending on your screen and production batch. We take reasonable care to ensure that descriptions, dimensions and prices are accurate, but errors may occur. If we discover a material error after you place an order, we will contact you before dispatch.',
        ],
      },
      {
        heading: 'Prices and taxes',
        paragraphs: [
          'Prices are shown in euro (€) and, for consumers in the EU and UK where applicable, include VAT at the applicable rate. Delivery costs are shown separately at checkout. We do not display fake “was” prices or fabricated discounts; where a price reduction is shown, the prior price refers to the price we actually applied previously.',
        ],
      },
      {
        heading: 'Orders and acceptance',
        paragraphs: [
          'After you place an order you will receive an automatic acknowledgement. This is not acceptance of your order. The Contract is formed when we send you a dispatch confirmation. We may decline an order — for example if a product is unavailable, if payment cannot be verified, or in case of suspected fraud — and we will refund any payment already taken.',
        ],
      },
      {
        heading: 'Payment',
        paragraphs: [
          'Payments are processed through our configured payment service infrastructure. Depending on the payment method and market, payment processing may involve XPayments and Stripe Elements. Your full payment details are handled by the payment infrastructure and are not stored on our systems. You must provide valid payment details and authorise us to take the total amount due, including delivery costs.',
        ],
      },
      {
        heading: 'Delivery',
        paragraphs: [
          'We deliver to the markets stated on our Shipping page. Orders ship from our EU 3PL fulfilment warehouses — currently Greenport Venlo (Netherlands) and Plataforma Logística de Zaragoza (Spain) — with the warehouse chosen automatically for your delivery region. Estimated delivery times (standard: 3–5 working days; express: 1–2 working days) begin from dispatch, not from the order date. Risk of loss or damage passes to you on physical delivery. Every paid order receives a tracking number that you can follow on our Track Your Order page. Delivery estimates are indicative and are not a legal guarantee until our logistics configuration is finalised. See the Shipping Policy for full details.',
        ],
      },
      {
        heading: 'Right of withdrawal',
        paragraphs: [
          'If you are a consumer in the EU or the UK, you generally have the right to withdraw from the Contract within 14 days of receiving the goods, without giving a reason. Statutory exceptions apply (for example, personalised goods). Full instructions, exclusions and a model withdrawal form are available on our Returns page and in our Returns & Right of Withdrawal policy.',
        ],
      },
      {
        heading: 'Faulty goods and legal guarantee',
        paragraphs: [
          'All Products come with the statutory legal guarantee for conformity. For consumers in the EU, the legal guarantee is at least two years from delivery, subject to applicable national rules. Consumers in the UK have statutory remedies under the Consumer Rights Act 2015. Nothing in these terms reduces those rights.',
        ],
      },
      {
        heading: 'Liability',
        paragraphs: [
          'We are responsible to you for foreseeable loss or damage caused by our breach of the Contract or our negligence. We are not liable for unforeseeable loss. Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, for fraud, or for any liability that cannot lawfully be limited.',
        ],
      },
      {
        heading: 'Governing law and jurisdiction',
        paragraphs: [
          'The Contract is governed by the law of England and Wales. However, if you are a consumer, you retain the protection of the mandatory provisions of the law of your country of residence, and you may bring proceedings in the courts of your country of residence where applicable law so provides.',
        ],
      },
      {
        heading: 'Complaints, changes and contact',
        paragraphs: [
          `Complaints can be raised through our Complaints procedure. We may update these terms from time to time; the version in force when you place your order applies to that Contract. You can contact us at ${COMPANY.emails.support} or at ${POSTAL}.`,
        ],
      },
    ],
  },

  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description: `How ${COMPANY.legalName} collects and processes personal data under the EU/EEA GDPR and the UK GDPR.`,
    intro:
      `This Privacy Policy explains how ${COMPANY.legalName} (“we”, “us”), as data controller, collects and uses personal data when you visit e-com.casa or shop with us, in accordance with the EU/EEA General Data Protection Regulation (GDPR) and, for users in the UK, the UK GDPR and the Data Protection Act 2018.`,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          `${COMPANY.legalName}, company number ${COMPANY.companyNumber}, registered at ${POSTAL}, is the controller of personal data processed through the Website. Contact for privacy matters: ${COMPANY.emails.privacy}.`,
        ],
      },
      {
        heading: 'What personal data we collect',
        bullets: [
          'Identity and contact data — name, email address, and (where provided) telephone number.',
          'Account data — email address and hashed credentials if you create an account.',
          'Order and checkout data — products purchased, order number, delivery address, order history.',
          'Payment data — processed by our payment service infrastructure; we do not store full card numbers. Depending on the payment method and market, payment processing may involve XPayments and Stripe Elements.',
          'Shipping data — delivery instructions and tracking status.',
          'Customer service data — messages you send us through forms, email or live chat.',
          'Newsletter data — email address and marketing preferences.',
          'Technical data — IP address, device and browser information, and cookie identifiers.',
        ],
      },
      {
        heading: 'Why we use your data and on what legal basis',
        paragraphs: ['We only process personal data where a legal basis applies:'],
        bullets: [
          'Performance of a contract — to process orders, payments, delivery and returns.',
          'Legal obligations — to keep accounting records and to comply with tax, consumer and product-safety law.',
          'Legitimate interests — to secure and improve the Website, prevent fraud, and answer enquiries; we balance these interests against your rights.',
          'Consent — for marketing emails (opt-in) and for non-essential cookies and similar technologies; you can withdraw consent at any time.',
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        paragraphs: [
          'We use strictly necessary cookies to run the shop (basket, checkout, security). Non-essential cookies (preferences, analytics, marketing) are only used with your consent. Details are set out in our Cookie Policy, and you can change your choices at any time on the Cookie Settings page.',
        ],
      },
      {
        heading: 'How long we keep your data',
        paragraphs: [
          'We keep order and accounting records for the statutory retention periods applicable to accounting and tax law. Customer service communications are kept only as long as needed to handle your request and for a limited period afterwards. Newsletter data is kept until you unsubscribe. Cookie identifiers follow the periods in our Cookie Policy.',
        ],
      },
      {
        heading: 'Who we share your data with',
        paragraphs: ['We never sell your personal data. We share it only with service providers (processors) and authorities where necessary:'],
        bullets: [
          'Payment processing — XPayments and Stripe Elements, as part of our configured payment service infrastructure. Depending on the payment method and market, payment processing may involve these providers.',
          'Hosting and website operation — final hosting provider [TO BE COMPLETED].',
          'Email and newsletter delivery — provider [TO BE COMPLETED].',
          'Logistics and delivery — our EU 3PL fulfilment warehouses (Greenport Venlo, Netherlands, and Plataforma Logística de Zaragoza, Spain) and the carrier partners that deliver your parcels. Each receives only the data needed to fulfil and deliver your order (name, delivery address, contact details and order contents).',
          'Professional advisers, auditors, and public authorities where required by law.',
        ],
      },
      {
        heading: 'International transfers',
        paragraphs: [
          'Some of our service providers may process data outside the EEA or the UK. Where that happens, we aim to rely on appropriate safeguards such as adequacy decisions, the EU Standard Contractual Clauses or the UK International Data Transfer Addendum. The final list of processors and transfer mechanisms is pending completion [TO BE COMPLETED].',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: ['Subject to applicable law, you have the following rights:'],
        bullets: [
          'Right of access to your personal data.',
          'Right to rectification of inaccurate data.',
          'Right to erasure (“right to be forgotten”).',
          'Right to restriction of processing.',
          'Right to data portability.',
          'Right to object, including to processing based on legitimate interests.',
          'Right to withdraw consent at any time (for marketing and cookies).',
          'Right to opt out of marketing communications at any time.',
          'Right to lodge a complaint with a supervisory authority.',
        ],
      },
      {
        heading: 'Supervisory authorities',
        paragraphs: [
          'If you are in the UK, you can complain to the Information Commissioner’s Office (ICO). If you are in the EEA, you can complain to the supervisory authority of your habitual residence or place of work — for example the CNPD in Portugal, the CNIL in France or the relevant data protection authority in Germany.',
        ],
      },
      {
        heading: 'How to contact us',
        paragraphs: [
          `For any privacy request, email ${COMPANY.emails.privacy} or write to ${COMPANY.legalName}, ${POSTAL}. We respond to requests within the statutory time limits.`,
        ],
      },
    ],
  },

  {
    slug: 'cookies',
    title: 'Cookie Policy',
    description: 'Which cookies e-com.casa uses and how you control them.',
    intro:
      'This Cookie Policy explains what cookies are, which cookies we use on e-com.casa, and how you can control them. For information about other personal data, see our Privacy Policy.',
    sections: [
      {
        heading: 'What cookies are',
        paragraphs: [
          'Cookies are small text files that a website stores on your device. Similar technologies (local storage, pixels) are covered by this policy too. Cookies can be “strictly necessary” for a service to work, or used for preferences, analytics and marketing.',
        ],
      },
      {
        heading: 'How we use cookies',
        paragraphs: [
          'Strictly necessary cookies keep the basket, checkout and security features working. They can fall under an exemption from consent because the service cannot function without them. Non-essential cookies — preferences, analytics and marketing — are only set after you give consent, and are not loaded before you have made a choice.',
        ],
      },
      {
        heading: 'Cookie categories',
        bullets: [
          'Necessary — basket, checkout, security and consent storage. Always active.',
          'Preferences — remember your language and region choices.',
          'Analytics — help us understand how the site is used so we can improve it.',
          'Marketing — personalise offers and measure campaigns.',
        ],
      },
      {
        heading: 'Managing your choices',
        paragraphs: [
          'On your first visit we show a consent banner with “Accept all”, “Reject non-essential” and “Manage preferences”. You can review or change your choice at any time on the Cookie Settings page, or delete and block cookies in your browser settings. Withdrawing consent stops future use of the relevant cookies.',
        ],
      },
      {
        heading: 'Third-party cookies',
        paragraphs: [
          'No analytics or marketing third-party scripts are loaded before consent. The final list of third-party cookie providers will be documented before go-live [TO BE COMPLETED].',
        ],
      },
    ],
  },

  {
    slug: 'cookie-settings',
    title: 'Cookie Settings',
    description: 'Review or change your cookie preferences at any time.',
    intro:
      'You can review and change your cookie choices at any time. Necessary cookies are always active because the shop cannot function without them. Use the panel below to see your current preferences or to reopen the consent banner.',
    sections: [
      {
        heading: 'Changing your preferences',
        paragraphs: [
          'Select “Open the cookie banner” below to reopen the consent banner shown on your first visit. You can also accept all cookies or reject all non-essential cookies directly from this page. Your choice is stored on your device and applied to future visits until you change it.',
        ],
      },
      {
        heading: 'Withdrawing consent',
        paragraphs: [
          'Withdrawing consent only takes effect for the future: cookies already set are not removed automatically. To remove existing cookies, clear them through your browser settings. See our Cookie Policy for the categories we use.',
        ],
      },
    ],
  },

  {
    slug: 'returns',
    title: 'Returns & Right of Withdrawal',
    description: 'Your 14-day right of withdrawal, how to return a product, and how refunds work.',
    intro:
      'If you are a consumer in the EU or the UK, you have the right to withdraw from your purchase within 14 days without giving a reason, subject to the statutory exceptions described below. This page summarises the process; your statutory rights are not limited by this summary.',
    sections: [
      {
        heading: 'Your 14-day right of withdrawal',
        paragraphs: [
          'The withdrawal period expires 14 days after the day you (or a third party indicated by you, other than the carrier) receive the goods. If you ordered several items delivered separately, the period runs from the day you receive the last item. To exercise the right, inform us of your decision by email to returns@e-com.casa, or use the model withdrawal form on our Returns page, before the period expires.',
        ],
      },
      {
        heading: 'How to return an order',
        bullets: [
          'Step 1 — Contact us at returns@e-com.casa with your order number.',
          'Step 2 — Receive return instructions from our team.',
          'Step 3 — Pack the product securely, ideally in the original packaging.',
          'Step 4 — Send the product and keep your proof of postage.',
          'Step 5 — We inspect the returned items.',
          'Step 6 — We refund you to the original payment method.',
        ],
      },
      {
        heading: 'Exclusions',
        paragraphs: [
          'Where permitted by law, the right of withdrawal does not apply or may be lost in the following typical cases:',
        ],
        bullets: [
          'Goods made to your specifications or clearly personalised.',
          'Sealed goods which are not suitable for return for health protection or hygiene reasons, if unsealed after delivery.',
          'Goods which, after delivery, are inseparably mixed with other items.',
          'This list is not exhaustive; the law of your country of residence may provide further exceptions or additional protections.',
        ],
      },
      {
        heading: 'Faulty, damaged or wrong items',
        paragraphs: [
          'If a product is faulty, damaged on arrival or not the item you ordered, your statutory rights (including the legal guarantee and UK statutory remedies) apply in addition to the withdrawal right. Contact support@e-com.casa with your order number and photos of the issue. For faulty or incorrectly supplied goods we will provide return instructions and cover the reasonable return costs, in line with applicable law.',
        ],
      },
      {
        heading: 'Refund method and timing',
        paragraphs: [
          'We refund you using the same payment method you used for the original transaction. We issue the refund without undue delay and no later than 14 days after the day we receive the returned goods, or the day you provide evidence that you have shipped them back, whichever is earlier. We may withhold the refund until we have received the goods or evidence of return. We may deduct for any loss of value caused by handling beyond what is necessary to establish the nature, characteristics and functioning of the goods.',
        ],
      },
      {
        heading: 'Return costs and address',
        paragraphs: [
          'You bear the direct cost of returning goods when withdrawing for change-of-mind reasons, unless we state otherwise in the return instructions (final return cost policy pending configuration [RETURN_COST_POLICY]). For faulty or incorrectly supplied goods, we cover reasonable return costs. The physical returns address is confirmed in our reply to your return request and is pending configuration [RETURNS_ADDRESS].',
        ],
      },
    ],
  },

  {
    slug: 'shipping',
    title: 'Shipping Policy',
    description: 'Delivery areas, estimates, costs, tracking and what happens if something goes wrong in transit.',
    intro:
      'This policy describes how we deliver orders placed through e-com.casa. Delivery estimates and the free shipping threshold are current configuration values and may be adjusted before go-live.',
    sections: [
      {
        heading: 'Where we deliver',
        paragraphs: [
          'We deliver to consumer addresses in the European markets listed at checkout and to the United Kingdom. Availability of specific destinations is confirmed at checkout before payment.',
        ],
      },
      {
        heading: 'Our fulfilment network (EU 3PL warehouses)',
        paragraphs: [
          'Orders are picked, packed and dispatched from our third-party logistics (3PL) warehouses inside the European Union. The warehouse that serves your delivery region ships your order:',
        ],
        bullets: WAREHOUSE_LINES,
      },
      {
        heading: 'EU shipping',
        paragraphs: [
          'For the EU, we offer standard and express delivery where available. Standard delivery takes 3–5 working days and express delivery 1–2 working days from dispatch. Working days exclude weekends and public holidays.',
        ],
      },
      {
        heading: 'UK shipping',
        paragraphs: [
          'For the UK we offer standard delivery; estimated times are shown at checkout. Orders to the UK may be subject to import VAT and customs handling fees — see “Customs, duties and taxes” below.',
        ],
      },
      {
        heading: 'Costs',
        bullets: [
          'Standard delivery — €4.90.',
          'Express delivery — €9.90 (where available).',
          'Free standard shipping on orders over €50 (FREE_SHIPPING_THRESHOLD — placeholder pending logistics configuration).',
        ],
      },
      {
        heading: 'Tracking',
        paragraphs: [
          'Every paid order is assigned a tracking number as soon as payment is verified, and the parcel is scanned at each fulfilment step. When your order is dispatched we send a confirmation email containing the tracking number; you can also enter it at any time on our Track Your Order page to see the current delivery state, the journey so far and the estimated delivery date. If tracking shows no movement for several working days, contact support@e-com.casa.',
        ],
      },
      {
        heading: 'Damaged deliveries',
        paragraphs: [
          'If a parcel or product arrives damaged, note the damage to the carrier where possible and take photos of the packaging and the product. Then contact support@e-com.casa with your order number as soon as reasonably possible. We will arrange a replacement or refund in line with your statutory rights — see also our Returns & Right of Withdrawal policy.',
        ],
      },
      {
        heading: 'Missing deliveries',
        paragraphs: [
          'If tracking says “delivered” but you cannot find your parcel, please check with neighbours, household members and any collection point notice left by the carrier. If the parcel still cannot be located, contact support@e-com.casa with your order number and we will open an investigation with the carrier.',
        ],
      },
      {
        heading: 'Customs, duties and taxes (UK and non-EU)',
        paragraphs: [
          'Product prices are shown inclusive of VAT for EU consumer sales. For deliveries outside the EU customs area — for example to the UK — import VAT, customs duties and carrier handling fees may apply and are set by the relevant authorities. Any such charges are payable by the recipient where applicable; the final configuration for UK VAT treatment at checkout is pending [TO BE COMPLETED].',
        ],
      },
      {
        heading: 'Remote areas',
        paragraphs: [
          'Deliveries to islands, mountainous regions and other remote areas may take longer than the standard estimates or be subject to a surcharge confirmed at checkout before payment.',
        ],
      },
    ],
  },

  {
    slug: 'warranty',
    title: 'Warranty & Legal Guarantee',
    description: 'The statutory legal guarantee for our products and how to make a claim.',
    intro:
      'Every product sold through e-com.casa is covered by the statutory legal guarantee that applies in your country of residence. This page explains what that means in practice and how to make a claim.',
    sections: [
      {
        heading: 'EU legal guarantee',
        paragraphs: [
          'For consumers in the EU, products must be in conformity with the contract. If a product shows a lack of conformity within two years of delivery, it is presumed to have existed at the time of delivery, subject to applicable national rules. The remedies available to you (repair, replacement, price reduction or termination) and their order follow the consumer law of your country of residence.',
        ],
      },
      {
        heading: 'UK statutory rights',
        paragraphs: [
          'For consumers in the UK, goods must be of satisfactory quality, as described and fit for purpose under the Consumer Rights Act 2015. Short-term right to reject and other statutory remedies apply as set out in that Act.',
        ],
      },
      {
        heading: 'Commercial warranties',
        paragraphs: [
          'Some manufacturers may provide additional commercial warranties. If we offer a commercial warranty for a product, it will be clearly labelled as such on the product page. A commercial warranty is voluntary, is always in addition to — and never replaces — your statutory legal guarantee.',
        ],
      },
      {
        heading: 'How to make a claim',
        paragraphs: [
          `Email ${COMPANY.emails.support} (or ${COMPANY.emails.returns} for return logistics) with your order number, a description of the issue and photos where possible. We will assess the claim under the applicable legal guarantee and explain the next steps, including return instructions where needed.`,
        ],
      },
      {
        heading: 'What is not covered',
        paragraphs: [
          'The legal guarantee covers defects in conformity with the contract. It does not cover damage caused by normal wear and tear, misuse, accidental damage, unauthorised modification or repair, or failure to follow the provided instructions — to the extent permitted by applicable law.',
        ],
      },
    ],
  },

  {
    slug: 'product-safety',
    title: 'Product Safety / GPSR',
    description: 'How our product records support EU product safety requirements, including Regulation (EU) 2023/988 (GPSR).',
    intro:
      'Products offered on e-com.casa to consumers in the EU must comply with applicable Union product safety law, including the General Product Safety Regulation (Regulation (EU) 2023/988, “GPSR”) where applicable. This page explains how our catalogue is structured to support those requirements.',
    sections: [
      {
        heading: 'What our product records support',
        paragraphs: [
          'Every production product record is designed to store the information required for product safety and traceability, including:',
        ],
        bullets: [
          'Product identifier, model/SKU and product image.',
          'Manufacturer name, postal address and electronic contact details.',
          'EU responsible person, where applicable.',
          'Importer details, where applicable.',
          'Warnings and safety information, instructions for use, and CE information where applicable.',
          'Country of origin and traceability information.',
        ],
      },
      {
        heading: 'Electrical products',
        paragraphs: [
          'Lighting, electronic gadgets and similar items carry additional compliance fields in the product record:',
        ],
        bullets: [
          'Electrical product flag (true/false).',
          'Voltage, frequency, power and plug type.',
          'Manufacturer and EU responsible person where applicable.',
          'WEEE category and battery information where applicable.',
          'Instructions for use and safety information.',
        ],
      },
      {
        heading: 'Compliance status workflow',
        paragraphs: [
          'Every electrical SKU — and, going forward, every product — carries a compliance status: PENDING_REVIEW, APPROVED or BLOCKED. Products with status PENDING_REVIEW are held back from publication until review is complete, and BLOCKED products are never shown in the production catalogue.',
        ],
      },
      {
        heading: 'Demo catalogue notice',
        paragraphs: [
          'The catalogue currently running on this site is a demonstration dataset. Product safety fields for demo products use placeholder values and must not be relied upon as compliance information. Full manufacturer, responsible-person and compliance data will be completed and reviewed before production go-live.',
        ],
      },
      {
        heading: 'Reporting a safety concern',
        paragraphs: [
          `If you believe a product sold on e-com.casa presents a safety risk, contact us immediately at ${COMPANY.emails.compliance} with the product name, order number and a description (and photos, where possible). We investigate every report and will inform you of the outcome.`,
        ],
      },
    ],
  },

  {
    slug: 'accessibility',
    title: 'Accessibility Statement',
    description: 'Our accessibility approach, current limitations, and how to give us feedback.',
    intro:
      'We want e-com.casa to be usable by everyone. This statement describes our accessibility approach, the measures we have taken, known limitations and how to send us feedback.',
    sections: [
      {
        heading: 'Our commitment',
        paragraphs: [
          'E-commerce services are covered by the framework of the European Accessibility Act from 28 June 2025, subject to scope and exemptions. We build the Website against a WCAG-oriented baseline and treat accessibility as an ongoing requirement of the shop — not a one-off project. We do not claim WCAG or EAA certification unless independently verified.',
        ],
      },
      {
        heading: 'Measures we have taken',
        bullets: [
          'Semantic HTML and a logical heading structure on every page.',
          'Keyboard navigability and visible focus states.',
          'A skip link to the main content and labelled landmarks.',
          'Descriptive alt text for meaningful images.',
          'Accessible forms with associated labels and error feedback.',
          'Sufficient colour contrast in the default theme.',
          'Support for reduced-motion preferences in animations.',
        ],
      },
      {
        heading: 'Known limitations',
        paragraphs: [
          'We have not yet completed an independent accessibility audit. Some third-party interface components may not yet be fully optimised, and alternative text or focus behaviour may occasionally need refinement. Known limitations are reviewed as part of ongoing development.',
        ],
      },
      {
        heading: 'Feedback and contact',
        paragraphs: [
          `If you encounter an accessibility barrier, please tell us: email ${COMPANY.emails.support} with the page address and a description of the problem. We aim to acknowledge accessibility feedback within a reasonable time and to prioritise fixes that block access to core shopping journeys.`,
        ],
      },
    ],
  },

  {
    slug: 'complaints',
    title: 'Complaints',
    description: 'How to raise a complaint about your order, product or our service.',
    intro:
      'If something has gone wrong, we want to hear about it and put it right. Most issues are resolved quickly by our support team.',
    sections: [
      {
        heading: 'How to contact us',
        paragraphs: [
          `For order, product, delivery and refund issues, email ${COMPANY.emails.support} or use the contact form on our Contact page. Include your order number and, where relevant, photos of the issue.`,
        ],
      },
      {
        heading: 'Common issues',
        bullets: [
          'Order issue — wrong item, size or quantity received.',
          'Damaged product — item or packaging damaged in transit.',
          'Late delivery — tracking has not updated or the estimate has passed.',
          'Faulty product — the item does not work as described.',
          'Refund issue — a promised refund has not arrived.',
        ],
      },
      {
        heading: 'Formal complaint',
        paragraphs: [
          `If you are not satisfied with the outcome of a support request, you can submit a formal complaint by email to ${COMPANY.emails.legal} with the subject “Formal complaint”, including your order number and a summary of the exchange so far. We acknowledge formal complaints within a reasonable time and reply with our position in writing.`,
        ],
      },
      {
        heading: 'Escalation and out-of-court options',
        paragraphs: [
          'Depending on your country of residence, you may be able to use out-of-court consumer dispute resolution. See our Dispute Resolution page for the mechanisms that apply in specific markets.',
        ],
      },
      {
        heading: 'Country-specific information',
        bullets: [
          'Portugal — the electronic complaints book (Livro de Reclamações) is available at https://www.livroreclamacoes.pt/.',
          'France — the designated consumer mediator will be published here once appointed: [MÉDIATEUR DE LA CONSOMMATION À DÉSIGNER].',
        ],
      },
    ],
  },

  {
    slug: 'dispute-resolution',
    title: 'Dispute Resolution',
    description: 'How to resolve a dispute with us, including out-of-court options in your country.',
    intro:
      'We encourage you to contact us first — most disputes can be resolved directly and quickly. This page also describes the out-of-court dispute resolution options that apply depending on where you live.',
    sections: [
      {
        heading: 'Contact us first',
        paragraphs: [
          `Please raise any issue with our support team before starting a formal procedure: ${COMPANY.emails.support}. If a support conversation did not resolve the matter, follow our Complaints procedure so that your case is reviewed by a second person.`,
        ],
      },
      {
        heading: 'Alternative dispute resolution (ADR)',
        paragraphs: [
          'Under EU consumer law, consumers may in certain cases use approved alternative dispute resolution (ADR) entities for out-of-court settlements. We will provide the relevant entity details for your market where applicable; country-specific information is published on this page as our market configuration is completed.',
        ],
      },
      {
        heading: 'France — consumer mediation',
        paragraphs: [
          'For consumers in France, the contact details of the legally designated consumer mediator will be published here once the appointment is finalised: [MÉDIATEUR DE LA CONSOMMATION À DÉSIGNER].',
        ],
      },
      {
        heading: 'Portugal — Livro de Reclamações',
        paragraphs: [
          'For consumers in Portugal, the electronic complaints book is available at https://www.livroreclamacoes.pt/.',
        ],
      },
      {
        heading: 'About the former EU ODR platform',
        paragraphs: [
          'Please note: the European Online Dispute Resolution (ODR) platform was discontinued on 20 July 2025 and is therefore no longer available. References to it in older documents are obsolete.',
        ],
      },
      {
        heading: 'Courts',
        paragraphs: [
          'Nothing on this page prevents you from bringing proceedings before the competent courts, including the courts of your country of residence where applicable law so provides. Consumers may also be eligible for legal aid under national rules.',
        ],
      },
    ],
  },

  {
    slug: 'impressum',
    title: 'Impressum',
    description: 'Provider information for the German market in accordance with the Digital Services Act (DDG).',
    intro:
      'This Impressum provides the provider information required for the German market under § 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG). It supplements our Legal Notice.',
    sections: [
      {
        heading: 'Provider (Diensteanbieter)',
        bullets: [
          `${COMPANY.legalName}`,
          `${COMPANY.registeredOffice.line1} ${COMPANY.registeredOffice.line2}`,
          `${COMPANY.registeredOffice.postcode} ${COMPANY.registeredOffice.city}`,
          `${COMPANY.registeredOffice.country}`,
        ],
      },
      {
        heading: 'Legal form and representative',
        paragraphs: [
          `Legal form: private company limited by shares, incorporated in ${COMPANY.countryOfIncorporation} (company number ${COMPANY.companyNumber}). Authorised representative: ${COMPANY.representative}.`,
        ],
      },
      {
        heading: 'Contact',
        bullets: [
          `Email: ${COMPANY.emails.support}`,
          `Legal matters: ${COMPANY.emails.legal}`,
          ...(COMPANY.telephone ? [`Telephone: ${COMPANY.telephone}`] : []),
        ],
      },
      {
        heading: 'Register and tax information',
        paragraphs: [
          `Commercial register: Companies House, England and Wales, company number ${COMPANY.companyNumber}. VAT identification number: ${COMPANY.vatNumber}.`,
        ],
      },
      {
        heading: 'Responsible for content',
        paragraphs: [
          `Responsible for the content of this website within the meaning of the applicable media law: ${COMPANY.representative}, address as above.`,
        ],
      },
      {
        heading: 'Hosting',
        paragraphs: [`Hosting provider: ${COMPANY.hostingProvider}.`],
      },
    ],
  },

  {
    slug: 'consumer-rights',
    title: 'Consumer Rights',
    description: 'A plain summary of the key statutory rights for consumers in the EU and the UK.',
    intro:
      'This page summarises, in plain language, the statutory consumer rights that apply when you shop on e-com.casa. It is a summary only — the law of your country of residence may give you additional protections, and the full details are in our policies.',
    sections: [
      {
        heading: 'Clear pre-contract information',
        paragraphs: [
          'Before you order, we show the main characteristics of the products, the total price including taxes, delivery costs and arrangements, and the identity of the seller. Our Terms & Conditions and these policy pages form part of that information.',
        ],
      },
      {
        heading: '14-day right of withdrawal',
        paragraphs: [
          'As a consumer in the EU or the UK you can generally withdraw from a distance purchase within 14 days of receiving the goods, without giving a reason. Statutory exceptions apply — for example for personalised goods. See Returns & Right of Withdrawal for the process, exclusions and a model withdrawal form.',
        ],
      },
      {
        heading: 'Legal guarantee for faulty goods',
        paragraphs: [
          'In the EU, products are covered by a legal guarantee of at least two years for lack of conformity, subject to national rules. In the UK, the Consumer Rights Act 2015 gives statutory remedies for goods that are not of satisfactory quality, as described or fit for purpose. See Warranty & Legal Guarantee.',
        ],
      },
      {
        heading: 'Delivery rules',
        paragraphs: [
          'Unless otherwise agreed, we must deliver the goods without undue delay and no later than 30 days after the contract is formed. If we fail to deliver within that period, you can — after being reminded where required by law — terminate the contract and obtain a refund, subject to the rules of your country of residence.',
        ],
      },
      {
        heading: 'Price transparency',
        paragraphs: [
          'Prices are displayed inclusive of VAT where applicable, and delivery charges are shown before you pay. Where a price reduction is advertised, we indicate the prior price actually applied in line with EU price reduction rules.',
        ],
      },
      {
        heading: 'Payment safety and complaints',
        paragraphs: [
          'Payments are handled by our payment provider; we never see your full card details. If something goes wrong, our Complaints and Dispute Resolution pages explain how to escalate — including out-of-court options in several countries.',
        ],
      },
      {
        heading: 'These rights cannot be taken away',
        paragraphs: [
          'Nothing in our terms or policies limits the mandatory consumer rights described on this page. If any provision in our documents conflicts with mandatory consumer law, the law prevails.',
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return legalDocuments.find((d) => d.slug === slug);
}
