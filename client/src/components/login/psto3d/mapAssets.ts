import * as THREE from 'three';
import { getCachedPhilippinesMap, preloadPhilippinesOsmMap } from './osmMapTexture';
import { CAGAYAN_MAP_PINS, geoToPlane, previewMapLayout } from './philippinesMap';

const MAP_THICK = 0.14;

function applyMapTexture(
  mapMat: THREE.MeshStandardMaterial,
  pins: THREE.Group[],
  sheetW: number,
  sheetD: number,
  stitched: Awaited<ReturnType<typeof preloadPhilippinesOsmMap>>
) {
  if (mapMat.map) mapMat.map.dispose();
  mapMat.map = stitched.texture;
  mapMat.color.setHex(0xffffff);
  mapMat.emissive.setHex(0x000000);
  mapMat.needsUpdate = true;
  stitched.texture.needsUpdate = true;

  pins.forEach((pin, i) => {
    const p = CAGAYAN_MAP_PINS[i]!;
    const pos = geoToPlane(p.lat, p.lng, stitched.bounds, sheetW, sheetD);
    const baseY = MAP_THICK / 2 + 0.05;
    pin.position.set(pos.x, baseY, pos.z);
    pin.userData.baseY = baseY;
  });
}

export function createMapPin(index: number, tip: string) {
  const headColor = index === 0 ? 0x0057b7 : index === 1 ? 0x2e7ad1 : 0x5b9bd5;
  const group = new THREE.Group();
  group.userData.tip = tip;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.065, 0.2, 14),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  stem.position.y = 0.1;
  stem.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 24),
    new THREE.MeshStandardMaterial({
      color: headColor,
      roughness: 0.18,
      emissive: headColor,
      emissiveIntensity: 0.4,
    })
  );
  head.position.y = 0.34;
  head.castShadow = true;
  head.userData.tip = tip;

  const needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.48, 8),
    new THREE.MeshBasicMaterial({ color: 0xd4ecff, transparent: true, opacity: 0.9 })
  );
  needle.position.y = 0.68;

  group.add(stem, head, needle);
  return group;
}

export type MapSceneHandle = {
  mapGroup: THREE.Group;
  pins: THREE.Group[];
  sheet: THREE.Mesh;
  ready: Promise<void>;
  dispose: () => void;
};

export function buildMapSceneGroup(): MapSceneHandle {
  const mapGroup = new THREE.Group();
  const { bounds, sheetW, sheetD } = previewMapLayout();

  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x2a5a8a, roughness: 0.5 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(sheetW, MAP_THICK, sheetD), edgeMat);
  edge.position.y = -MAP_THICK / 2;
  edge.castShadow = true;

  const mapMat = new THREE.MeshStandardMaterial({
    color: 0x8eb5c8,
    roughness: 0.9,
    metalness: 0,
  });

  const mapSurface = new THREE.Mesh(new THREE.PlaneGeometry(sheetW, sheetD), mapMat);
  mapSurface.rotation.x = -Math.PI / 2;
  mapSurface.position.y = 0.004;
  mapSurface.castShadow = true;
  mapSurface.name = 'mapSheet';

  const pins = CAGAYAN_MAP_PINS.map((p, i) => {
    const pin = createMapPin(i, p.tip);
    const pos = geoToPlane(p.lat, p.lng, bounds, sheetW, sheetD);
    const baseY = MAP_THICK / 2 + 0.05;
    pin.position.set(pos.x, baseY, pos.z);
    pin.userData.baseY = baseY;
    return pin;
  });

  mapGroup.add(edge, mapSurface, ...pins);
  mapGroup.scale.setScalar(0.001);

  let disposed = false;

  const apply = (stitched: Awaited<ReturnType<typeof preloadPhilippinesOsmMap>>) => {
    if (disposed) return;
    applyMapTexture(mapMat, pins, sheetW, sheetD, stitched);
  };

  const ready = preloadPhilippinesOsmMap().then((stitched) => {
    if (disposed) {
      stitched.texture.dispose();
      return;
    }
    apply(stitched);
  });

  const cached = getCachedPhilippinesMap();
  if (cached) apply(cached);

  return {
    mapGroup,
    pins,
    sheet: mapSurface,
    ready,
    dispose: () => {
      disposed = true;
      mapMat.map?.dispose();
      mapMat.dispose();
      mapSurface.geometry.dispose();
      edge.geometry.dispose();
      edgeMat.dispose();
    },
  };
}
