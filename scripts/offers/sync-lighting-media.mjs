import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const shopify = [
  ['casper-glow', 'https://casper.com/products/glow'],
  ['tala-the-muse', 'https://tala.co.uk/products/the-muse-portable-lamp-in-hackles-black'],
  ['wooj-mini-wavy', 'https://wooj.design/products/cordless-mini-wavy-lamp'],
];
const sources = {};
for (const [slug, url] of shopify) {
  const response = await fetch(`${url}.js`);
  if (!response.ok) throw new Error(`Cannot retrieve ${slug}`);
  const product = await response.json();
  sources[slug] = product.images.filter(src => !/\.gif(?:\?|$)/i.test(src)).slice(0, 3).map(src => src.startsWith('//') ? `https:${src}` : src);
}
sources['govee-table-lamp-2'] = [
  'https://cdn.shopify.com/s/files/1/0558/4712/5176/files/6022.png?v=1743394171',
  'https://cdn.shopify.com/s/files/1/0558/4712/5176/files/Govee_Table_Lamp_2-64_Preset_Animated_Scenes.jpg?v=1743394171',
];
const gantri = await (await fetch('https://www.gantri.com/products/10101/kobble-table-light-by-karim-rashid?sku=10101-sm-carbon')).text();
sources['gantri-kobble'] = [...new Set([...gantri.matchAll(/<meta[^>]+property="og:image"[^>]+content="([^"]+)/g)].map(match => match[1]))].slice(0, 3);
sources['wiz-a60-rgb-comando'] = ['https://www.assets.signify.com/is/image/Signify/2edaa7f0eace4021b1a3ac5b007f42af?wid=1000&qlt=85'];
for (const [slug, urls] of Object.entries(sources)) {
  if (!urls.length) throw new Error(`No manufacturer images for ${slug}`);
  const dir = `public/images/lighting/${slug}`;
  await mkdir(dir, { recursive: true });
  for (const [index, url] of urls.entries()) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Cannot retrieve image for ${slug}`);
    await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${dir}/${index}.webp`);
  }
  console.log(`Saved manufacturer images: ${slug}`);
}
await writeFile('data/catalog/lighting-media-sources.json', JSON.stringify(sources, null, 2) + '\n');
