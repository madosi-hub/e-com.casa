import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { GALLERY, INITIAL_GALLERY_INDEX } from '../src/components/offers/nuralta/data';

const root = process.cwd();
const template = readFileSync(`${root}/src/components/offers/painel-ripado/page.tsx`, 'utf8');
const sharedRoute = readFileSync(`${root}/src/components/offers/product-funnel-page.tsx`, 'utf8');
const resolver = readFileSync(`${root}/src/lib/offers/resolver.ts`, 'utf8');
const configurator = readFileSync(`${root}/src/components/offers/painel-ripado/configurator.tsx`, 'utf8');
const sections = readFileSync(`${root}/src/components/offers/painel-ripado/sections.tsx`, 'utf8');
const siteChrome = readFileSync(`${root}/src/components/layout/site-chrome.tsx`, 'utf8');
const cartDrawer = readFileSync(`${root}/src/components/cart/cart-drawer.tsx`, 'utf8');
const runtimeWidgets = readFileSync(`${root}/src/components/layout/runtime-widgets.tsx`, 'utf8');
const utmifyTracking = readFileSync(`${root}/src/components/analytics/utmify-tracking.tsx`, 'utf8');
const umamiTracking = readFileSync(`${root}/src/components/analytics/umami-tracking.tsx`, 'utf8');
const nuraltaTemplate = readFileSync(`${root}/src/components/offers/nuralta/page.tsx`, 'utf8');
const nuraltaConfigurator = readFileSync(`${root}/src/components/offers/nuralta/product-configurator.tsx`, 'utf8');
const nuraltaFooter = readFileSync(`${root}/src/components/offers/nuralta/footer.tsx`, 'utf8');
const nuraltaCart = readFileSync(`${root}/src/components/offers/nuralta/cart-overlay.tsx`, 'utf8');
const painelCheckout = readFileSync(`${root}/src/components/checkout/painel-ripado-checkout.tsx`, 'utf8');
const dynamicCheckout = readFileSync(`${root}/src/app/offers/[slug]/checkout/page.tsx`, 'utf8');
const dynamicCheckoutSuccess = readFileSync(`${root}/src/app/offers/[slug]/checkout/sucesso/page.tsx`, 'utf8');
const dynamicInformation = readFileSync(`${root}/src/app/offers/[slug]/informacao/[legalSlug]/page.tsx`, 'utf8');

test('every product offer reuses the approved complete funnel', () => {
  expect(sharedRoute).toContain('<PainelRipadoOfferPage {...props} />');
  for (const block of [
    '<PanelConfigurator',
    '<PanelFactoryStory',
    '<PanelCampaignStory',
    '<PanelProductDetails',
    '<PanelInspiration',
    '<PanelReviews',
    '<PanelFaq',
    '<PanelFooter',
  ]) {
    expect(template).toContain(block);
  }
});

test('offer and admin routes are self-contained and do not duplicate global chrome', () => {
  for (const copy of [
    'Painel Ripado Decorativo',
    'Preço direto da fábrica',
    'Como conseguimos este preço?',
    'Quantos painéis preciso?',
    'Pague como preferir',
  ]) {
    expect(configurator).toContain(copy);
  }

  for (const copy of [
    'Da nossa fábrica.',
    'Somos a E-com.casa — e fabricamos os painéis que vendemos.',
    'Fábrica E-com.casa',
    'Conhecer os nossos painéis',
    'Um detalhe que muda a forma de sentir o espaço.',
    'Cada detalhe,',
    'Espaços que ganharam outra vida.',
    'Galeria visual do produto',
    'Antes de decidir, tenha todas as respostas.',
  ]) {
    expect(sections).toContain(copy);
  }

  expect(sections).not.toContain('/pt/videos/nuralta-hist.mp4');

  expect(siteChrome).toContain("pathname.startsWith('/offers/') || pathname.startsWith('/admin')");
  expect(siteChrome).toContain('!selfContainedRoute && <PromotionInfo />');
  expect(siteChrome).toContain('!selfContainedRoute && <SiteFooter />');
  expect(template).toContain('/images/logo-e-com-casa-preto.png');
});

test('public analytics loads automatically without rendering a cookie banner', () => {
  expect(runtimeWidgets).not.toContain('<CookieConsent />');
  expect(runtimeWidgets).toContain('<UtmifyTracking />');
  expect(utmifyTracking).not.toContain('useCookieConsent');
  expect(utmifyTracking).toContain("const enabled = !pathname.startsWith('/admin')");
  expect(umamiTracking).not.toContain('useCookieConsent');
  expect(umamiTracking).toContain("const enabled = !pathname.startsWith('/admin')");
});

