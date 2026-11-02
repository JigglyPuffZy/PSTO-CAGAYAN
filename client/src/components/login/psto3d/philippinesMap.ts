/** Geographic pins for PSTO Cagayan districts (same coords as the Maps page). */
export const CAGAYAN_CENTER = { lat: 18.2466, lng: 121.8733 } as const;

export type MapPinDef = {
  name: string;
  lat: number;
  lng: number;
  place: string;
  tip: string;
};

export const CAGAYAN_MAP_PINS: MapPinDef[] = [
  {
    name: 'D1',
    lat: 17.6131,
    lng: 121.727,
    place: 'Tuguegarao City',
    tip: 'District 1 · Tuguegarao City',
  },
  {
    name: 'D2',
    lat: 17.6828,
    lng: 121.7429,
    place: 'Solana',
    tip: 'District 2 · Central Cagayan',
  },
  {
    name: 'D3',
    lat: 18.3553,
    lng: 121.6417,
    place: 'Aparri',
    tip: 'District 3 · Northern Cagayan',
  },
];

export type GeoBounds = { west: number; east: number; south: number; north: number };

/** Full-country fallback bounds */
export const PH_VIEW: GeoBounds = {
  west: 116,
  east: 127.2,
  south: 4.5,
  north: 21.3,
};

/** Login 3D preview: zoomed map of Cagayan (readable streets + pin placement). */
export const CAGAYAN_MAP_VIEW: GeoBounds = {
  west: 121.32,
  east: 122.18,
  north: 18.58,
  south: 17.32,
};

export const OSM_TILE_ZOOM = 5;
export const PREVIEW_TILE_ZOOM = 8;
export const OSM_TILE_SIZE = 256;
export const MAX_OSM_TILES = 16;

/** Bundled Carto tiles in `public/maps/` (see scripts/fetch-cagayan-map-tiles.mjs). */
export const BUNDLED_CAGAYAN_TILES = {
  zoom: PREVIEW_TILE_ZOOM,
  minX: 214,
  maxX: 214,
  minY: 114,
  maxY: 115,
} as const;

export function previewTileRange() {
  const { zoom, minX, maxX, minY, maxY } = BUNDLED_CAGAYAN_TILES;
  return { range: { minX, maxX, minY, maxY }, zoom };
}

export function previewMapGeoBounds(): GeoBounds {
  const { range, zoom } = previewTileRange();
  return {
    west: tileToLng(range.minX, zoom),
    east: tileToLng(range.maxX + 1, zoom),
    north: tileToLat(range.minY, zoom),
    south: tileToLat(range.maxY + 1, zoom),
  };
}

export function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

export function tileToLng(x: number, zoom: number) {
  const n = 2 ** zoom;
  return (x / n) * 360 - 180;
}

export function tileToLat(y: number, zoom: number) {
  const n = 2 ** zoom;
  const rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return (rad * 180) / Math.PI;
}

export function geoToPlane(
  lat: number,
  lng: number,
  bounds: GeoBounds,
  sheetW: number,
  sheetD: number
) {
  const u = (lng - bounds.west) / (bounds.east - bounds.west);
  const v = (bounds.north - lat) / (bounds.north - bounds.south);
  return {
    x: (u - 0.5) * sheetW,
    z: (v - 0.5) * sheetD,
  };
}

export function tileRangeForBounds(bounds: GeoBounds, zoom: number) {
  const nw = latLngToTile(bounds.north, bounds.west, zoom);
  const se = latLngToTile(bounds.south, bounds.east, zoom);
  return {
    minX: Math.min(nw.x, se.x),
    maxX: Math.max(nw.x, se.x),
    minY: Math.min(nw.y, se.y),
    maxY: Math.max(nw.y, se.y),
  };
}

export function previewMapLayout() {
  const { range } = previewTileRange();
  const cols = range.maxX - range.minX + 1;
  const rows = range.maxY - range.minY + 1;
  const sheetW = 5.6;
  const sheetD = sheetW * (rows / cols);
  return { bounds: previewMapGeoBounds(), sheetW, sheetD };
}

export function cagayanPinPlanePositions() {
  const { bounds, sheetW, sheetD } = previewMapLayout();
  return CAGAYAN_MAP_PINS.map((p) => geoToPlane(p.lat, p.lng, bounds, sheetW, sheetD));
}
