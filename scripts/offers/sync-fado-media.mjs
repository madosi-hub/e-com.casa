import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Exact white FADO product photographs from the Portuguese manufacturer page.
// The orange smart-bulb scene is deliberately excluded from the white offer.
const photos = {
  product: '0606976_pe682645',
  'living-room': '1158342_pe888106',
  detail: '0176843_pe267072',
  evening: '0969841_ph174718',
  sideboard: '0340391_pe217413',
  'reading-corner': '1061714_ph177857',
};
const destination = path.resolve('public/images/offers/fado');
await mkdir(destination, { recursive: true });
for (const [name, id] of Object.entries(photos)) {
  const url = `https://www.ikea.com/pt/pt/images/products/fado-candeeiro-de-mesa-branco__${id}_s5.jpg?f=xl`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`FADO photo ${name}: HTTP ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer()))
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(destination, `${name}.webp`));
  console.log(`Saved ${name}.webp`);
}
