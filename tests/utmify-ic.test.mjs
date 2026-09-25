import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function loadTrackingModule() {
  const code = ts.transpileModule(
    fs.readFileSync('src/components/analytics/utmify-tracking.tsx', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const compiledModule = { exports: {} };
  const mocks = {
    'next/script': { default: () => null },
    'next/navigation': { usePathname: () => '/' },
    react: { useEffect: () => {}, useState: () => [false, () => {}] },
    '@/lib/offers/attribution': { captureOfferAttribution: () => {} },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') },
  };
  new Function('require', 'module', 'exports', code)(id => mocks[id], compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test('UTMify IC is limited to checkout entry and uses its recognised trigger', () => {
  const tracking = loadTrackingModule();
  assert.equal(tracking.isCheckoutEntryPath('/offers/nuralta-painel-ripado/checkout'), true);
  assert.equal(tracking.isCheckoutEntryPath('/offers/nuralta-painel-ripado/checkout/'), true);
  assert.equal(tracking.isCheckoutEntryPath('/offers/nuralta-painel-ripado/checkout/sucesso'), false);
  assert.equal(tracking.isCheckoutEntryPath('/offers/nuralta-painel-ripado'), false);

  let clicks = 0;
  global.document = {
    getElementById: id => id === 'utmify-initiate-checkout-trigger'
      ? { click: () => { clicks += 1; } }
      : null,
  };
  tracking.dispatchUtmifyInitiateCheckout();
  assert.equal(clicks, 1);
  delete global.document;
});
