import { useEffect, useRef } from 'react';
import { CAGAYAN_MAP_PINS, previewMapGeoBounds } from './psto3d/philippinesMap';

type Props = { phase: number };

type MapNode = { lat: number; lng: number; hub: number; depth: number; r: number };
type Pulse = { node: number; t: number; speed: number };

const TILES = ['/maps/cagayan-8-214-114.png?v=cagayan214', '/maps/cagayan-8-214-115.png'];
const CENTER = { lat: 17.98, lng: 121.7 };
const HUB_LABEL_SIDE = [-1, 1, 1] as const; // D1 left, D2 right, D3 right
const GAUGE = [0.72, 0.46, 0.88] as const;

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNodes(): MapNode[] {
  const rand = rng(20261020);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const weights = [34, 30, 40];
  const nodes: MapNode[] = [];
  weights.forEach((count, hub) => {
    const p = CAGAYAN_MAP_PINS[hub];
    for (let i = 0; i < count; i++) {
      nodes.push({
        lat: p.lat + gauss() * 0.11,
        lng: p.lng + gauss() * 0.1,
        hub,
        depth: 0.4 + rand() * 0.6,
        r: 1.2 + rand() * 1.8,
      });
    }
  });
  for (let i = 0; i < 26; i++) {
    const lat = 17.15 + rand() * 1.6;
    const lng = 120.9 + rand() * 1.7;
    let hub = 0;
    let best = Infinity;
    CAGAYAN_MAP_PINS.forEach((p, h) => {
      const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
      if (d < best) {
        best = d;
        hub = h;
      }
    });
    nodes.push({ lat, lng, hub, depth: 0.3 + rand() * 0.5, r: 1 + rand() * 1.2 });
  }
  return nodes;
}