test('the configurator calls out and animates missing selections before purchase', () => {
  expect(configurator).toContain('const [selectionGuidanceVisible, setSelectionGuidanceVisible] = useState(false)');
  expect(configurator).toContain('setSelectionGuidanceVisible(true)');
  expect(configurator).toContain('Falta selecionar a cor e a medida.');
  expect(configurator).toContain('Para aumentar a quantidade, falta selecionar a cor e a medida.');
  expect(configurator).toContain("aria-disabled={!hasRequiredSelections}");
  expect(configurator).toContain('onClick={increaseQuantity}');
  expect(configurator).toContain('ecom-pending-option');
  expect(configurator).toContain('Pendente');
  expect(configurator).toContain("selectionGuidanceVisible ? missingSelectionMessage : ''");
  expect(configurator).toContain('selectionGuidanceVisible && colorIndex === null');
  expect(configurator).toContain('selectionGuidanceVisible && sizeIndex === null');
  expect(configurator.indexOf('visibleSelectionMessage')).toBeLessThan(configurator.indexOf('id="primary-buy-button"'));
  expect(template).toContain('@keyframes ecomPendingOption');
});

test('the funnel keeps the complete ten-question objection handling block', () => {
  expect((resolver.match(/question:/g) ?? []).length).toBe(10);
});

test('the painel-ripado public alias remains available for the ODEM funnel', () => {
  expect(resolver).toContain("requestedSlug === 'painel-ripado'");
  expect(resolver).toContain("candidate.productSlug === 'odem-painel-ripado-acustico-carvalho'");
  expect(resolver).toContain('configForProduct(product, requestedSlug, reviews)');
});

test('the Nuralta slug uses the same approved funnel as the painel-ripado alias', () => {
  expect(sharedRoute).not.toContain("props.offer.slug === 'nuralta-painel-ripado'");
  expect(sharedRoute).not.toContain('NuraltaPainelRipadoOfferPage');
  expect(sharedRoute.match(/<PainelRipadoOfferPage \{\.\.\.props\} \/>/g)).toHaveLength(1);

  // Keep the former source funnel covered while its assets and components remain
  // available to the storefront.
  for (const block of [
    '<TopTicker',
    '<Header',
    '<ProductConfigurator',
    '<FactoryPrice',
    '<Transformation',
    '<ProductDetails',
    '<Inspiration',
    '<Reviews',
    '<Faq',
    '<Footer',
    '<MobileBuyBar',
  ]) {
    expect(nuraltaTemplate).toContain(block);
  }
  expect(nuraltaConfigurator).toContain('openNuraltaCart()');
  expect(nuraltaConfigurator).toContain('nuralta-panel-c${color}-s${size}');
  expect(nuraltaCart).toContain('O meu carrinho');
  expect(nuraltaCart).toContain('Finalizar encomenda');
  expect(nuraltaCart).toContain('router.push(withOfferAttribution(panelOfferPath(offerSlug, "/checkout"), offerSlug))');
  expect(nuraltaCart).toContain('Kit de instalação completo');
  expect(nuraltaCart).toContain('Fita LED Nuralta + Controlo RGB');
  expect(nuraltaFooter).toContain('Nuralta Interiores, Unipessoal Lda. · NIF 517 946 327');
  expect(nuraltaFooter).toContain('Impulsionada pela marca @E-Com.Casa');
});

test('both panel offer URLs keep their incoming slug through checkout and information pages', () => {
  expect(cartDrawer).toContain('panelOfferSlugFromPathname(pathname)');
  expect(cartDrawer).toContain("panelOfferPath(panelOfferSlug, '/checkout')");
  expect(runtimeWidgets).toContain('panelOfferSlugFromPathname(pathname) !== null');
  expect(painelCheckout).toContain("panelOfferPath(offerSlug, '/checkout')");
  expect(dynamicCheckout).toContain('isPanelOfferSlug(slug)');
  expect(dynamicCheckoutSuccess).toContain('offer: slug');
  expect(dynamicInformation).toContain('offerSlug={slug}');
});

test('the dedicated checkout derives the required surname and reveals CTT delivery after the postal code', () => {
  expect(painelCheckout).not.toContain("field('lastName'");
  expect(painelCheckout).not.toContain('id="co-shipping"');
  expect(painelCheckout).not.toContain('id="co-notes"');
  expect(painelCheckout).not.toContain('id="co-country"');
  expect(painelCheckout).not.toContain("field('phone'");
  expect(painelCheckout).toContain('phone: null');
  expect(painelCheckout).toContain('lastName: form.firstName.trim()');
  expect(painelCheckout).toContain('loadShippingQuote();');
  expect(painelCheckout).toContain("shippingQuoteStatus === 'loading'");
  expect(painelCheckout).toContain("shippingQuoteStatus === 'ready'");
  expect(painelCheckout).toContain('/pt/images/logo-ctt-express.svg');
});

test('the Nuralta gallery always starts on an available campaign image', () => {
  expect(GALLERY.length).toBeGreaterThan(0);
  expect(INITIAL_GALLERY_INDEX).toBe(GALLERY.length - 1);
  expect(GALLERY[INITIAL_GALLERY_INDEX]).toBeDefined();
  expect(nuraltaConfigurator).toContain('useState(INITIAL_GALLERY_INDEX)');
  expect(nuraltaConfigurator).not.toContain('useState(7)');
});
