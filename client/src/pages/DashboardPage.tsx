import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { IconAbout, IconFirms, IconMap } from '../components/icons/NavIcons';
import { SECTORS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { computeDashboardStats } from '../lib/dashboardStats';
import { firmTone, parseAmount, peso, pesoCompact, valueTone } from '../lib/format';
import type { Firm } from '../types';
import '../home.css';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Standing = 'attention' | 'running' | 'settled';

const STANDING: Record<Standing, { label: string; color: string }> = {
  attention: { label: 'Needs attention', color: 'var(--bx-bad)' },
  running: { label: 'On schedule', color: 'var(--bx-run)' },
  settled: { label: 'Settled', color: 'var(--bx-good)' },
};
const STANDING_KEYS = Object.keys(STANDING) as Standing[];

function standingOf(f: Firm): Standing {
  const tone = firmTone(f);
  return tone === 'warn' ? 'attention' : tone === 'ok' ? 'settled' : 'running';
}

/** The status worth showing for a firm: the problem if there is one, else its project status. */
function headline(f: Firm): string {
  return valueTone(f.status) === 'bad' ? f.status : f.project_status;
}

function initials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const SIZE = 420;
const C = SIZE / 2;
const RINGS = [
  { district: '1', r: 84 },
  { district: '2', r: 136 },
  { district: '3', r: 188 },
] as const;

/** Firms as dots on their district ring: size = assistance, colour = standing. */
function DistrictRings({ firms, onOpen }: { firms: Firm[]; onOpen: (f: Firm) => void }) {
  const [hover, setHover] = useState<{ f: Firm; x: number; y: number } | null>(null);
  const max = Math.max(1, ...firms.map((f) => parseAmount(f.amount_assisted)));
  let order = 0;

  return (
    <div className="bx-chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label="Firms by district">
        {RINGS.map((ring) => (
          <circle key={ring.district} className="bx-ring" cx={C} cy={C} r={ring.r} />
        ))}
        {RINGS.map((ring) => (
          <g key={`t${ring.district}`}>
            <rect className="bx-ring-bg" x={C - 15} y={C - ring.r - 9} width="30" height="18" rx="9" />
            <text className="bx-ring-tag" x={C} y={C - ring.r + 4}>
              D{ring.district}
            </text>
          </g>
        ))}
        <text className="bx-center-n" x={C} y={C + 10}>
          {firms.length}
        </text>
        <text className="bx-center-l" x={C} y={C + 32}>
          firms
        </text>

        {RINGS.map((ring) => {
          const members = firms.filter((f) => f.district === ring.district);
          const step = 360 / Math.max(1, members.length);
          return members.map((f, i) => {
            const a = ((-90 + step / 2 + step * i) * Math.PI) / 180;
            const x = C + ring.r * Math.cos(a);
            const y = C + ring.r * Math.sin(a);
            const r = 7 + 9 * Math.sqrt(parseAmount(f.amount_assisted) / max);
            const st = standingOf(f);
            const delay = 250 + order++ * 45;
            return (
              <g
                key={f.firm_id}
                className={hover?.f.firm_id === f.firm_id ? 'bx-dot on' : 'bx-dot'}
                role="link"
                tabIndex={0}
                aria-label={`${f.firm}, District ${f.district}, ${STANDING[st].label}`}
                onMouseEnter={() => setHover({ f, x, y })}
                onFocus={() => setHover({ f, x, y })}
                onBlur={() => setHover(null)}
                onClick={() => onOpen(f)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(f);
                  }
                }}
              >
                <circle cx={x} cy={y} r={r} fill={STANDING[st].color} style={{ animationDelay: `${delay}ms` }} />
              </g>
            );
          });
        })}
      </svg>

      {hover && (
        <div className="bx-tip" style={{ left: `${(hover.x / SIZE) * 100}%`, top: `${(hover.y / SIZE) * 100}%` }}>
          <strong>{hover.f.firm}</strong>
          {pesoCompact(parseAmount(hover.f.amount_assisted))} · {headline(hover.f)}
        </div>
      )}
    </div>
  );
}

