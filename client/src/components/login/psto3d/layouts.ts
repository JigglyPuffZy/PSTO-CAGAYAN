import * as THREE from 'three';
import type { LoginFeatureId } from '../LoginFeatureContext';
import { CAGAYAN_MAP_PINS } from './philippinesMap';

const lo = new THREE.Color(0x2a66d6);
const hi = new THREE.Color(0x8fd0ff);

export function ramp(t: number) {
  return lo.clone().lerp(hi, Math.min(Math.max(t, 0), 1)).getHex();
}

export const MAP_PINS = CAGAYAN_MAP_PINS.map((p) => ({
  name: p.name,
  tip: p.tip,
}));

export type LayoutKey = LoginFeatureId;

export type BlockItem = {
  x: number;
  z: number;
  w: number;
  h: number;
  c: number;
  tip?: string;
};

export type ModuleLayout = {
  label: string;
  caption: string;
  view: { pos: [number, number, number]; look: [number, number, number]; anchor: number };
  items: BlockItem[] | null;
  pins?: boolean;
};

export const LAYOUTS: Record<LayoutKey, ModuleLayout> = {
  dashboard: {
    label: 'Dashboard',
    caption: 'Each bar is one month’s submissions. Hover a bar for the count.',
    view: { pos: [0, 5, 7], look: [0, 1.1, 0], anchor: 4.0 },
    items: [5, 8, 4, 11, 6, 9, 5, 12].map((v, i) => ({
      x: i - 3.5,
      z: 0,
      w: 0.7,
      h: v * 0.3,
      c: ramp(v / 12),
      tip: `Month ${i + 1}: ${v}`,
    })),
  },
  firms: {
    label: 'Firm registry',
    caption: 'Each building is a registered firm. Taller and lighter means more filings.',
    view: { pos: [0, 6, 6.5], look: [0, 0.5, 0], anchor: 3.2 },
    items: Array.from({ length: 16 }, (_, n) => {
      const r = Math.floor(n / 4);
      const c = n % 4;
      const filings = 4 + ((r * 7 + c * 3) % 5) * 2.5;
      return {
        x: (c - 1.5) * 1.35,
        z: (r - 1.5) * 1.35,
        w: 1.0,
        h: filings * 0.1 + 0.2,
        c: ramp((filings - 4) / 10),
        tip: `Firm ${n + 1}: ${Math.round(filings)} filings`,
      };
    }),
  },
  map: {
    label: 'Location maps',
    caption: 'Street map of Cagayan with district pins D1–D3. Hover a pin for the place name.',
    view: { pos: [0, 8.2, 5.4], look: [0, 0.35, 0], anchor: 2.15 },
    pins: true,
    items: [],
  },
};

export const LAYOUT_KEYS: LayoutKey[] = ['dashboard', 'firms', 'map'];

export function featureToLayout(id: LoginFeatureId): LayoutKey {
  return id;
}
