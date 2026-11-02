import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useLoginFeature } from '../LoginFeatureContext';
import {
  featureToLayout,
  LAYOUTS,
  MAP_PINS,
  type LayoutKey,
  type ModuleLayout,
} from './layouts';
import { cagayanPinPlanePositions } from './philippinesMap';
import { setPreviewOverlayState, setPreviewTooltip } from './previewStore';

const MAX = 64;
const BG_FOG = 0x04234f;

type BlockState = { x: number; z: number; w: number; h: number; c: THREE.Color };
type TargetState = BlockState & { tip: string | null; at: number };

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

function makeBlockPool() {
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
  }
  return { cur, tgt };
}

type Props = {
  stageRef: RefObject<HTMLElement | null>;
};

export function PstoInstancedScene({ stageRef }: Props) {
  const { activeId } = useLoginFeature();
  const { camera, clock, scene, gl } = useThree();

  const headsRef = useRef<THREE.Mesh[]>([]);
  const activeRef = useRef<LayoutKey>('dashboard');
  const viewPos = useRef(new THREE.Vector3(...LAYOUTS.dashboard.view.pos));
  const viewLook = useRef(new THREE.Vector3(...LAYOUTS.dashboard.view.look));
  const camPos = useRef(new THREE.Vector3(...LAYOUTS.dashboard.view.pos));
  const camLook = useRef(new THREE.Vector3(...LAYOUTS.dashboard.view.look));
  const anchorY = useRef(LAYOUTS.dashboard.view.anchor);
  const pinsScale = useRef(0.001);
  const pinsTarget = useRef(0);
  const pool = useRef(makeBlockPool());
  const reduceMotion = useRef(false);

  const pinPlane = useMemo(() => cagayanPinPlanePositions(), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);

  const glowTex = useMemo(() => radialTexture(), []);
  const blockGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  const blockMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.32,
        metalness: 0.12,
        emissive: new THREE.Color(0x1a5cad),
        emissiveIntensity: 0.35,
      }),
    []
  );

  const blocksMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(blockGeo, blockMaterial, MAX);
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [blockGeo, blockMaterial]);

  useLayoutEffect(() => {
    scene.fog = new THREE.Fog(BG_FOG, 12, 26);
    gl.setClearColor(BG_FOG, 1);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [gl, scene]);

  const syncBlockMatrices = useCallback(() => {
    const { cur } = pool.current;
    for (let i = 0; i < MAX; i++) {
      const c = cur[i]!;
      blocksMesh.setColorAt(i, c.c);
      p.set(c.x, 0, c.z);
      s.set(c.w, c.h, c.w);
      blocksMesh.setMatrixAt(i, m.compose(p, q, s));
    }
    blocksMesh.instanceMatrix.needsUpdate = true;
    if (blocksMesh.instanceColor) blocksMesh.instanceColor.needsUpdate = true;
  }, [blocksMesh, m, p, q, s]);

  const applyLayout = useCallback(
    (name: LayoutKey) => {
      activeRef.current = name;
      const L: ModuleLayout = LAYOUTS[name];
      const now = clock.getElapsedTime();
      const { cur, tgt } = pool.current;

      for (let i = 0; i < MAX; i++) {
        const it = L.items?.[i];
        const t = tgt[i]!;
        t.x = it?.x ?? 0;
        t.z = it?.z ?? 0;
        t.w = it?.w ?? 0.001;
        t.h = it?.h ?? 0.001;
        t.c.setHex(it?.c ?? 0x2a66d6);
        t.tip = it?.tip ?? null;
        t.at = reduceMotion.current || !it ? now : now + i * 0.025;

        if (reduceMotion.current && it) {
          const c = cur[i]!;
          c.x = t.x;
          c.z = t.z;
          c.w = t.w;
          c.h = t.h;
          c.c.copy(t.c);
        }
      }

      pinsTarget.current = name === 'map' ? 1 : 0;
      viewPos.current.set(...L.view.pos);
      viewLook.current.set(...L.view.look);

      setPreviewOverlayState({
        active: name,
        caption: L.caption,
        moduleLabel: { x: 0, y: 0, visible: true },
        pinLabels: MAP_PINS.map(() => ({ x: 0, y: 0, visible: name === 'map' })),
      });

      syncBlockMatrices();
    },
    [clock, syncBlockMatrices]
  );

  useLayoutEffect(() => {
    applyLayout(featureToLayout(activeId));
  }, [activeId, applyLayout]);

  useEffect(() => {
    const el = stageRef.current;
    const canvas = gl.domElement;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const heads = headsRef.current;
      const hit = raycaster.intersectObjects([blocksMesh, ...heads], false)[0];
      let text: string | null = null;
      if (hit) {
        if (hit.object === blocksMesh && hit.instanceId != null) {
          text = pool.current.tgt[hit.instanceId]?.tip ?? null;
        } else {
          text = (hit.object as THREE.Mesh).userData.tip ?? null;
        }
      }
      if (text) {
        setPreviewTooltip({
          text,
          x: e.clientX - r.left,
          y: e.clientY - r.top,
          visible: true,
        });
      } else {
        setPreviewTooltip({ text: '', x: 0, y: 0, visible: false });
      }
    };

    const onLeave = () => setPreviewTooltip({ text: '', x: 0, y: 0, visible: false });

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [blocksMesh, camera, gl.domElement, raycaster, pointer, stageRef]);

  useFrame(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const rm = reduceMotion.current;
    const k = rm ? 1 : 1 - Math.exp(-6 * dt);
    const kc = rm ? 1 : 1 - Math.exp(-2.5 * dt);
    const active = activeRef.current;
    const L = LAYOUTS[active];
    const { cur, tgt } = pool.current;

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
      blocksMesh.setMatrixAt(i, m.compose(p, q, s));
      blocksMesh.setColorAt(i, c.c);
    }
    blocksMesh.instanceMatrix.needsUpdate = true;
    if (blocksMesh.instanceColor) blocksMesh.instanceColor.needsUpdate = true;

    pinsScale.current += (pinsTarget.current - pinsScale.current) * k;
    headsRef.current.forEach((h, i) => {
      if (!h) return;
      const sc = Math.max(pinsScale.current, 0.001);
      h.scale.setScalar(sc);
      h.position.y = 1.35 + (rm ? 0 : Math.sin(t * 1.6 + i * 1.7) * 0.06);
    });

    camPos.current.lerp(viewPos.current, kc);
    camLook.current.lerp(viewLook.current, kc);
    anchorY.current += (L.view.anchor - anchorY.current) * kc;
    camera.position.set(
      camPos.current.x + (rm ? 0 : Math.sin(t * 0.15) * 0.8),
      camPos.current.y,
      camPos.current.z
    );
    camera.lookAt(camLook.current);

    const stage = stageRef.current;
    if (stage) {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      anchor.set(0, anchorY.current, 0);
      anchor.project(camera);
      const moduleLabel = {
        x: ((anchor.x + 1) / 2) * w,
        y: ((-anchor.y + 1) / 2) * h,
        visible: true,
      };
      const pinLabels = headsRef.current.map((head) => {
        if (!head || active !== 'map') return { x: 0, y: 0, visible: false };
        head.getWorldPosition(anchor);
        anchor.project(camera);
        return {
          x: ((anchor.x + 1) / 2) * w,
          y: ((-anchor.y + 1) / 2) * h,
          visible: true,
        };
      });
      setPreviewOverlayState({ moduleLabel, pinLabels });
    }
  });

  const headMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x8fd0ff,
        roughness: 0.25,
        emissive: 0x2a7fd0,
        emissiveIntensity: 0.6,
      }),
    []
  );

  return (
    <>
      <hemisphereLight args={[0xcfe6ff, 0x0a2a5e, 1.5]} />
      <directionalLight
        position={[5, 10, 6]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <shadowMaterial opacity={0.35} />
      </mesh>

      <primitive object={blocksMesh} />

      {MAP_PINS.map((pin, i) => (
        <mesh
          key={pin.name}
          ref={(el) => {
            if (el) headsRef.current[i] = el;
          }}
          material={headMat}
          castShadow
          position={[pinPlane[i]!.x, 1.35, pinPlane[i]!.z]}
          scale={0.001}
          userData={{ tip: pin.tip }}
        >
          <sphereGeometry args={[0.26, 24, 24]} />
        </mesh>
      ))}
    </>
  );
}
