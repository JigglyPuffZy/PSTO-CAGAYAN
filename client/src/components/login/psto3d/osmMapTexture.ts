import * as THREE from 'three';
import {
  BUNDLED_CAGAYAN_TILES,
  OSM_TILE_SIZE,
  previewMapGeoBounds,
  previewTileRange,
  type GeoBounds,
} from './philippinesMap';

const TILE_URLS = [
  (x: number, y: number, z: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
];

function loadImage(url: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`map image: ${url}`));
    img.src = url;
  });
}

async function loadTile(x: number, y: number, z: number): Promise<HTMLImageElement> {
  let lastErr: unknown;
  for (const urlOf of TILE_URLS) {
    try {
      return await loadImage(urlOf(x, y, z), true);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function bundledTileUrl(x: number, y: number, z: number) {
  const base = import.meta.env.BASE_URL ?? '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}maps/cagayan-${z}-${x}-${y}.png?v=cagayan214`;
}

export type StitchedMap = {
  texture: THREE.CanvasTexture;
  bounds: GeoBounds;
  canvas: HTMLCanvasElement;
};

const MAP_CACHE_VERSION = 'cagayan214-v2';

let cachedMap: Promise<StitchedMap> | null = null;
let cachedResult: StitchedMap | null = null;
let cachedVersion = '';

export function getCachedPhilippinesMap() {
  return cachedResult;
}

export function preloadPhilippinesOsmMap(): Promise<StitchedMap> {
  if (cachedVersion !== MAP_CACHE_VERSION) {
    cachedResult?.texture.dispose();
    cachedResult = null;
    cachedMap = null;
    cachedVersion = MAP_CACHE_VERSION;
  }
  if (!cachedMap) {
    cachedMap = loadMapInternal().then((result) => {
      cachedResult = result;
      return result;
    });
  }
  return cachedMap;
}

function drawCanvasFallback(bounds: GeoBounds): StitchedMap {
  const W = 768;
  const H = 576;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#aad3df';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8eddd';
  g.beginPath();
  g.moveTo(W * 0.1, H * 0.4);
  g.lineTo(W * 0.9, H * 0.3);
  g.lineTo(W * 0.85, H * 0.75);
  g.lineTo(W * 0.15, H * 0.7);
  g.closePath();
  g.fill();
  g.fillStyle = '#2a66d6';
  g.font = '600 16px system-ui,sans-serif';
  g.fillText('Cagayan Province', 16, H - 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { texture: tex, bounds, canvas: c };
}

function finalizeCanvas(canvas: HTMLCanvasElement, bounds: GeoBounds): StitchedMap {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { texture, bounds, canvas };
}

/** Local tiles ship with the app — always show a real street map in the 3D preview. */
async function loadFromBundledTiles(): Promise<StitchedMap> {
  const bounds = previewMapGeoBounds();
  const { minX, maxX, minY, maxY, zoom } = BUNDLED_CAGAYAN_TILES;
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const canvas = document.createElement('canvas');
  canvas.width = cols * OSM_TILE_SIZE;
  canvas.height = rows * OSM_TILE_SIZE;
  const g = canvas.getContext('2d')!;

  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      const img = await loadImage(bundledTileUrl(tx, ty, zoom));
      g.drawImage(img, (tx - minX) * OSM_TILE_SIZE, (ty - minY) * OSM_TILE_SIZE);
    }
  }

  return finalizeCanvas(canvas, bounds);
}

async function loadFromNetworkTiles(): Promise<StitchedMap | null> {
  const bounds = previewMapGeoBounds();
  const { range, zoom } = previewTileRange();
  const cols = range.maxX - range.minX + 1;
  const rows = range.maxY - range.minY + 1;
  const canvas = document.createElement('canvas');
  canvas.width = cols * OSM_TILE_SIZE;
  canvas.height = rows * OSM_TILE_SIZE;
  const g = canvas.getContext('2d')!;

  let ok = 0;
  for (let ty = range.minY; ty <= range.maxY; ty++) {
    for (let tx = range.minX; tx <= range.maxX; tx++) {
      try {
        const img = await loadTile(tx, ty, zoom);
        g.drawImage(img, (tx - range.minX) * OSM_TILE_SIZE, (ty - range.minY) * OSM_TILE_SIZE);
        ok++;
      } catch {
        /* skip tile */
      }
    }
  }
  if (ok === 0) return null;
  return finalizeCanvas(canvas, bounds);
}

async function loadMapInternal(): Promise<StitchedMap> {
  try {
    return await loadFromBundledTiles();
  } catch {
    const net = await loadFromNetworkTiles();
    if (net) return net;
    return drawCanvasFallback(previewMapGeoBounds());
  }
}

export async function loadPhilippinesOsmMap(): Promise<StitchedMap> {
  return preloadPhilippinesOsmMap();
}
