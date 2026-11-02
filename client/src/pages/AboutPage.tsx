import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DISTRICT_COLORS, SECTOR_COLORS } from '../components/about/palette';
import { SECTORS } from '../constants';
import { firmTone, parseAmount, pesoCompact } from '../lib/format';
import type { Firm, FirmLocation } from '../types';
import '../about.css';

/*
 * About — a scroll story. Each section pins to the screen while you scroll through it, and its
 * own content plays out in step with the scroll (`p` goes 0 → 1 across the section).
 */

const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** Progress through the sub-range [a, b] of p. */
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const out = (t: number) => 1 - (1 - t) ** 3;
const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 0 → 1 as the reader scrolls through this pinned section. */
function useScrub<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [still] = useState(prefersStill);
  const [p, setP] = useState(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const pin = el.firstElementChild?.getBoundingClientRect().height ?? window.innerHeight;
        const span = r.height - pin;
        const v = span > 0 ? clamp(-(r.top - (window.innerHeight - pin)) / span) : 0;
        const q = Math.round(v * 500) / 500;
        setP((prev) => (prev === q ? prev : q));
      });
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [still]);

  return [ref, p];
}

/** Thin bar under the header showing how far through the page you are. */
function PageProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <div className="sx-progress" ref={bar} aria-hidden />;
}

type Stats = {
  total: number;
  amount: number;
  byDistrict: { count: number; amount: number }[];
  bySector: { sector: string; count: number; amount: number }[];
};

/* ───────────────────────── Intro ───────────────────────── */

/** PSTO Cagayan office, Tuguegarao City — where every route on the hero map starts. */
const OFFICE = { lat: 17.6132, lng: 121.727 };

/** The hero map shows only the Cagayan part of the two tiles (SVG units: x 0–100, y 0–200). */
const VIEW = { x: 4, y: 46, w: 92, h: 104 };

const STANDING_FILL = { attention: '#ff6b6b', running: '#6fb2ff', settled: '#3fd39a' } as const;

type Route = { id: number; name: string; x: number; y: number; d: string; fill: string; len: number };

