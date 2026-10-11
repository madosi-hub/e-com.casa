import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
import { importStorefrontCatalog } from '../scripts/catalog/import-storefront.mjs';

const root = process.cwd();
const nativeRequire = createRequire(import.meta.url);
const slug = 'ikea-fado-candeeiro-mesa-branco';

// Execute the real resolver, catalogue and repricing engine with an offline DB.
// No payment request, persistent cart mutation or external write is performed.
function application(offers = []) {
  const modules = new Map();
  const overrides = {
    react: { cache: fn => fn },
    '@/lib/db': { db: { $queryRaw: async () => { throw new Error('Offline test database'); } } },
    '@/lib/offers/store': { getProductOffers: async () => offers },
  };
  function load(filename) {
    const absolute = path.resolve(root, filename);
    if (modules.has(absolute)) return modules.get(absolute).exports;
    const loadedModule = { exports: {} };
    modules.set(absolute, loadedModule);
    const compiled = ts.transpileModule(readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const resolve = name => {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      return ['', '.ts', '.tsx', '/index.ts'].map(extension => base + extension).find(candidate => existsSync(candidate) && /\.(ts|tsx)$/.test(candidate));
    };
    const require = name => {
      if (name in overrides) return overrides[name];
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = resolve(name);
        if (!target) throw new Error(`Unresolved test import ${name} from ${filename}`);
        if (target.endsWith(`${path.sep}offers${path.sep}store.ts`)) return overrides['@/lib/offers/store'];
        return load(target);
      }
      return nativeRequire(name);
    };
    new Function('require', 'module', 'exports', '__dirname', '__filename', compiled)(require, loadedModule, loadedModule.exports, path.dirname(absolute), absolute);
    return loadedModule.exports;
  }
  return load;
}

test('the dedicated FADO route resolves the PT product at 13.99 EUR with finite stock', async () => {
  const load = application();
  const { resolveOffer } = load('src/lib/offers/resolver.ts');
  const resolved = await resolveOffer('fado-table-lamp');
  assert.ok(resolved);
  assert.equal(resolved.product.slug, slug);
  assert.equal(resolved.product.priceCents, 1399);
  assert.equal(resolved.product.currency, 'EUR');
  assert.equal(resolved.product.stock, 20000);
  assert.equal(resolved.product.stockKnown, true);
  assert.equal(resolved.product.stockUnlimited, false);
  assert.equal(resolved.product.supplierProductId, '800.963.72');
  assert.deepEqual(resolved.offer.markets, ['PT']);
  assert.equal(resolved.offer.reviews.mode, 'none');
  const alias = await resolveOffer('fado');
  assert.equal(alias.product.slug, slug);
  assert.equal(alias.offer.slug, 'fado-table-lamp');
  assert.equal(await resolveOffer('unknown-offer'), null);
  for (const src of [resolved.product.image, ...resolved.product.gallery.split(',')]) {
    assert.ok(existsSync(path.join(root, 'public', src)), `Missing FADO media: ${src}`);
  }
});

test('a merchant can explicitly disable the dedicated FADO route', async () => {
  const load = application([{ productSlug: slug, slug: 'fado-table-lamp', enabled: false }]);
  assert.equal(await load('src/lib/offers/resolver.ts').resolveOffer('fado-table-lamp'), null);
  assert.equal(await load('src/lib/offers/resolver.ts').resolveOffer('fado'), null);
});

test('checkout reprices FADO from the catalogue and rejects quantities above 20000', async () => {
  const { repriceCart } = application()('src/lib/checkout.ts');
  const totals = await repriceCart({ items: [{ slug, quantity: 2 }], country: 'PT', shippingMethod: 'standard' });
  assert.equal(totals.subtotal, 27.98);
  assert.equal(totals.currency, 'EUR');
  assert.equal(totals.lineItems[0].price, '13.99');
  await assert.rejects(() => repriceCart({ items: [{ slug, quantity: 20001 }], country: 'PT', shippingMethod: 'standard' }), /20000/);
  await assert.rejects(() => repriceCart({ items: [{ slug, quantity: 10001 }, { slug, quantity: 10000 }], country: 'PT', shippingMethod: 'standard' }), /20000/);
});

test('reimporting FADO never resets stock, availability or a merchant publication decision', async () => {
  const rows = new Map();
  const client = {
    category: { upsert: async () => ({}) },
    product: { upsert: async ({ where, create, update }) => {
      const previous = rows.get(where.sku);
      const row = previous ? { ...previous, ...update } : { ...create };
      rows.set(where.sku, row);
      return row;
    } },
  };
  await importStorefrontCatalog(client);
  const sku = 'EC-IKEA-FADO-80096372';
  let row = rows.get(sku);
  assert.equal(row.stock, 20000);
  assert.equal(row.priceCents, 1399);
  row.stock = 19997;
  await importStorefrontCatalog(client);
  row = rows.get(sku);
  assert.equal(row.stock, 19997);
  row.stock = 0;
  row.availability = 'outOfStock';
  row.published = false;
  await importStorefrontCatalog(client);
  row = rows.get(sku);
  assert.equal(row.stock, 0);
  assert.equal(row.availability, 'outOfStock');
  assert.equal(row.published, false);
});
