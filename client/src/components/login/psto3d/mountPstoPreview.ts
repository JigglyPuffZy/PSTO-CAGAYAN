import * as THREE from 'three';
import { buildMapSceneGroup } from './mapAssets';
import { LAYOUTS, MAP_PINS, type LayoutKey } from './layouts';
import { setPreviewOverlayState, setPreviewTooltip } from './previewStore';

const MAX = 64;
const BG = 0x04234f;

export type PstoPreviewHandle = {
  goTo: (name: LayoutKey) => void;
  destroy: () => void;
};

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(40,110,210,.55)');
  grad.addColorStop(0.6, 'rgba(20,80,170,.25)');
  grad.addColorStop(1, 'rgba(10,60,140,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MAP_TILT_ON = -0.52;
const MAP_LIFT_ON = 0.48;
const MAP_ROLL_ON = 0.08;

export function mountPstoPreview(stage: HTMLElement, initial: LayoutKey = 'dashboard'): PstoPreviewHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    return null;
  }

  renderer.domElement.className = 'login-three-gl psto-canvas';
  stage.prepend(renderer.domElement);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 12, 26);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(BG, 1);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x0a2a5e, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(2.5, 14, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false })
  );
  glow.position.y = -0.01;
  scene.add(glow);

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.48 })
  );
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  blockGeo.translate(0, 0.5, 0);
  const blocks = new THREE.InstancedMesh(
    blockGeo,
    new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }),
    MAX
  );
  blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  blocks.castShadow = true;
  blocks.receiveShadow = true;
  blocks.frustumCulled = false;
  scene.add(blocks);

  type BlockState = { x: number; z: number; w: number; h: number; c: THREE.Color };
  type TargetState = BlockState & { tip: string | null; at: number };

  const cur: BlockState[] = [];
  const tgt: TargetState[] = [];
  for (let i = 0; i < MAX; i++) {
    cur.push({ x: 0, z: 0, w: 0.001, h: 0.001, c: new THREE.Color(0x2a66d6) });
    tgt.push({
      x: 0,
      z: 0,
      w: 0.001,
      h: 0.001,
      c: new THREE.Color(0x2a66d6),
      tip: null,
      at: 0,
    });
    blocks.setColorAt(i, cur[i]!.c);
  }

  const mapScene = buildMapSceneGroup();
  scene.add(mapScene.mapGroup);
  const { pins: mapPins, sheet: mapSheet } = mapScene;
  mapScene.ready.then(() => frame());
  let mapScale = 0.001;
  let mapTarget = 0;
  let mapTilt = 0;
  let mapLift = 0;
  let mapRoll = 0;

  let active: LayoutKey = 'dashboard';
  const viewPos = new THREE.Vector3();
  const viewLook = new THREE.Vector3();
  const camPos = new THREE.Vector3(...LAYOUTS.dashboard.view.pos);
  const camLook = new THREE.Vector3(...LAYOUTS.dashboard.view.look);
  let anchorY = LAYOUTS.dashboard.view.anchor;

  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const anchor = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function pushBlocks() {
    for (let i = 0; i < MAX; i++) {
      const c = cur[i]!;
      p.set(c.x, 0, c.z);
      s.set(c.w, c.h, c.w);
      blocks.setMatrixAt(i, m.compose(p, q, s));
      blocks.setColorAt(i, c.c);
    }
    blocks.instanceMatrix.needsUpdate = true;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;
  }

  function applyLayout(name: LayoutKey, instant = false) {
    if (!instant && name === active) return;
    active = name;
    const L = LAYOUTS[name];
    const now = clock.elapsedTime;

    for (let i = 0; i < MAX; i++) {
      const it = L.items?.[i];
      const t = tgt[i]!;
      const c = cur[i]!;
      t.x = it?.x ?? 0;
      t.z = it?.z ?? 0;
      t.w = it?.w ?? 0.001;
      t.h = it?.h ?? 0.001;
      t.c.setHex(it?.c ?? 0x2a66d6);
      t.tip = it?.tip ?? null;
      t.at = instant || reduceMotion || !it ? now : now + i * 0.012;
      if (instant) {
        c.x = t.x;
        c.z = t.z;
        c.w = t.w;
        c.h = t.h;
        c.c.copy(t.c);
      }
    }
    if (instant) pushBlocks();

    mapTarget = name === 'map' ? 1 : 0;
    if (instant) {
      mapScale = mapTarget;
      mapTilt = mapTarget > 0 ? MAP_TILT_ON : 0;
      mapLift = mapTarget > 0 ? MAP_LIFT_ON : 0;
      mapRoll = mapTarget > 0 ? MAP_ROLL_ON : 0;
      mapScene.mapGroup.rotation.x = mapTilt;
      mapScene.mapGroup.rotation.z = mapRoll;
      mapScene.mapGroup.position.y = mapLift;
      mapScene.mapGroup.scale.setScalar(Math.max(mapScale, 0.001));
      mapScene.mapGroup.visible = mapScale > 0.02;
    }

    viewPos.set(...L.view.pos);
    viewLook.set(...L.view.look);
    if (instant) {
      camPos.copy(viewPos);
      camLook.copy(viewLook);
      anchorY = L.view.anchor;
    }

    setPreviewOverlayState({
      active: name,
      caption: L.caption,
      moduleLabel: { x: 0, y: 0, visible: true },
      pinLabels: MAP_PINS.map(() => ({ x: 0, y: 0, visible: name === 'map' })),
    });
  }

  function goTo(name: LayoutKey) {
    applyLayout(name, false);
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const onPointerMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const mapHits = mapTarget > 0.5 ? [mapSheet, ...mapPins.flatMap((g) => g.children)] : [];
    const hit = raycaster.intersectObjects([blocks, ...mapHits], false)[0];
    let text: string | null = null;
    if (hit) {
      if (hit.object === blocks && hit.instanceId != null) {
        text = tgt[hit.instanceId]?.tip ?? null;
      } else {
        let o: THREE.Object3D | null = hit.object;
        while (o) {
          if (typeof o.userData.tip === 'string') {
            text = o.userData.tip;
            break;
          }
          o = o.parent;
        }
      }
    }
    if (text) {
      setPreviewTooltip({ text, x: e.clientX - r.left, y: e.clientY - r.top, visible: true });
    } else {
      setPreviewTooltip({ text: '', x: 0, y: 0, visible: false });
    }
  };
  const onPointerLeave = () => setPreviewTooltip({ text: '', x: 0, y: 0, visible: false });

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  renderer.setAnimationLoop(frame);

  const io = new IntersectionObserver(([entry]) => {
    const onScreen = entry?.isIntersecting ?? true;
    if (onScreen) {
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  });
  io.observe(stage);

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = reduceMotion ? 1 : 1 - Math.exp(-6 * dt);
    const kc = reduceMotion ? 1 : 1 - Math.exp(-2.5 * dt);
    const L = LAYOUTS[active];

    for (let i = 0; i < MAX; i++) {
      const c = cur[i]!;
      const g = tgt[i]!;
      if (t >= g.at) {
        c.x += (g.x - c.x) * k;
        c.z += (g.z - c.z) * k;
        c.w += (g.w - c.w) * k;
        c.h += (g.h - c.h) * k;
        c.c.lerp(g.c, k);
      }
      p.set(c.x, 0, c.z);
      s.set(c.w, c.h, c.w);
      blocks.setMatrixAt(i, m.compose(p, q, s));
      blocks.setColorAt(i, c.c);
    }
    blocks.instanceMatrix.needsUpdate = true;
    if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true;

    mapScale += (mapTarget - mapScale) * k;
    const tiltTarget = mapTarget > 0.5 ? MAP_TILT_ON : 0;
    const liftTarget = mapTarget > 0.5 ? MAP_LIFT_ON : 0;
    const rollTarget = mapTarget > 0.5 ? MAP_ROLL_ON : 0;
    mapTilt += (tiltTarget - mapTilt) * k;
    mapLift += (liftTarget - mapLift) * k;
    mapRoll += (rollTarget - mapRoll) * k;
    mapScene.mapGroup.rotation.x = mapTilt;
    mapScene.mapGroup.rotation.z = mapRoll;
    mapScene.mapGroup.rotation.y = 0;
    mapScene.mapGroup.position.y = mapLift;
    mapScene.mapGroup.scale.setScalar(Math.max(mapScale, 0.001));
    mapScene.mapGroup.visible = mapScale > 0.02;
    mapPins.forEach((pin, i) => {
      if (!mapScene.mapGroup.visible) return;
      const baseY = typeof pin.userData.baseY === 'number' ? pin.userData.baseY : 0.1;
      const bob = reduceMotion ? 0 : Math.sin(t * 1.6 + i * 1.7) * 0.025;
      pin.position.y = baseY + bob;
    });

    camPos.lerp(viewPos, kc);
    camLook.lerp(viewLook, kc);
    anchorY += (L.view.anchor - anchorY) * kc;
    camera.position.set(
      camPos.x + (reduceMotion ? 0 : Math.sin(t * 0.15) * 0.8),
      camPos.y,
      camPos.z
    );
    camera.lookAt(camLook);

    const w = stage.clientWidth;
    const h = stage.clientHeight;
    anchor.set(0, anchorY, 0);
    anchor.project(camera);
    setPreviewOverlayState({
      moduleLabel: {
        x: ((anchor.x + 1) / 2) * w,
        y: ((-anchor.y + 1) / 2) * h,
        visible: true,
      },
      pinLabels: mapPins.map((pin) => {
        if (active !== 'map' || !mapScene.mapGroup.visible) return { x: 0, y: 0, visible: false };
        pin.getWorldPosition(anchor);
        anchor.y += 0.95;
        anchor.project(camera);
        return {
          x: ((anchor.x + 1) / 2) * w,
          y: ((-anchor.y + 1) / 2) * h,
          visible: true,
        };
      }),
    });

    renderer.render(scene, camera);
  }

  applyLayout(initial, true);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  return {
    goTo: (name: LayoutKey) => goTo(name),
    destroy: () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.dispose();
      blockGeo.dispose();
      blocks.geometry.dispose();
      (blocks.material as THREE.Material).dispose();
      mapScene.dispose();
      renderer.domElement.remove();
    },
  };
}