function useRoutes(firms: Firm[] | null): Route[] {
  const [locations, setLocations] = useState<FirmLocation[]>([]);
  useEffect(() => {
    api
      .listLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  return useMemo(() => {
    const hub = onMap(OFFICE.lat, OFFICE.lng);
    const hx = hub.left;
    const hy = hub.top * 2;
    const byName = new Map((firms ?? []).map((f) => [f.firm.trim().toLowerCase(), f]));
    const routes: Route[] = [];
    for (const l of locations) {
      const lat = parseFloat(l.latitude);
      const lng = parseFloat(l.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const pos = onMap(lat, lng);
      const x = pos.left;
      const y = pos.top * 2;
      const dist = Math.hypot(x - hx, y - hy);
      if (dist < 0.8) continue; // sits on the office itself
      // the arc bows sideways so short and long routes both stay readable
      const cx = (hx + x) / 2 - (y - hy) * 0.25;
      const cy = (hy + y) / 2 - dist * 0.35;
      const firm = byName.get(l.firm.trim().toLowerCase());
      const tone = firm ? firmTone(firm) : 'neutral';
      routes.push({
        id: l.id,
        name: l.firm,
        x,
        y,
        d: `M ${hx} ${hy} Q ${cx} ${cy} ${x} ${y}`,
        fill: tone === 'warn' ? STANDING_FILL.attention : tone === 'ok' ? STANDING_FILL.settled : STANDING_FILL.running,
        len: dist * 1.35,
      });
    }
    return routes;
  }, [locations, firms]);
}

function ReachMap({ routes }: { routes: Route[] }) {
  const hub = onMap(OFFICE.lat, OFFICE.lng);
  const hx = hub.left;
  const hy = hub.top * 2;
  return (
    <svg
      className="hx-map"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Map of Cagayan with routes from the PSTO office in Tuguegarao to each assisted firm"
    >
      <image href="/maps/cagayan-8-214-114.png?v=cagayan214" x="0" y="0" width="100" height="100" />
      <image href="/maps/cagayan-8-214-115.png?v=cagayan214" x="0" y="100" width="100" height="100" />
      <rect className="hx-map-tint" x="0" y="0" width="100" height="200" />

      {routes.map((r, i) => (
        <g key={r.id} style={{ '--i': i } as CSSProperties}>
          <path className="hx-route" d={r.d} style={{ strokeDasharray: r.len, strokeDashoffset: r.len }} />
          <circle className="hx-spark" r="0.75">
            <animateMotion
              dur={`${2.6 + (i % 3) * 0.5}s`}
              begin={`${1.2 + i * 0.18}s`}
              repeatCount="indefinite"
              path={r.d}
            />
          </circle>
          <g className="hx-pin" transform={`translate(${r.x} ${r.y})`}>
            <circle className="hx-pin-halo" r="2.6" fill={r.fill} />
            <circle r="1.25" fill={r.fill} stroke="#fff" strokeWidth="0.45" />
            <title>{r.name}</title>
          </g>
        </g>
      ))}

      <g className="hx-hub" transform={`translate(${hx} ${hy})`}>
        <circle className="hx-hub-wave" r="3" />
        <circle className="hx-hub-wave hx-hub-wave-2" r="3" />
        <circle r="1.9" fill="#fff" />
        <circle r="0.9" fill="#0057b7" />
      </g>
    </svg>
  );
}

function Intro({ stats, ready, firms }: { stats: Stats; ready: boolean; firms: Firm[] | null }) {
  const [ref, p] = useScrub<HTMLElement>();
  const routes = useRoutes(firms);
  const tilt = out(seg(p, 0, 0.9));
  const attention = (firms ?? []).filter((f) => firmTone(f) === 'warn').length;

  const chips = [
    { k: 'a', big: ready ? String(stats.total) : '–', small: 'firms assisted', dx: -1, dy: -1 },
    { k: 'b', big: ready ? pesoCompact(stats.amount) : '–', small: 'technology assistance', dx: 1, dy: -0.4 },
    { k: 'c', big: '3 · 6', small: 'districts · sectors', dx: -1, dy: 1 },
    { k: 'd', big: ready ? String(attention) : '–', small: 'need follow-up', dx: 1, dy: 1, alert: true },
  ];

  return (
    <section ref={ref} className="sx sx-intro" style={{ '--h': '175vh' } as CSSProperties}>
      <div className="sx-pin">
        <div className="hx-glow" aria-hidden />
        <div className="sx-wrap hx-grid">
          <div className="hx-copy" style={{ opacity: 1 - tilt * 0.35, transform: `translateY(${-tilt * 30}px)` }}>
            <p className="hx-chip">
              <span className="hx-chip-dot" aria-hidden />
              DOST Region II · PSTO Cagayan
            </p>
            <h1 className="hx-title">
              Science that reaches the{' '}
              <span className="hx-mark">
                last mile.
                <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 10 C 50 2, 120 2, 198 8" />
                </svg>
              </span>
            </h1>
            <p className="hx-lede">
              The Provincial Science and Technology Office brings DOST programs to the firms, farms and fishing
              communities of Cagayan. Every route on this map is a firm we reached.
            </p>
            <div className="hx-ctas">
              <Link to="/firms" className="sx-btn sx-btn-solid">
                Explore the registry →
              </Link>
              <button
                type="button"
                className="sx-btn sx-btn-line"
                onClick={() => document.getElementById('about-steps')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See how it works
              </button>
            </div>
          </div>

          <div className="hx-visual">
            <div
              className="hx-card"
              style={{
                transform: `perspective(1400px) rotateX(${tilt * 18}deg) rotateZ(${tilt * -4}deg) scale(${1 - tilt * 0.08})`,
              }}
            >
              <ReachMap routes={routes} />
              <span className="hx-card-label">
                <i aria-hidden /> Live from the registry
              </span>
            </div>
            {chips.map((c, i) => (
              <div
                key={c.k}
                className={`hx-stat hx-stat-${c.k}${c.alert ? ' hx-stat-alert' : ''}`}
                style={{
                  translate: `${c.dx * tilt * 40}px ${c.dy * tilt * 30}px`,
                  animationDelay: `${0.9 + i * 0.15}s`,
                }}
              >
                <strong>{c.big}</strong>
                <span>{c.small}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sx-hint" style={{ opacity: 1 - seg(p, 0, 0.1) }} aria-hidden>
          <span>Scroll</span>
          <i />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Purpose ───────────────────────── */

function Purpose() {
  const [ref, p] = useScrub<HTMLElement>();
  const head = out(seg(p, 0, 0.15));
  const m = out(seg(p, 0.08, 0.38));
  const v = out(seg(p, 0.32, 0.62));
  const n = out(seg(p, 0.62, 0.88));

  return (
    <section ref={ref} className="sx" style={{ '--h': '250vh' } as CSSProperties} aria-labelledby="sx-purpose">
      <div className="sx-pin">
        <span className="sx-ghost" aria-hidden style={{ transform: `translateX(${18 - 70 * p}%)` }}>
          PURPOSE
        </span>
        <div className="sx-wrap">
          <header className="sx-head" style={{ opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
            <p className="sx-num">01 · Purpose</p>
            <h2 id="sx-purpose" className="sx-h2">
              Why PSTO Cagayan exists.
            </h2>
          </header>

          <div className="sx-cards">
            <article
              className="sx-card sx-card-mission"
              style={{
                opacity: m,
                transform: `translateX(${(1 - m) * -55}vw) rotate(${(1 - m) * -10}deg)`,
              }}
            >
              <span className="sx-tag">Mission</span>
              <h3>Spearhead science, technology and innovation where it counts.</h3>
              <p>
                Bring DOST programs to enterprises across Cagayan Valley so research and enterprise support turn into
                jobs, income and stronger communities.
              </p>
            </article>
            <article
              className="sx-card"
              style={{
                opacity: v,
                transform: `translateX(${(1 - v) * 55}vw) rotate(${(1 - v) * 10}deg)`,
              }}
            >
              <span className="sx-tag">Vision</span>
              <h3>Inclusive, sustainable growth felt in every municipality.</h3>
              <p>
                Every firm, farmer and fisherfolk group in the province has a clear path to the technologies, training
                and financing that help it grow.
              </p>
            </article>
          </div>

          <p className="sx-note" style={{ opacity: n, transform: `scale(${0.92 + 0.08 * n})` }}>
            <b>And this portal?</b> One shared workspace to register assisted firms, pin them on the map and follow
            their standing — so decisions rest on current data, not scattered spreadsheets.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Territory ───────────────────────── */

const DISTRICTS = [
  { id: '1', name: 'District 1', place: 'Tuguegarao City area', lat: 17.6132, lng: 121.727, side: 'right' },
  { id: '2', name: 'District 2', place: 'Solana and central towns', lat: 17.652, lng: 121.69, side: 'left' },
  { id: '3', name: 'District 3', place: 'Aparri and the north coast', lat: 18.356, lng: 121.64, side: 'right' },
] as const;

/** Position on the two stacked OSM tiles (z8, x214, y114–115), as % of the image box. */
function onMap(lat: number, lng: number) {
  const n = 2 ** 8;
  const lngToX = (x: number) => (x / n) * 360 - 180;
  const latY = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const merc = (l: number) => Math.log(Math.tan(Math.PI / 4 + (l * Math.PI) / 360));
  const west = lngToX(214);
  const east = lngToX(215);
  const north = merc((latY(114) * 180) / Math.PI);
  const south = merc((latY(116) * 180) / Math.PI);
  return { left: ((lng - west) / (east - west)) * 100, top: ((north - merc(lat)) / (north - south)) * 100 };
}

function Territory({ stats, ready }: { stats: Stats; ready: boolean }) {
  const [ref, p] = useScrub<HTMLElement>();
  const head = out(seg(p, 0, 0.14));
  const max = Math.max(1, ...stats.byDistrict.map((d) => d.count));

  return (
    <section ref={ref} className="sx" style={{ '--h': '260vh' } as CSSProperties} aria-labelledby="sx-territory">
      <div className="sx-pin">
        <div className="sx-wrap sx-split">
          <div>
            <header className="sx-head" style={{ opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
              <p className="sx-num">02 · Territory</p>
              <h2 id="sx-territory" className="sx-h2">
                One province, three districts.
              </h2>
            </header>
            <ul className="sx-bars">
              {DISTRICTS.map((d, i) => {
                const t = out(seg(p, 0.12 + i * 0.22, 0.36 + i * 0.22));
                const s = stats.byDistrict[i];
                return (
                  <li key={d.id} style={{ opacity: 0.25 + 0.75 * t }}>
                    <Link to={`/firms?d=${d.id}`}>
                      <span className="sx-bar-top">
                        <strong>{d.name}</strong>
                        <span>{d.place}</span>
                      </span>
                      <span className="sx-bar-track">
                        <span
                          style={{
                            width: `${(ready ? s.count / max : 0) * 100 * t}%`,
                            background: DISTRICT_COLORS[d.id],
                          }}
                        />
                      </span>
                      <span className="sx-bar-nums">
                        <b>{Math.round((ready ? s.count : 0) * t)}</b> firms
                        <em>{pesoCompact((ready ? s.amount : 0) * t)}</em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="sx-map" aria-hidden style={{ transform: `scale(${0.92 + 0.08 * out(seg(p, 0, 0.3))})` }}>
            <img src="/maps/cagayan-8-214-114.png?v=cagayan214" alt="" />
            <img src="/maps/cagayan-8-214-115.png?v=cagayan214" alt="" />
            {DISTRICTS.map((d, i) => {
              const t = out(seg(p, 0.12 + i * 0.22, 0.36 + i * 0.22));
              const pos = onMap(d.lat, d.lng);
              return (
                <span
                  key={d.id}
                  className={`sx-marker sx-marker-${d.side}`}
                  style={
                    {
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      opacity: t,
                      '--c': DISTRICT_COLORS[d.id],
                      '--s': 0.4 + 0.6 * t,
                    } as CSSProperties
                  }
                >
                  <i />
                  <b>{d.name}</b>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Sectors ───────────────────────── */

// where each tile starts before it flies into the grid
const SCATTER = [
  [-220, -160, -18],
  [180, -220, 14],
  [260, 40, 22],
  [-260, 120, -12],
  [-40, 240, 9],
  [220, 220, -20],
];

function Sectors({ stats, ready }: { stats: Stats; ready: boolean }) {
  const [ref, p] = useScrub<HTMLElement>();
  const head = out(seg(p, 0, 0.14));
  const done = p > 0.82;

  return (
    <section ref={ref} className="sx" style={{ '--h': '240vh' } as CSSProperties} aria-labelledby="sx-sectors">
      <div className="sx-pin">
        <div className="sx-wrap">
          <header className="sx-head" style={{ opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
            <p className="sx-num">03 · Sectors</p>
            <h2 id="sx-sectors" className="sx-h2">
              Where the assistance goes.
            </h2>
          </header>
          <div className="sx-tiles">
            {stats.bySector.map((s, i) => {
              const t = out(seg(p, 0.06 + i * 0.07, 0.42 + i * 0.07));
              const [dx, dy, rot] = SCATTER[i % SCATTER.length];
              return (
                <Link
                  key={s.sector}
                  to={`/firms?q=${encodeURIComponent(s.sector)}`}
                  className={done && i === 0 ? 'sx-tile lead' : 'sx-tile'}
                  style={
                    {
                      '--c': SECTOR_COLORS[s.sector],
                      opacity: t,
                      transform: `translate(${(1 - t) * dx}px, ${(1 - t) * dy}px) rotate(${(1 - t) * rot}deg) scale(${0.6 + 0.4 * t})`,
                    } as CSSProperties
                  }
                >
                  <strong>{Math.round((ready ? s.count : 0) * t)}</strong>
                  <span>
                    {s.sector}
                    <small>{ready ? `${pesoCompact(s.amount)} assisted` : ' '}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

const STEPS = [
  { title: 'Register the firm', text: 'Record the beneficiary, project, amount and repayment status.', to: '/firms', cta: 'Open registry' },
  { title: 'Pin it on the map', text: 'Drop a pin at the firm’s exact location so field teams can find it.', to: '/map', cta: 'Open map' },
  { title: 'Watch the standing', text: 'Spot past-due and delinquent accounts early from the dashboard.', to: '/', cta: 'Open dashboard' },
] as const;

function FormArt({ t }: { t: number }) {
  return (
    <div className="sx-art sx-art-form">
      {[0.9, 0.65, 0.8, 0.45].map((w, i) => (
        <span key={i} className="sx-field">
          <i style={{ width: `${w * 100 * seg(t, i * 0.18, i * 0.18 + 0.3)}%` }} />
        </span>
      ))}
      <b className="sx-check" style={{ opacity: seg(t, 0.8, 1), transform: `scale(${0.5 + 0.5 * seg(t, 0.8, 1)})` }}>
        ✓ Saved
      </b>
    </div>
  );
}

function PinArt({ t }: { t: number }) {
  const drop = out(seg(t, 0.1, 0.7));
  const land = seg(t, 0.65, 1);
  return (
    <div className="sx-art sx-art-map">
      <img src="/maps/cagayan-8-214-115.png?v=cagayan214" alt="" />
      <span className="sx-pin-ripple" style={{ opacity: land * (1 - land) * 3, transform: `translate(-50%, -50%) scale(${0.5 + land * 2})` }} />
      <span className="sx-pin-drop" style={{ transform: `translate(-50%, ${-100 - (1 - drop) * 160}%)`, opacity: seg(t, 0.05, 0.2) }} />
    </div>
  );
}

function StandingArt({ t }: { t: number }) {
  const states = [
    { label: 'Regular Due', color: '#6fb2ff' },
    { label: 'Past Due', color: '#ff5d5d' },
    { label: 'Fully Paid', color: '#3fd39a' },
  ];
  const idx = t < 0.36 ? 0 : t < 0.7 ? 1 : 2;
  const ring = 2 * Math.PI * 38;
  return (
    <div className="sx-art sx-art-standing">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="38" className="sx-ring-track" />
        <circle
          cx="50"
          cy="50"
          r="38"
          className="sx-ring-fill"
          style={{ stroke: states[idx].color, strokeDasharray: `${ring * t} ${ring}` }}
        />
      </svg>
      <span className="sx-state" style={{ color: states[idx].color }}>
        {states[idx].label}
      </span>
    </div>
  );
}

function Workflow() {
  const [ref, p] = useScrub<HTMLElement>();
  const track = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const el = track.current;
      if (el) setShift(Math.max(0, el.scrollWidth - el.clientWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const t = seg(p, 0.06, 0.94);
  const head = out(seg(p, 0, 0.1));

  return (
    <section ref={ref} id="about-steps" className="sx" style={{ '--h': '320vh' } as CSSProperties} aria-labelledby="sx-workflow">
      <div className="sx-pin sx-pin-col">
        <div className="sx-wrap">
          <header className="sx-head" style={{ opacity: head, transform: `translateY(${(1 - head) * 24}px)` }}>
            <p className="sx-num">04 · How it works</p>
            <h2 id="sx-workflow" className="sx-h2">
              Three steps to a complete record.
            </h2>
          </header>
          <div className="sx-line" aria-hidden>
            <span style={{ transform: `scaleX(${t})` }} />
            {STEPS.map((_, i) => (
              <i key={i} className={t >= i / 2.4 ? 'on' : undefined} style={{ left: `${(i / 2) * 100}%` }} />
            ))}
          </div>
        </div>

        <div className="sx-track" ref={track}>
          <div className="sx-track-inner" style={{ transform: `translateX(${-shift * t}px)` }}>
            {STEPS.map((s, i) => {
              const local = seg(t, i * 0.3 - 0.05, i * 0.3 + 0.32);
              return (
                <Link key={s.title} to={s.to} className={local > 0.05 ? 'sx-step on' : 'sx-step'}>
                  {i === 0 && <FormArt t={local} />}
                  {i === 1 && <PinArt t={local} />}
                  {i === 2 && <StandingArt t={local} />}
                  <span className="sx-step-n">0{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <span className="sx-step-cta">{s.cta} →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Promise ───────────────────────── */

const QUOTE = 'Technology is only meaningful when it reaches the firm, the farmer and the community we were built to serve.';
const HIGHLIGHT = new Set(['firm,', 'farmer', 'community']);

function PromiseSection() {
  const [ref, p] = useScrub<HTMLElement>();
  const words = QUOTE.split(' ');
  const end = out(seg(p, 0.82, 0.97));

  return (
    <section ref={ref} className="sx" style={{ '--h': '220vh' } as CSSProperties} aria-labelledby="sx-promise">
      <div className="sx-pin">
        <div className="sx-wrap">
          <p className="sx-num">05 · Our promise</p>
          <h2 id="sx-promise" className="sr-only">
            Our promise
          </h2>
          <blockquote className="sx-quote">
            {words.map((w, i) => {
              const start = (i / words.length) * 0.75;
              const lit = seg(p, start, start + 0.08);
              return (
                <span
                  key={i}
                  className={HIGHLIGHT.has(w) ? 'hl' : undefined}
                  style={{ opacity: 0.16 + 0.84 * lit }}
                >
                  {w}{' '}
                </span>
              );
            })}
          </blockquote>
          <div className="sx-end" style={{ opacity: end, transform: `translateY(${(1 - end) * 24}px)` }}>
            <p className="sx-sign">DOST Region II · PSTO Cagayan</p>
            <div className="sx-actions">
              <Link to="/firms" className="sx-btn sx-btn-solid">
                Start with the registry →
              </Link>
              <Link to="/map" className="sx-btn sx-btn-line">
                Open the map
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function AboutPage() {
  const [firms, setFirms] = useState<Firm[] | null>(null);

  useEffect(() => {
    api.listFirms().then(setFirms).catch(() => setFirms([]));
  }, []);

  const stats = useMemo<Stats>(() => {
    const list = firms ?? [];
    return {
      total: list.length,
      amount: list.reduce((s, f) => s + parseAmount(f.amount_assisted), 0),
      byDistrict: DISTRICTS.map((d) => {
        const rows = list.filter((f) => f.district === d.id);
        return { count: rows.length, amount: rows.reduce((s, f) => s + parseAmount(f.amount_assisted), 0) };
      }),
      bySector: SECTORS.map((s) => {
        const rows = list.filter((f) => f.sector === s);
        return { sector: s, count: rows.length, amount: rows.reduce((t, f) => t + parseAmount(f.amount_assisted), 0) };
      }).sort((a, b) => b.count - a.count),
    };
  }, [firms]);

  const ready = firms !== null;

  return (
    <div className="ax">
      <PageProgress />
      <Intro stats={stats} ready={ready} firms={firms} />
      <Purpose />
      <Territory stats={stats} ready={ready} />
      <Sectors stats={stats} ready={ready} />
      <Workflow />
      <PromiseSection />
    </div>
  );
}
