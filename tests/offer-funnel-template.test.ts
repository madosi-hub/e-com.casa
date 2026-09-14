import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const template = readFileSync(`${root}/src/components/offers/painel-ripado/page.tsx`, 'utf8');
const sharedRoute = readFileSync(`${root}/src/components/offers/product-funnel-page.tsx`, 'utf8');
const resolver = readFileSync(`${root}/src/lib/offers/resolver.ts`, 'utf8');
const configurator = readFileSync(`${root}/src/components/offers/painel-ripado/configurator.tsx`, 'utf8');
const sections = readFileSync(`${root}/src/components/offers/painel-ripado/sections.tsx`, 'utf8');
const siteChrome = readFileSync(`${root}/src/components/layout/site-chrome.tsx`, 'utf8');
const nuraltaTemplate = readFileSync(`${root}/src/components/offers/nuralta/page.tsx`, 'utf8');
const nuraltaConfigurator = readFileSync(`${root}/src/components/offers/nuralta/product-configurator.tsx`, 'utf8');
const nuraltaFooter = readFileSync(`${root}/src/components/offers/nuralta/footer.tsx`, 'utf8');
const nuraltaCart = readFileSync(`${root}/src/components/offers/nuralta/cart-overlay.tsx`, 'utf8');

test('every product offer reuses the approved complete funnel', () => {
  expect(sharedRoute).toContain('<PainelRipadoOfferPage {...props} />');
  for (const block of [
    '<PanelConfigurator',
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
    'Pague como preferir',
    'Pagamento protegido',
    'Entrega acompanhada',
    'Apoio pós-venda',
  ]) {
    expect(configurator).toContain(copy);
  }

  for (const copy of [
    'Do fabricante.',
    'Cada detalhe,',
    'Espaços que ganharam outra vida.',
    'Galeria visual do produto',
    'Antes de decidir, tenha todas as respostas.',
  ]) {
    expect(sections).toContain(copy);
  }

  expect(siteChrome).toContain("pathname.startsWith('/offers/') || pathname.startsWith('/admin')");
  expect(siteChrome).toContain('!selfContainedRoute && <PromotionInfo />');
  expect(siteChrome).toContain('!selfContainedRoute && <SiteFooter />');
});

test('the funnel keeps the complete ten-question objection handling block', () => {
  expect((resolver.match(/question:/g) ?? []).length).toBe(10);
});

test('the painel-ripado public alias remains available for the ODEM funnel', () => {
  expect(resolver).toContain("requestedSlug === 'painel-ripado'");
  expect(resolver).toContain("candidate.productSlug === 'odem-painel-ripado-acustico-carvalho'");
  expect(resolver).toContain('configForProduct(product, requestedSlug, reviews)');
});

test('the dedicated Nuralta offer preserves the complete approved source funnel and central checkout', () => {
  expect(sharedRoute).toContain("props.offer.slug === 'nuralta-painel-ripado'");
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
  expect(nuraltaCart).toContain('router.push("/checkout")');
  expect(nuraltaCart).toContain('Kit de instalação completo');
  expect(nuraltaCart).toContain('Fita LED Nuralta + Controlo RGB');
  expect(nuraltaFooter).toContain('Nuralta Interiores, Unipessoal Lda. · NIF 517 946 327');
  expect(nuraltaFooter).toContain('Impulsionada pela marca @E-Com.Casa');
});
