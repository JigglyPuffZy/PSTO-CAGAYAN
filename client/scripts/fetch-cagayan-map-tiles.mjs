import { writeFileSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';

/** Must match `BUNDLED_CAGAYAN_TILES` in philippinesMap.ts */
const z = 8;
const minX = 214;
const maxX = 214;
const minY = 114;
const maxY = 115;

const dir = join('public', 'maps');
mkdirSync(dir, { recursive: true });

for (const name of readdirSync(dir)) {
  if (name.startsWith('cagayan-') && name.endsWith('.png')) {
    unlinkSync(join(dir, name));
  }
}

for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'PSTO-Cagayan-Portal/1.0 (login preview; educational)' },
    });
    if (!r.ok) throw new Error(`Failed ${url} ${r.status}`);
    writeFileSync(join(dir, `cagayan-${z}-${x}-${y}.png`), Buffer.from(await r.arrayBuffer()));
    console.log('saved', z, x, y);
  }
}

console.log('Done. Cagayan tiles at lon ~121°E (not 217 — that was wrong).');
