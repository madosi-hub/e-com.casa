import { expect, mock, test } from 'bun:test';

let productReads = 0;

mock.module('@/lib/db', () => ({
  db: {
    $queryRaw: async () => [{ ok: 1 }],
    product: {
      count: async () => 1,
      findMany: async () => {
        productReads += 1;
        throw new Error('simulated database interruption');
      },
      findUnique: async () => null,
    },
    category: {
      findMany: async () => {
        throw new Error('simulated database interruption');
      },
    },
  },
}));

mock.module('@/lib/offers/store', () => ({
  getProductOffers: async () => [],
}));

const { getProducts } = await import('../src/lib/catalog/service');

test('concurrent catalogue reads share one database attempt and recover from the provider snapshot', async () => {
  const [first, second] = await Promise.all([
    getProducts({ perPage: 12 }),
    getProducts({ perPage: 12 }),
  ]);

  expect(productReads).toBe(1);
  expect(first.products).toHaveLength(12);
  expect(second.products.map((product) => product.slug)).toEqual(first.products.map((product) => product.slug));
  expect(first.total).toBeGreaterThan(300);
});
