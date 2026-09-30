import { expect, test } from 'bun:test';
import config from '../vercel.json';

test('runs the secured order advancement cron once a day', () => {
  expect(config.crons).toContainEqual({
    path: '/api/internal/orders/advance',
    schedule: '0 6 * * *',
  });
});
