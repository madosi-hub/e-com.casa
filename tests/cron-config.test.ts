import { expect, test } from 'bun:test';
import config from '../vercel.json';

test('runs the secured order advancement cron every hour', () => {
  expect(config.crons).toContainEqual({
    path: '/api/internal/orders/advance',
    schedule: '0 * * * *',
  });
});