export function LivingMap({ phase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nodes = buildNodes();
    const hubs = CAGAYAN_MAP_PINS;
    const bounds = previewMapGeoBounds();
    const tiles = TILES.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let s = 1;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const layer = [1, 0, 0];
    const pulses: Pulse[] = [];
    const ripples: { hub: number; t: number }[] = [];
    let lastSpawn = 0;
    let last = performance.now();
    let time = reduced ? 2.4 : 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = W < 900;
      s = mobile ? Math.min(W / 1.15, H * 0.3) : Math.min(H / 1.45, W / 2.4);
      cx = mobile ? W / 2 : W * 0.31;
      cy = mobile ? Math.max(H * 0.2, 150) : H * 0.5;
      tileLayer = null;
      if (reduced) draw();
    }

    const px = (lng: number, depth = 0) =>
      cx + (lng - CENTER.lng) * s + pointer.x * 16 * depth;
    const py = (lat: number, depth = 0) =>
      cy - (lat - CENTER.lat) * s + pointer.y * 11 * depth;

    let tileLayer: HTMLCanvasElement | null = null;
    let ready = false;
    function buildTileLayer() {
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const o = off.getContext('2d')!;
      const x0 = px(bounds.west);
      const x1 = px(bounds.east);
      const y0 = py(bounds.north);
      const y1 = py(bounds.south);
      const h = (y1 - y0) / 2;
      let loaded = 0;
      tiles.forEach((img, i) => {
        if (img.complete && img.naturalWidth) {
          o.drawImage(img, x0, y0 + h * i, x1 - x0, h);
          loaded++;
        }
      });
      ready = loaded === tiles.length;
      o.globalCompositeOperation = 'destination-in';
      o.save();
      o.translate((x0 + x1) / 2, (y0 + y1) / 2);
      o.scale((x1 - x0) / 2, (y1 - y0) / 2);
      const g = o.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(0,0,0,0.22)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      o.fillStyle = g;
      o.fillRect(-1, -1, 2, 2);
      o.restore();
      return off;
    }

    function spawn() {
      if (pulses.length > 28) return;
      pulses.push({
        node: Math.floor(Math.random() * nodes.length),
        t: 0,
        speed: 0.32 + Math.random() * 0.3,
      });
    }

    function draw() {
      const c = ctx!;
      c.clearRect(0, 0, W, H);

      // Base tiles, faint, feathered at the edges (cached off-screen)
      if (!tileLayer) {
        const built = buildTileLayer();
        if (ready) tileLayer = built;
        else c.drawImage(built, 0, 0, W, H);
      }
      if (tileLayer) c.drawImage(tileLayer, 0, 0, W, H);

      // Graticule
      c.lineWidth = 1;
      c.font = '600 10px "Source Sans 3", system-ui, sans-serif';
      c.fillStyle = 'rgba(184,212,240,0.4)';
      for (let lng = 120.75; lng <= 122.75; lng += 0.25) {
        const x = px(lng);
        c.strokeStyle = 'rgba(184,212,240,0.07)';
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, H);
        c.stroke();
        if (W >= 900) c.fillText(`${lng.toFixed(2)}°E`, x + 4, H - 14);
      }
      for (let lat = 16.75; lat <= 19.25; lat += 0.25) {
        const y = py(lat);
        c.strokeStyle = 'rgba(184,212,240,0.07)';
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y);
        c.stroke();
        if (W >= 900) c.fillText(`${lat.toFixed(2)}°N`, 14, y - 4);
      }

      // Edges node → hub (one batched path)
      c.strokeStyle = 'rgba(91,155,213,0.16)';
      c.beginPath();
      nodes.forEach((n) => {
        const hub = hubs[n.hub];
        c.moveTo(px(n.lng, n.depth), py(n.lat, n.depth));
        c.lineTo(px(hub.lng, 1), py(hub.lat, 1));
      });
      c.stroke();

      // Nodes (+ registry wave)
      nodes.forEach((n) => {
        const x = px(n.lng, n.depth);
        const y = py(n.lat, n.depth);
        const hub = hubs[n.hub];
        const dist = Math.hypot(n.lng - hub.lng, n.lat - hub.lat);
        const wave = 0.5 + 0.5 * Math.sin(time * 2.2 - dist * 22);
        c.fillStyle = `rgba(184,212,240,${0.5 + 0.2 * n.depth})`;
        c.beginPath();
        c.arc(x, y, n.r, 0, Math.PI * 2);
        c.fill();
        if (layer[0] > 0.02 && wave > 0.6) {
          c.strokeStyle = `rgba(255,255,255,${(wave - 0.6) * 1.6 * layer[0]})`;
          c.beginPath();
          c.arc(x, y, n.r + 3 + wave * 4, 0, Math.PI * 2);
          c.stroke();
        }
      });

      // Pulses traveling to hubs
      pulses.forEach((p) => {
        const n = nodes[p.node];
        const hub = hubs[n.hub];
        const ax = px(n.lng, n.depth);
        const ay = py(n.lat, n.depth);
        const bx = px(hub.lng, 1);
        const by = py(hub.lat, 1);
        const e = p.t * p.t * (3 - 2 * p.t);
        const tail = Math.max(0, e - 0.14);
        const g = c.createLinearGradient(
          ax + (bx - ax) * tail,
          ay + (by - ay) * tail,
          ax + (bx - ax) * e,
          ay + (by - ay) * e
        );
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,0.95)');
        c.strokeStyle = g;
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(ax + (bx - ax) * tail, ay + (by - ay) * tail);
        c.lineTo(ax + (bx - ax) * e, ay + (by - ay) * e);
        c.stroke();
        c.lineWidth = 1;
      });

      // Hubs
      hubs.forEach((h, i) => {
        const x = px(h.lng, 1);
        const y = py(h.lat, 1);

        const glow = c.createRadialGradient(x, y, 0, x, y, 54);
        glow.addColorStop(0, 'rgba(91,155,213,0.55)');
        glow.addColorStop(1, 'rgba(91,155,213,0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(x, y, 54, 0, Math.PI * 2);
        c.fill();

        for (let k = 0; k < 2; k++) {
          const f = (time * 0.35 + k * 0.5 + i * 0.2) % 1;
          c.strokeStyle = `rgba(184,212,240,${0.5 * (1 - f)})`;
          c.beginPath();
          c.arc(x, y, 8 + f * 34, 0, Math.PI * 2);
          c.stroke();
        }

        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(x, y, 4.5, 0, Math.PI * 2);
        c.fill();

        // Mapping layer: crosshair, brackets, readout
        const lm = layer[1];
        if (lm > 0.02) {
          c.strokeStyle = `rgba(184,212,240,${0.14 * lm})`;
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, H);
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
          const b = 26 + (1 - lm) * 14;
          const l = 8;
          c.strokeStyle = `rgba(255,255,255,${0.9 * lm})`;
          c.lineWidth = 1.5;
          c.beginPath();
          for (const [sx, sy] of [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ]) {
            c.moveTo(x + sx * b, y + sy * (b - l));
            c.lineTo(x + sx * b, y + sy * b);
            c.lineTo(x + sx * (b - l), y + sy * b);
          }
          c.stroke();
          c.lineWidth = 1;
        }

        // SETUP layer: progress gauge
        const ls = layer[2];
        if (ls > 0.02) {
          const r = 24;
          c.strokeStyle = `rgba(184,212,240,${0.22 * ls})`;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.stroke();
          c.strokeStyle = `rgba(255,255,255,${0.95 * ls})`;
          c.lineCap = 'round';
          c.beginPath();
          c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * GAUGE[i] * ls);
          c.stroke();
          c.lineCap = 'butt';
          c.lineWidth = 1;
        }

        // Label
        const side = HUB_LABEL_SIDE[i];
        c.textAlign = side > 0 ? 'left' : 'right';
        c.fillStyle = '#fff';
        c.font = '700 14px Barlow, system-ui, sans-serif';
        c.fillText(h.place, x + side * 40, y - 4);
        c.fillStyle = 'rgba(184,212,240,0.8)';
        c.font = '600 10px "Source Sans 3", system-ui, sans-serif';
        const sub =
          layer[1] > 0.5
            ? `${h.lat.toFixed(4)}°N  ${h.lng.toFixed(4)}°E`
            : layer[2] > 0.5
              ? 'SETUP balance'
              : `District ${h.name.slice(1)}`;
        c.fillText(sub.toUpperCase(), x + side * 40, y + 11);
        c.textAlign = 'left';
      });

      // Hub arrival ripples
      ripples.forEach((r) => {
        const h = hubs[r.hub];
        const x = px(h.lng, 1);
        const y = py(h.lat, 1);
        c.strokeStyle = `rgba(255,255,255,${0.55 * (1 - r.t)})`;
        c.beginPath();
        c.arc(x, y, 6 + r.t * 26, 0, Math.PI * 2);
        c.stroke();
      });
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      layer.forEach((v, i) => {
        const target = i === phaseRef.current ? 1 : 0;
        layer[i] = v + (target - v) * Math.min(1, dt * 4);
      });

      if (time - lastSpawn > 0.16) {
        spawn();
        lastSpawn = time;
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += dt * p.speed;
        if (p.t >= 1) {
          ripples.push({ hub: nodes[p.node].hub, t: 0 });
          pulses.splice(i, 1);
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].t += dt * 1.6;
        if (ripples[i].t >= 1) ripples.splice(i, 1);
      }

      draw();
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    resize();
    window.addEventListener('resize', resize);
    tiles.forEach((t) => t.addEventListener('load', () => reduced && draw()));
    if (!reduced) {
      window.addEventListener('pointermove', onMove);
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="lg2-canvas" aria-hidden />;
}
