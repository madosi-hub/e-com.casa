import { expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const projectRoot = join(import.meta.dir, '..');
const offerRoot = join(projectRoot, 'src', 'components', 'offers', 'nuralta');
const publicRoot = join(projectRoot, 'public');
const catalogMediaSource = join(projectRoot, 'src', 'lib', 'catalog', 'nuralta-media.ts');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .flatMap((entry) => (statSync(entry).isDirectory() ? sourceFiles(entry) : [entry]))
    .filter((entry) => /\.(?:ts|tsx)$/.test(entry));
}

test('all static Nuralta funnel media are bundled with the storefront', () => {
  const referencedMedia = new Map<string, Set<string>>();

  for (const sourceFile of sourceFiles(offerRoot)) {
    const source = readFileSync(sourceFile, 'utf8');

    for (const match of source.matchAll(/["'](\/pt\/[^"'?]+)(?:\?[^"']*)?["']/g)) {
      const mediaPath = match[1];
      const sources = referencedMedia.get(mediaPath) ?? new Set<string>();
      sources.add(relative(projectRoot, sourceFile));
      referencedMedia.set(mediaPath, sources);
    }
  }

  const missingMedia = [...referencedMedia.entries()]
    .filter(([mediaPath]) => !existsSync(join(publicRoot, mediaPath)))
    .map(([mediaPath, sources]) => `${mediaPath} (${[...sources].join(', ')})`);

  expect(referencedMedia.size).toBeGreaterThan(0);
  expect(missingMedia).toEqual([]);
});

test('all Nuralta accessory media are bundled with the storefront', () => {
  const source = readFileSync(catalogMediaSource, 'utf8');
  const referencedMedia = [...source.matchAll(/["'](\/images\/nuralta-accessories\/[^"']+)["']/g)]
    .map((match) => match[1]);
  const missingMedia = referencedMedia.filter((mediaPath) => !existsSync(join(publicRoot, mediaPath)));

  expect(referencedMedia).toHaveLength(9);
  expect(new Set(referencedMedia).size).toBe(9);
  expect(missingMedia).toEqual([]);
  expect(source).not.toContain('discordapp.com');
});