/** Half-ring gauge for the share of firms that have fully repaid. */
function Gauge({ pct }: { pct: number }) {
  const len = Math.PI * 62;
  return (
    <svg viewBox="0 0 160 96" aria-hidden>
      <path className="bx-gauge-track" d="M 18 86 A 62 62 0 0 1 142 86" />
      <path
        className="bx-gauge-fill"
        d="M 18 86 A 62 62 0 0 1 142 86"
        style={{ strokeDasharray: `${(len * pct) / 100} ${len}` }}
      />
      <text className="bx-gauge-n" x="80" y="82">
        {pct}%
      </text>
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firms, setFirms] = useState<Firm[] | null>(null);
  const [error, setError] = useState('');
  const [now] = useState(() => new Date());

  useEffect(() => {
    api
      .listFirms()
      .then(setFirms)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load the registry'));
  }, []);

  const view = useMemo(() => {
    const list = firms ?? [];
    const queue = list
      .filter((f) => standingOf(f) === 'attention')
      .sort((a, b) => parseAmount(b.amount_assisted) - parseAmount(a.amount_assisted));
    const mix: Record<Standing, number> = { attention: 0, running: 0, settled: 0 };
    for (const f of list) mix[standingOf(f)] += 1;
    const districts = RINGS.map(({ district }) =>
      list.filter((f) => f.district === district).reduce((s, f) => s + parseAmount(f.amount_assisted), 0)
    );
    const sectors = SECTORS.map((s) => ({ sector: s, count: list.filter((f) => f.sector === s).length }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
    return {
      stats: computeDashboardStats(list),
      queue,
      mix,
      districts,
      sectors,
      total: list.reduce((s, f) => s + parseAmount(f.amount_assisted), 0),
      count: list.length,
    };
  }, [firms]);

  const open = (f: Firm) => navigate(`/firms?q=${encodeURIComponent(f.firm)}`);
  const today = now.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long' });
  const thisMonth = now.getMonth();
  const maxMonth = Math.max(1, ...view.stats.monthlyCounts);
  const yearTotal = view.stats.monthlyCounts.reduce((s, n) => s + n, 0);
  const settledPct = view.count ? Math.round((view.mix.settled / view.count) * 100) : 0;
  const top = view.queue[0];
  const ready = firms !== null;

  return (
    <div className="bx">
      {/* ── Hero ── */}
      <section className="bx-tile bx-hero" aria-label="Today">
        <div className="bx-map" aria-hidden>
          <img src="/maps/cagayan-8-214-114.png?v=cagayan214" alt="" />
          <img src="/maps/cagayan-8-214-115.png?v=cagayan214" alt="" />
        </div>
        <span className="bx-credit">Map © OpenStreetMap contributors</span>

        <div className="bx-hero-top">
          <span className="bx-date">{today}</span>
          <h1 className="bx-hello">
            {greeting(now)}, <em>{user?.username ?? 'team'}</em>
          </h1>
        </div>

        <div className="bx-hero-bottom">
          <p className="bx-brief">
            {error ? (
              error
            ) : !ready ? (
              'Loading the registry…'
            ) : view.count === 0 ? (
              'No firms yet. Register the first assisted firm to get started.'
            ) : top ? (
              <>
                <strong className="bad">
                  {view.queue.length} {view.queue.length === 1 ? 'account needs' : 'accounts need'} follow-up
                </strong>{' '}
                across Cagayan. Start with <strong>{top.firm}</strong> — {peso(parseAmount(top.amount_assisted))},{' '}
                {headline(top).toLowerCase()}.
              </>
            ) : (
              <>
                <strong>Every account is on schedule.</strong> Nothing needs follow-up today.
              </>
            )}
          </p>
          <div className="bx-actions">
            <Link to={view.queue.length ? '/firms?lane=attention' : '/firms'} className="bx-btn bx-btn-light">
              {view.queue.length ? 'Review follow-ups' : 'Open registry'} →
            </Link>
            <Link to="/map" className="bx-btn bx-btn-ghost">
              Open the map
            </Link>
          </div>
        </div>
      </section>

      {/* ── Assistance ── */}
      <section className="bx-tile bx-money" aria-label="Assistance extended">
        <p className="bx-cap">Assistance extended</p>
        <p className="bx-big">{ready ? pesoCompact(view.total) : '–'}</p>
        <p className="bx-note">
          {ready ? peso(view.total) : ' '} across {view.count} firms
        </p>
        <div className="bx-split" aria-hidden>
          {view.districts.map((amt, i) => (
            <span key={RINGS[i].district} style={{ flexGrow: amt || 0.0001 }} />
          ))}
        </div>
        <ul className="bx-split-keys">
          {view.districts.map((amt, i) => (
            <li key={RINGS[i].district}>
              D{RINGS[i].district} <b>{pesoCompact(amt)}</b>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Settled gauge ── */}
      <section className="bx-tile bx-gauge" aria-label={`${settledPct}% of firms settled`}>
        <p className="bx-cap">Fully repaid</p>
        <Gauge pct={ready ? settledPct : 0} />
        <p className="bx-note">
          {view.mix.settled} of {view.count} firms
        </p>
      </section>

      {/* ── Follow-up count ── */}
      <Link
        to={view.queue.length ? '/firms?lane=attention' : '/firms'}
        className={view.queue.length ? 'bx-tile bx-alert' : 'bx-tile bx-alert calm'}
      >
        <div>
          <p className="bx-cap">Follow-up</p>
          <p className="bx-big">{ready ? view.queue.length : '–'}</p>
          <p className="bx-note">{view.queue.length === 1 ? 'account is overdue' : 'accounts overdue'}</p>
        </div>
        <span className="bx-alert-go">{view.queue.length ? 'Review now →' : 'All clear ✓'}</span>
      </Link>

      {/* ── Queue ── */}
      <section className="bx-tile bx-queue" aria-labelledby="bx-queue">
        <div className="bx-head">
          <h2 id="bx-queue">Who to call first</h2>
          {view.queue.length > 0 && (
            <Link to="/firms?lane=attention" className="bx-link">
              See all →
            </Link>
          )}
        </div>
        <p className="bx-note">Overdue accounts, largest balance first.</p>
        {ready && view.queue.length === 0 ? (
          <p className="bx-empty">No overdue accounts right now.</p>
        ) : (
          <ol className="bx-rows">
            {view.queue.slice(0, 5).map((f) => (
              <li key={f.firm_id}>
                <Link to={`/firms?q=${encodeURIComponent(f.firm)}`} className="bx-row">
                  <span className="bx-avatar" aria-hidden>
                    {initials(f.firm)}
                  </span>
                  <span className="min-w-0">
                    <span className="bx-name">{f.firm}</span>
                    <span className="bx-sub">
                      {f.beneficiary} · District {f.district}
                    </span>
                  </span>
                  <span>
                    <span className="bx-amt">{pesoCompact(parseAmount(f.amount_assisted))}</span>
                    <span className="bx-tag">{headline(f)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── District rings ── */}
      <section className="bx-tile bx-orbit" aria-labelledby="bx-orbit">
        <div className="bx-head">
          <h2 id="bx-orbit">Portfolio by district</h2>
          <Link to="/map" className="bx-link">
            Map →
          </Link>
        </div>
        <p className="bx-note">Each dot is a firm, sized by assistance.</p>
        {firms && <DistrictRings firms={firms} onOpen={open} />}
        <ul className="bx-legend">
          {STANDING_KEYS.map((k) => (
            <li key={k}>
              <i style={{ background: STANDING[k].color }} />
              {STANDING[k].label} <b>{view.mix[k]}</b>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Intake ── */}
      <section className="bx-tile bx-intake" aria-labelledby="bx-intake">
        <div className="bx-head">
          <h2 id="bx-intake">Intake {view.stats.year}</h2>
          <span className="bx-cap">{yearTotal} new</span>
        </div>
        <ol className="bx-bars" aria-label="Firms registered per month">
          {view.stats.monthlyCounts.map((n, i) => (
            <li key={MONTH_NAMES[i]} className={i === thisMonth ? 'now' : undefined} title={`${MONTH_NAMES[i]}: ${n}`}>
              <span style={{ height: `${(n / maxMonth) * 100}%`, animationDelay: `${300 + i * 30}ms` }} />
              <small>{MONTHS[i]}</small>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Sectors ── */}
      <section className="bx-tile bx-sector" aria-labelledby="bx-sector">
        <div className="bx-head">
          <h2 id="bx-sector">Top sectors</h2>
        </div>
        <ul className="bx-sectors">
          {view.sectors.map((s, i) => (
            <li key={s.sector} className={i === 0 ? 'lead' : undefined}>
              <Link to={`/firms?q=${encodeURIComponent(s.sector)}`}>
                {s.sector}
                <b>{s.count}</b>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Ways in ── */}
      <Link to="/firms" className="bx-tile bx-go bx-go-dark bx-l1">
        <div className="bx-go-top">
          <span className="bx-go-icon" aria-hidden>
            <IconFirms />
          </span>
          <span className="bx-go-stat">{ready ? `${view.count} firms` : '–'}</span>
        </div>
        <div className="bx-go-body">
          <strong className="bx-go-title">Firm registry</strong>
          <p className="bx-go-desc">Search, update and triage every assisted firm.</p>
        </div>
        <span className="bx-go-cta">
          Open registry <i aria-hidden>→</i>
        </span>
      </Link>

      <Link to="/map" className="bx-tile bx-go bx-go-map bx-l2">
        <div className="bx-go-art" aria-hidden>
          <img src="/maps/cagayan-8-214-114.png?v=cagayan214" alt="" />
          <img src="/maps/cagayan-8-214-115.png?v=cagayan214" alt="" />
        </div>
        <div className="bx-go-top">
          <span className="bx-go-icon" aria-hidden>
            <IconMap />
          </span>
          <span className="bx-go-stat">3 districts</span>
        </div>
        <div className="bx-go-body">
          <strong className="bx-go-title">Map</strong>
          <p className="bx-go-desc">See where every firm operates across Cagayan.</p>
        </div>
        <span className="bx-go-cta">
          Open map <i aria-hidden>→</i>
        </span>
      </Link>

      <Link to="/about" className="bx-tile bx-go bx-go-light bx-l3">
        <div className="bx-go-top">
          <span className="bx-go-icon" aria-hidden>
            <IconAbout />
          </span>
          <span className="bx-go-stat">{SECTORS.length} sectors</span>
        </div>
        <div className="bx-go-body">
          <strong className="bx-go-title">About PSTO</strong>
          <p className="bx-go-desc">Mission, territory and the sectors we serve.</p>
        </div>
        <span className="bx-go-cta">
          Read more <i aria-hidden>→</i>
        </span>
      </Link>
    </div>
  );
}
