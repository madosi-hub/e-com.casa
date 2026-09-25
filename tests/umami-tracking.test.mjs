import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const compiledModule = { exports: {} };
  const mocks = {
    'next/script': { default: () => null },
    'next/navigation': { usePathname: () => global.window.location.pathname },
    react: { useEffect: () => {} },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
  };
  new Function('require', 'module', 'exports', code)(id => mocks[id], compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test('deduplicates pageviews across remounts and reloads while preserving queued events', () => {
  const storage = new Map();
  const sent = [];
  global.window = {
    location: { pathname: '/offers/nuralta-painel-ripado', href: 'https://e-com.casa/offers/nuralta-painel-ripado?utm_source=FB' },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    dispatchEvent: () => true,
    dataLayer: [],
  };
  const offer = load('src/lib/offers/analytics.ts');
  const umami = load('src/components/analytics/umami-tracking.tsx');

  offer.trackOfferEvent('offer_view', { offerSlug: 'painel-ripado', productSlug: 'nuralta' });
  assert.equal(window.ecomOfferAnalyticsQueue.length, 1);
  umami.flushOfferEvents();
  assert.equal(window.ecomOfferAnalyticsQueue.length, 1);

  window.umami = { track: (input, data) => {
    sent.push(typeof input === 'function'
      ? input({ website: 'fixture', url: window.location.href })
      : input === undefined ? { url: window.location.href } : { name: input, data });
  } };
  umami.trackPageView();
  umami.flushOfferEvents();
  assert.deepEqual(sent.map(event => event.name ?? 'pageview'), ['pageview', 'offer_view']);

  umami.trackPageView();
  Object.assign(window.location, { href: `${window.location.href}#fabrico-proprio` });
  umami.trackPageView();
  offer.trackOfferEvent('offer_view', { offerSlug: 'painel-ripado', productSlug: 'nuralta' });
  umami.flushOfferEvents();
  assert.equal(sent.length, 2);

  offer.trackOfferEvent('add_to_cart', { quantity: 1 });
  umami.flushOfferEvents();
  offer.trackOfferEvent('add_to_cart', { quantity: 1 });
  umami.flushOfferEvents();
  assert.equal(sent.filter(event => event.name === 'add_to_cart').length, 2);

  Object.assign(window.location, { pathname: '/offers/nuralta-painel-ripado/checkout', href: 'https://e-com.casa/offers/nuralta-painel-ripado/checkout' });
  umami.trackPageView();
  assert.equal(sent.filter(event => !event.name).length, 2);
  Object.assign(window.location, { pathname: '/offers/nuralta-painel-ripado', href: 'https://e-com.casa/offers/nuralta-painel-ripado' });
  umami.trackPageView();
  assert.equal(sent.filter(event => !event.name).length, 3);

  // A fresh module simulates a document reload, while sessionStorage survives.
  load('src/components/analytics/umami-tracking.tsx').trackPageView();
  assert.equal(sent.filter(event => !event.name).length, 3);

  delete window.umami;
  umami.trackCustomEvent('ui_click', { label: 'Pagar' });
  umami.flushCustomEvents();
  assert.equal(sent.filter(event => event.name === 'ui_click').length, 0);
  window.umami = { track: (input) => sent.push(input({ website: 'fixture', url: window.location.href })) };
  umami.flushCustomEvents();
  assert.equal(sent.filter(event => event.name === 'ui_click').length, 1);
  delete global.window;
});
