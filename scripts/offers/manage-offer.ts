import { readFileSync } from 'node:fs';
import { db } from '../../src/lib/db';
import { saveProductOffer } from '../../src/lib/offers/store';

const [file, actor] = process.argv.slice(2);

if (!file || !actor) {
  throw new Error('Usage: bun scripts/offers/manage-offer.ts offer.json operator-identity');
}

try {
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const result = await saveProductOffer(input, actor);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.$disconnect();
}
