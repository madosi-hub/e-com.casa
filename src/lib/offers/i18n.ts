import type { OfferLanguage } from './types';

export interface OfferUICopy {
  shipTo: string;
  language: string;
  integratedCatalog: string;
  syncedVariants: string;
  secureCheckout: string;
  trackedDelivery: string;
  returns: string;
  securePayment: string;
  validatedStock: string;
  transformation: string;
  beforeEverything: string;
  whyWorks: string;
  benefitsTitle: string;
  specsEyebrow: string;
  specsTitle: string;
  specsBody: string;
  installation: string;
  installationTitle: string;
  step: string;
  inspiration: string;
  inspirationTitle: string;
  productPage: string;
  socialProof: string;
  socialProofTitle: string;
  verifiedReviews: string;
  reviewsPending: string;
  faq: string;
  faqTitle: string;
  chooseTop: string;
  availabilityPending: string;
  buy: string;
  status: string;
  videoLabel: string;
  videoReferenceDisclaimer: string;
  calculatorTitle: string;
  calculatorBody: string;
  wallWidth: string;
  wallHeight: string;
  estimate: string;
  estimatedPanels: string;
  estimateDisclaimer: string;
  marketNote: string;
}

const COPY: Record<OfferLanguage, OfferUICopy> = {
  pt: {
    shipTo: 'Entregar em', language: 'Idioma', integratedCatalog: 'Catálogo integrado', syncedVariants: 'Variantes sincronizadas', secureCheckout: 'Checkout E-com.casa',
    trackedDelivery: 'Entrega rastreável', returns: '14 dias para devolver', securePayment: 'Pagamento seguro', validatedStock: 'Stock validado antes da venda',
    transformation: 'A transformação', beforeEverything: 'Antes de pensar em trocar tudo', whyWorks: 'Porque funciona', benefitsTitle: 'Pequena intervenção. Grande diferença visual.',
    specsEyebrow: 'Especificações do catálogo', specsTitle: 'Detalhes antes de decidir.', specsBody: 'Os dados comerciais desta área vêm do produto associado no catálogo, não da configuração da Offer.',
    installation: 'Instalação', installationTitle: 'Planeado para ficar simples do início ao remate.', step: 'Passo', inspiration: 'Inspiração', inspirationTitle: 'Veja a textura de perto e no espaço.', productPage: 'Ver ficha de produto',
    socialProof: 'Prova social', socialProofTitle: 'A confiança aparece quando os dados também são reais.', verifiedReviews: 'avaliações verificadas', reviewsPending: 'As avaliações verificadas serão apresentadas aqui quando existirem.',
    faq: 'FAQ', faqTitle: 'Perguntas antes da transformação.', chooseTop: 'Escolha a variante no topo', availabilityPending: 'Disponibilidade em validação', buy: 'Comprar', status: 'Ver estado',
    videoLabel: 'Vídeo de inspiração', videoReferenceDisclaimer: 'Vídeo editorial de referência. Não representa necessariamente o SKU exato.',
    calculatorTitle: 'Quantos painéis preciso?', calculatorBody: 'Introduza as medidas da parede para obter uma estimativa rápida com base nas dimensões atuais do painel.', wallWidth: 'Largura da parede (m)', wallHeight: 'Altura da parede (m)', estimate: 'Calcular', estimatedPanels: 'Estimativa', estimateDisclaimer: 'Estimativa indicativa. Confirme medidas, cortes, orientação e margem de desperdício antes da encomenda.',
    marketNote: 'Conteúdo e regras de mercado ajustados pelo país detetado.',
  },
  en: {
    shipTo: 'Deliver to', language: 'Language', integratedCatalog: 'Integrated catalogue', syncedVariants: 'Synced variants', secureCheckout: 'E-com.casa checkout',
    trackedDelivery: 'Tracked delivery', returns: '14-day returns', securePayment: 'Secure payment', validatedStock: 'Stock validated before sale',
    transformation: 'The transformation', beforeEverything: 'Before replacing everything', whyWorks: 'Why it works', benefitsTitle: 'Small intervention. Big visual impact.',
    specsEyebrow: 'Catalogue specifications', specsTitle: 'Details before you decide.', specsBody: 'Commercial data in this section comes from the linked catalogue product, not from the Offer configuration.',
    installation: 'Installation', installationTitle: 'Designed to stay simple from planning to finishing.', step: 'Step', inspiration: 'Inspiration', inspirationTitle: 'See the texture up close and in the room.', productPage: 'View product page',
    socialProof: 'Social proof', socialProofTitle: 'Trust grows when the data is real too.', verifiedReviews: 'verified reviews', reviewsPending: 'Verified customer reviews will appear here when available.',
    faq: 'FAQ', faqTitle: 'Questions before the transformation.', chooseTop: 'Choose your option above', availabilityPending: 'Availability under validation', buy: 'Buy', status: 'View status',
    videoLabel: 'Inspiration video', videoReferenceDisclaimer: 'Editorial reference footage. It may not show the exact SKU.',
    calculatorTitle: 'How many panels do I need?', calculatorBody: 'Enter your wall dimensions for a quick estimate based on the current panel dimensions.', wallWidth: 'Wall width (m)', wallHeight: 'Wall height (m)', estimate: 'Calculate', estimatedPanels: 'Estimate', estimateDisclaimer: 'Indicative estimate only. Confirm dimensions, cuts, orientation and waste allowance before ordering.',
    marketNote: 'Content and market rules are adjusted using the detected country.',
  },
  es: {
    shipTo: 'Entregar en', language: 'Idioma', integratedCatalog: 'Catálogo integrado', syncedVariants: 'Variantes sincronizadas', secureCheckout: 'Checkout E-com.casa',
    trackedDelivery: 'Entrega con seguimiento', returns: '14 días para devolver', securePayment: 'Pago seguro', validatedStock: 'Stock validado antes de la venta',
    transformation: 'La transformación', beforeEverything: 'Antes de cambiarlo todo', whyWorks: 'Por qué funciona', benefitsTitle: 'Pequeña intervención. Gran cambio visual.',
    specsEyebrow: 'Especificaciones del catálogo', specsTitle: 'Detalles antes de decidir.', specsBody: 'Los datos comerciales de esta sección proceden del producto asociado en el catálogo, no de la configuración de la Offer.',
    installation: 'Instalación', installationTitle: 'Pensado para mantenerlo simple de principio a fin.', step: 'Paso', inspiration: 'Inspiración', inspirationTitle: 'Mira la textura de cerca y en el espacio.', productPage: 'Ver ficha de producto',
    socialProof: 'Prueba social', socialProofTitle: 'La confianza crece cuando los datos también son reales.', verifiedReviews: 'opiniones verificadas', reviewsPending: 'Las opiniones verificadas aparecerán aquí cuando estén disponibles.',
    faq: 'FAQ', faqTitle: 'Preguntas antes de transformar el espacio.', chooseTop: 'Elige la opción arriba', availabilityPending: 'Disponibilidad en validación', buy: 'Comprar', status: 'Ver estado',
    videoLabel: 'Vídeo de inspiración', videoReferenceDisclaimer: 'Vídeo editorial de referencia. Puede no mostrar el SKU exacto.',
    calculatorTitle: '¿Cuántos paneles necesito?', calculatorBody: 'Introduce las medidas de la pared para obtener una estimación rápida según las dimensiones actuales del panel.', wallWidth: 'Ancho de la pared (m)', wallHeight: 'Alto de la pared (m)', estimate: 'Calcular', estimatedPanels: 'Estimación', estimateDisclaimer: 'Estimación orientativa. Confirma medidas, cortes, orientación y margen de desperdicio antes de comprar.',
    marketNote: 'El contenido y las reglas de mercado se ajustan según el país detectado.',
  },
  fr: {
    shipTo: 'Livrer en', language: 'Langue', integratedCatalog: 'Catalogue intégré', syncedVariants: 'Variantes synchronisées', secureCheckout: 'Paiement E-com.casa',
    trackedDelivery: 'Livraison suivie', returns: 'Retour sous 14 jours', securePayment: 'Paiement sécurisé', validatedStock: 'Stock validé avant la vente',
    transformation: 'La transformation', beforeEverything: 'Avant de tout remplacer', whyWorks: 'Pourquoi cela fonctionne', benefitsTitle: 'Petite intervention. Grand impact visuel.',
    specsEyebrow: 'Spécifications du catalogue', specsTitle: 'Les détails avant de décider.', specsBody: 'Les données commerciales de cette section proviennent du produit lié dans le catalogue, et non de la configuration de l’Offer.',
    installation: 'Installation', installationTitle: 'Pensé pour rester simple du début à la finition.', step: 'Étape', inspiration: 'Inspiration', inspirationTitle: 'Voyez la texture de près et dans la pièce.', productPage: 'Voir la fiche produit',
    socialProof: 'Preuve sociale', socialProofTitle: 'La confiance augmente lorsque les données sont elles aussi réelles.', verifiedReviews: 'avis vérifiés', reviewsPending: 'Les avis clients vérifiés apparaîtront ici dès qu’ils seront disponibles.',
    faq: 'FAQ', faqTitle: 'Questions avant la transformation.', chooseTop: 'Choisissez l’option ci-dessus', availabilityPending: 'Disponibilité en validation', buy: 'Acheter', status: 'Voir le statut',
    videoLabel: 'Vidéo d’inspiration', videoReferenceDisclaimer: 'Vidéo éditoriale de référence. Elle peut ne pas montrer le SKU exact.',
    calculatorTitle: 'Combien de panneaux me faut-il ?', calculatorBody: 'Saisissez les dimensions du mur pour obtenir une estimation rapide basée sur les dimensions actuelles du panneau.', wallWidth: 'Largeur du mur (m)', wallHeight: 'Hauteur du mur (m)', estimate: 'Calculer', estimatedPanels: 'Estimation', estimateDisclaimer: 'Estimation indicative. Vérifiez les mesures, découpes, orientation et marge de perte avant commande.',
    marketNote: 'Le contenu et les règles du marché sont ajustés selon le pays détecté.',
  },
  de: {
    shipTo: 'Liefern nach', language: 'Sprache', integratedCatalog: 'Integrierter Katalog', syncedVariants: 'Synchronisierte Varianten', secureCheckout: 'E-com.casa Checkout',
    trackedDelivery: 'Sendungsverfolgung', returns: '14 Tage Rückgabe', securePayment: 'Sichere Zahlung', validatedStock: 'Bestand vor Verkauf geprüft',
    transformation: 'Die Verwandlung', beforeEverything: 'Bevor Sie alles austauschen', whyWorks: 'Warum es funktioniert', benefitsTitle: 'Kleine Veränderung. Große optische Wirkung.',
    specsEyebrow: 'Katalogspezifikationen', specsTitle: 'Details vor der Entscheidung.', specsBody: 'Die kommerziellen Daten in diesem Abschnitt stammen aus dem verknüpften Katalogprodukt und nicht aus der Offer-Konfiguration.',
    installation: 'Montage', installationTitle: 'Von der Planung bis zum Abschluss möglichst einfach gehalten.', step: 'Schritt', inspiration: 'Inspiration', inspirationTitle: 'Sehen Sie die Struktur aus der Nähe und im Raum.', productPage: 'Produktseite ansehen',
    socialProof: 'Social Proof', socialProofTitle: 'Vertrauen entsteht, wenn auch die Daten echt sind.', verifiedReviews: 'verifizierte Bewertungen', reviewsPending: 'Verifizierte Kundenbewertungen erscheinen hier, sobald sie verfügbar sind.',
    faq: 'FAQ', faqTitle: 'Fragen vor der Verwandlung.', chooseTop: 'Option oben auswählen', availabilityPending: 'Verfügbarkeit wird geprüft', buy: 'Kaufen', status: 'Status ansehen',
    videoLabel: 'Inspirationsvideo', videoReferenceDisclaimer: 'Redaktionelles Referenzvideo. Es zeigt möglicherweise nicht die exakte SKU.',
    calculatorTitle: 'Wie viele Paneele brauche ich?', calculatorBody: 'Geben Sie die Wandmaße ein, um eine schnelle Schätzung anhand der aktuellen Paneelmaße zu erhalten.', wallWidth: 'Wandbreite (m)', wallHeight: 'Wandhöhe (m)', estimate: 'Berechnen', estimatedPanels: 'Schätzung', estimateDisclaimer: 'Nur Richtwert. Maße, Zuschnitte, Ausrichtung und Verschnitt vor der Bestellung prüfen.',
    marketNote: 'Inhalte und Marktregeln werden anhand des erkannten Landes angepasst.',
  },
  it: {
    shipTo: 'Consegna in', language: 'Lingua', integratedCatalog: 'Catalogo integrato', syncedVariants: 'Varianti sincronizzate', secureCheckout: 'Checkout E-com.casa',
    trackedDelivery: 'Consegna tracciata', returns: 'Reso entro 14 giorni', securePayment: 'Pagamento sicuro', validatedStock: 'Stock verificato prima della vendita',
    transformation: 'La trasformazione', beforeEverything: 'Prima di cambiare tutto', whyWorks: 'Perché funziona', benefitsTitle: 'Piccolo intervento. Grande impatto visivo.',
    specsEyebrow: 'Specifiche del catalogo', specsTitle: 'Dettagli prima di decidere.', specsBody: 'I dati commerciali di questa sezione provengono dal prodotto collegato nel catalogo, non dalla configurazione dell’Offer.',
    installation: 'Installazione', installationTitle: 'Pensato per restare semplice dalla progettazione alla finitura.', step: 'Passo', inspiration: 'Ispirazione', inspirationTitle: 'Guarda la texture da vicino e nello spazio.', productPage: 'Vedi scheda prodotto',
    socialProof: 'Prova sociale', socialProofTitle: 'La fiducia cresce quando anche i dati sono reali.', verifiedReviews: 'recensioni verificate', reviewsPending: 'Le recensioni verificate appariranno qui quando disponibili.',
    faq: 'FAQ', faqTitle: 'Domande prima della trasformazione.', chooseTop: 'Scegli l’opzione sopra', availabilityPending: 'Disponibilità in verifica', buy: 'Acquista', status: 'Vedi stato',
    videoLabel: 'Video ispirazionale', videoReferenceDisclaimer: 'Filmato editoriale di riferimento. Potrebbe non mostrare lo SKU esatto.',
    calculatorTitle: 'Quanti pannelli mi servono?', calculatorBody: 'Inserisci le misure della parete per una stima rapida basata sulle dimensioni attuali del pannello.', wallWidth: 'Larghezza parete (m)', wallHeight: 'Altezza parete (m)', estimate: 'Calcola', estimatedPanels: 'Stima', estimateDisclaimer: 'Stima indicativa. Verifica misure, tagli, orientamento e margine di scarto prima dell’ordine.',
    marketNote: 'Contenuti e regole di mercato vengono adattati in base al paese rilevato.',
  },
  nl: {
    shipTo: 'Leveren in', language: 'Taal', integratedCatalog: 'Geïntegreerde catalogus', syncedVariants: 'Gesynchroniseerde varianten', secureCheckout: 'E-com.casa checkout',
    trackedDelivery: 'Traceerbare levering', returns: '14 dagen retour', securePayment: 'Veilige betaling', validatedStock: 'Voorraad vóór verkoop gevalideerd',
    transformation: 'De transformatie', beforeEverything: 'Voordat je alles vervangt', whyWorks: 'Waarom het werkt', benefitsTitle: 'Kleine ingreep. Groot visueel verschil.',
    specsEyebrow: 'Catalogusspecificaties', specsTitle: 'Details voordat je beslist.', specsBody: 'De commerciële gegevens in dit gedeelte komen uit het gekoppelde catalogusproduct, niet uit de Offer-configuratie.',
    installation: 'Installatie', installationTitle: 'Ontworpen om eenvoudig te blijven van planning tot afwerking.', step: 'Stap', inspiration: 'Inspiratie', inspirationTitle: 'Bekijk de textuur van dichtbij en in de ruimte.', productPage: 'Productpagina bekijken',
    socialProof: 'Social proof', socialProofTitle: 'Vertrouwen groeit wanneer ook de gegevens echt zijn.', verifiedReviews: 'geverifieerde beoordelingen', reviewsPending: 'Geverifieerde klantbeoordelingen verschijnen hier zodra ze beschikbaar zijn.',
    faq: 'FAQ', faqTitle: 'Vragen vóór de transformatie.', chooseTop: 'Kies hierboven een optie', availabilityPending: 'Beschikbaarheid wordt gevalideerd', buy: 'Kopen', status: 'Status bekijken',
    videoLabel: 'Inspiratievideo', videoReferenceDisclaimer: 'Redactionele referentiebeelden. Mogelijk wordt niet exact dezelfde SKU getoond.',
    calculatorTitle: 'Hoeveel panelen heb ik nodig?', calculatorBody: 'Vul de afmetingen van de wand in voor een snelle schatting op basis van de huidige paneelafmetingen.', wallWidth: 'Wandbreedte (m)', wallHeight: 'Wandhoogte (m)', estimate: 'Berekenen', estimatedPanels: 'Schatting', estimateDisclaimer: 'Indicatieve schatting. Controleer maten, zaagsneden, richting en snijverlies vóór de bestelling.',
    marketNote: 'Inhoud en marktregels worden aangepast op basis van het gedetecteerde land.',
  },
};

export function getOfferUICopy(lang: OfferLanguage): OfferUICopy {
  return COPY[lang] ?? COPY.en;
}
