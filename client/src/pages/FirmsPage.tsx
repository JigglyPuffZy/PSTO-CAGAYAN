import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Button } from '../components/ui/Button';
import { FormField, SelectInput, TextInput } from '../components/ui/Field';
import { DISTRICTS, FIRM_STATUSES, PROJECT_STATUSES, SECTORS } from '../constants';
import { cn } from '../lib/cn';
import { firmTone, matchesFirm, parseAmount, peso, pesoCompact, valueTone } from '../lib/format';
import { proposalPublicUrl } from '../lib/storage';
import type { Firm } from '../types';
import '../firms.css';

type FirmForm = Omit<Firm, 'firm_id' | 'proposal'>;
type SortKey = 'newest' | 'amount' | 'name';
type View = 'board' | 'table';
type LaneKey = 'attention' | 'running' | 'settled';

const emptyForm = (): FirmForm => ({
  year: new Date().getFullYear().toString(),
  firm: '',
  beneficiary: '',
  project_title: '',
  amount_assisted: '',
  spin_no: '',
  sector: SECTORS[0],
  district: '1',
  employee: '',
  equipment: '',
  trainings: '',
  project_status: PROJECT_STATUSES[0],
  status: FIRM_STATUSES[0],
});

/** The board groups firms by account standing, so the urgent ones are always first. */
const LANES: { key: LaneKey; name: string; hint: string; color: string }[] = [
  { key: 'attention', name: 'Needs attention', hint: 'Past due, penalties or delinquent', color: '#e5484d' },
  { key: 'running', name: 'On schedule', hint: 'Regular dues or awaiting update', color: 'var(--dost-mid)' },
  { key: 'settled', name: 'Settled', hint: 'Fully paid, no balance left', color: '#2f9e6a' },
];

function laneOf(f: Firm): LaneKey {
  const tone = firmTone(f);
  return tone === 'warn' ? 'attention' : tone === 'ok' ? 'settled' : 'running';
}

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  amount: 'Highest assistance',
  name: 'Name A–Z',
};

/** Plain-language meaning of each status, shown in the dossier. */
const STATUS_HELP: Record<string, string> = {
  'Regular Due': 'Payments are on schedule.',
  'Past Due': 'A payment has been missed and needs follow-up.',
  'Unpaid Penalties': 'Penalties are still unpaid.',
  'Fully Paid Projects': 'The project has been fully repaid.',
  'Endorsed to OSG': 'Endorsed to the Office of the Solicitor General for collection.',
  Pending: 'Waiting for an update.',
  Updated: 'Records are up to date.',
  'Fully Paid': 'No balance remains.',
  'Due and Demandable': 'The full balance is due and may be collected.',
  Delinquent: 'The firm is delinquent on its obligations.',
};

function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-[18px] w-[18px]" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m20 20-3.6-3.6" />
    </svg>
  );
}

function Pill({ value, prefix }: { value: string; prefix?: string }) {
  return (
    <span className={cn('fx-pill', `fx-pill-${valueTone(value)}`)}>
      {prefix}
      {value || 'No status'}
    </span>
  );
}

function money(v: string): string {
  const n = parseAmount(v);
  return n ? peso(n) : '—';
}

/* ───────────────────────── Dossier ───────────────────────── */

function Dossier({
  firm,
  onClose,
  onEdit,
  onDelete,
  onMap,
}: {
  firm: Firm;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onMap: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const lane = laneOf(firm);
  const bad = [firm.project_status, firm.status].filter((v) => valueTone(v) === 'bad');
  const step = lane === 'settled' ? 3 : parseAmount(firm.amount_assisted) ? 2 : 1;
  const track = ['Registered', 'Assisted', 'Repaying', 'Settled'];

  return (
    <div className="fx-dos">
      <div className="fx-dos-head">
        <button type="button" className="pg-close" onClick={onClose} aria-label="Close firm details">
          ×
        </button>
        <p className="fx-dos-kicker">
          District {firm.district} · {firm.sector}
        </p>
        <h2 className="fx-dos-title">{firm.firm}</h2>
        <p className="fx-dos-ben">{firm.beneficiary}</p>
        <p className="fx-dos-amt">
          {money(firm.amount_assisted)}
          <small>assistance extended · {firm.year}</small>
        </p>
      </div>

      <div className="fx-dos-body">
        {bad.length > 0 ? (
          <div className="fx-note fx-note-bad" role="note">
            <span aria-hidden>⚠</span>
            <span>
              <strong>Needs attention — {[...new Set(bad)].join(', ')}.</strong> {STATUS_HELP[bad[0]]}
            </span>
          </div>
        ) : lane === 'settled' ? (
          <div className="fx-note fx-note-good" role="note">
            <span aria-hidden>✓</span>
            <span>
              <strong>Settled.</strong> {STATUS_HELP[firm.project_status] ?? STATUS_HELP[firm.status]}
            </span>
          </div>
        ) : (
          <div className="fx-note fx-note-info" role="note">
            <span aria-hidden>●</span>
            <span>
              <strong>On schedule.</strong> {STATUS_HELP[firm.project_status] ?? 'No issues recorded.'}
            </span>
          </div>
        )}

        <ol className="fx-track" aria-label={`Stage: ${track[step]}`}>
          {track.map((t, i) => (
            <li key={t} className={cn(i <= step && 'on', i === step && lane === 'attention' && 'bad')}>
              {t}
            </li>
          ))}
        </ol>

        <dl className="fx-facts">
          <div className="wide">
            <dt>Project</dt>
            <dd>{firm.project_title || '—'}</dd>
          </div>
          <div>
            <dt>Project status</dt>
            <dd className="mt-1">
              <Pill value={firm.project_status} />
            </dd>
          </div>
          <div>
            <dt>Firm status</dt>
            <dd className="mt-1">
              <Pill value={firm.status} />
            </dd>
          </div>
          <div>
            <dt>SPIN no.</dt>
            <dd>{firm.spin_no || '—'}</dd>
          </div>
          <div>
            <dt>Employees</dt>
            <dd>{firm.employee || '—'}</dd>
          </div>
        </dl>

        <div className="fx-group">
          <h4>Support provided</h4>
          <dl className="fx-facts">
            <div className="wide">
              <dt>Equipment</dt>
              <dd>{firm.equipment || '—'}</dd>
            </div>
            <div className="wide">
              <dt>Training</dt>
              <dd>{firm.trainings || '—'}</dd>
            </div>
          </dl>
        </div>

        {firm.proposal && (
          <a
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--dost-wash)] px-4 py-2.5 text-sm font-bold text-[var(--dost-primary)] hover:bg-[var(--dost-pale)]/60"
            href={proposalPublicUrl(firm.proposal) ?? '#'}
            target="_blank"
            rel="noreferrer"
          >
            Open proposal PDF ↗
          </a>
        )}
      </div>

      <div className="fx-dos-foot">
        {confirming ? (
          <div className="fx-confirm" role="alertdialog" aria-label="Confirm delete">
            <p>Delete “{firm.firm}”? This cannot be undone.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setConfirming(false)} disabled={deleting}>
                Keep firm
              </Button>
              <Button
                className="fx-danger flex-1"
                disabled={deleting}
                autoFocus
                onClick={async () => {
                  setDeleting(true);
                  await onDelete();
                  setDeleting(false);
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="primary" className="flex-1" onClick={onMap}>
              Show on map
            </Button>
            <Button className="flex-1" onClick={onEdit}>
              Edit
            </Button>
            <Button
              className="!text-[#b42318] hover:!bg-[#fdeceb]"
              onClick={() => setConfirming(true)}
              aria-label="Delete firm"
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Overview({ counts, total, amount }: { counts: Record<LaneKey, number>; total: number; amount: number }) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const a = pct(counts.attention);
  const r = a + pct(counts.running);
  const ring = total
    ? `conic-gradient(#e5484d 0 ${a}%, var(--dost-mid) ${a}% ${r}%, #2f9e6a ${r}% 100%)`
    : 'var(--dost-wash)';
  return (
    <div className="fx-overview">
      <p className="fx-eyebrow">Registry standing</p>
      <div className="fx-ring" style={{ background: ring }}>
        <div>
          <strong>{total}</strong>
          <span>firms</span>
        </div>
      </div>
      <ul className="fx-legend">
        {LANES.map((l) => (
          <li key={l.key}>
            <i style={{ background: l.color }} />
            {l.name}
            <b>{counts[l.key]}</b>
          </li>
        ))}
      </ul>
      <p className="mt-5 mb-0 text-sm text-[var(--dost-muted)]">
        <strong className="font-display text-xl text-[var(--dost-primary-dark)]">{peso(amount)}</strong>
        <br />
        assistance across the registry
      </p>
      <div className="fx-tip">
        <span aria-hidden className="text-lg">
          ☞
        </span>
        Select any firm to open its full record here.
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function FirmsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const wide = useMedia('(min-width: 1536px)');

  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [district, setDistrict] = useState(() => {
    const d = params.get('d');
    return d && (DISTRICTS as readonly string[]).includes(d) ? d : '';
  });
  const [sector, setSector] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [view, setView] = useState<View>('board');
  const [focusLane, setFocusLane] = useState<LaneKey | null>(() => {
    const l = params.get('lane');
    return LANES.some((x) => x.key === l) ? (l as LaneKey) : null;
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Firm | null>(null);
  const [form, setForm] = useState<FirmForm>(emptyForm);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setFirms(await api.listFirms());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load firms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // "/" jumps to search, Esc closes panels
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setFormOpen(false);
        setSelectedId(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = params.get('q');
    if (q != null && q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const selected = firms.find((f) => f.firm_id === selectedId) ?? null;

  const visible = useMemo(() => {
    const rows = firms.filter((f) => {
      if (district && f.district !== district) return false;
      if (sector && f.sector !== sector) return false;
      if (projectStatus && f.project_status !== projectStatus) return false;
      if (status && f.status !== status) return false;
      return matchesFirm(f, search.trim());
    });
    if (sort === 'amount') rows.sort((a, b) => parseAmount(b.amount_assisted) - parseAmount(a.amount_assisted));
    if (sort === 'name') rows.sort((a, b) => a.firm.localeCompare(b.firm));
    if (sort === 'newest') rows.sort((a, b) => b.firm_id - a.firm_id);
    return rows;
  }, [firms, district, sector, projectStatus, status, search, sort]);

  const byLane = useMemo(() => {
    const out: Record<LaneKey, Firm[]> = { attention: [], running: [], settled: [] };
    for (const f of visible) out[laneOf(f)].push(f);
    return out;
  }, [visible]);

  const registry = useMemo(() => {
    const d: Record<string, number> = {};
    const s: Record<string, number> = {};
    const lanes: Record<LaneKey, number> = { attention: 0, running: 0, settled: 0 };
    let total = 0;
    for (const f of firms) {
      d[f.district] = (d[f.district] ?? 0) + 1;
      s[f.sector] = (s[f.sector] ?? 0) + 1;
      lanes[laneOf(f)] += 1;
      total += parseAmount(f.amount_assisted);
    }
    return { d, s, lanes, total };
  }, [firms]);

  const shownAssistance = visible.reduce((sum, f) => sum + parseAmount(f.amount_assisted), 0);

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (search.trim()) activeFilters.push({ key: 'q', label: `“${search.trim()}”`, clear: () => setSearch('') });
  if (district) activeFilters.push({ key: 'd', label: `District ${district}`, clear: () => setDistrict('') });
  if (sector) activeFilters.push({ key: 's', label: sector, clear: () => setSector('') });
  if (projectStatus) activeFilters.push({ key: 'p', label: projectStatus, clear: () => setProjectStatus('') });
  if (status) activeFilters.push({ key: 'f', label: `Firm: ${status}`, clear: () => setStatus('') });

  function clearFilters() {
    setSearch('');
    setDistrict('');
    setSector('');
    setProjectStatus('');
    setStatus('');
    if (params.has('q')) setParams({}, { replace: true });
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setProposalFile(null);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(f: Firm) {
    setEditing(f);
    const { firm_id: _id, proposal: _p, ...rest } = f;
    setForm(rest);
    setProposalFile(null);
    setFormError('');
    setFormOpen(true);
  }

  async function handleDelete(f: Firm) {
    try {
      await api.deleteFirm(f.firm_id);
      setSelectedId(null);
      setToast(`“${f.firm}” was deleted`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.amount_assisted.trim() && !parseAmount(form.amount_assisted)) {
      setFormError('Amount assisted must be a number, for example 850000.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (proposalFile) fd.append('proposal', proposalFile);
      if (editing) await api.updateFirm(editing.firm_id, fd);
      else await api.createFirm(fd);
      setFormOpen(false);
      setToast(editing ? `Saved changes to “${form.firm}”` : `“${form.firm}” was registered`);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof FirmForm>(key: K) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const formAmount = parseAmount(form.amount_assisted);
  const lanesShown = focusLane ? LANES.filter((l) => l.key === focusLane) : LANES;

  const dossier = selected && (
    <Dossier
      key={selected.firm_id}
      firm={selected}
      onClose={() => setSelectedId(null)}
      onEdit={() => openEdit(selected)}
      onDelete={() => handleDelete(selected)}
      onMap={() => navigate(`/map?q=${encodeURIComponent(selected.firm)}`)}
    />
  );

  return (
    <div className="fx">
      {/* ── Board ── */}
      <main className="fx-main">
        <header className="fx-head animate-fade-up">
          <div>
            <p className="fx-eyebrow">Firm registry</p>
            <h1 className="fx-title">Assisted firms</h1>
          </div>
          <button type="button" className="fx-btn fx-btn-solid" onClick={openAdd}>
            <span aria-hidden>＋</span> Register firm
          </button>
        </header>

        {/* One bar holds everything that narrows the board */}
        <div className="fx-bar animate-fade-up" role="search">
          <label className="fx-search">
            <SearchIcon />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search firm, owner, project or SPIN no."
              aria-label="Search firms"
            />
            {search ? (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search">
                ✕
              </button>
            ) : (
              <kbd title="Press / to search">/</kbd>
            )}
          </label>

          <div className="fx-bar-filters">
            <div className="fx-dseg" role="group" aria-label="District">
              <button type="button" aria-pressed={!district} onClick={() => setDistrict('')}>
                All
              </button>
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={district === d}
                  onClick={() => setDistrict(district === d ? '' : d)}
                  title={`District ${d}`}
                >
                  D{d}
                  <small>{registry.d[d] ?? 0}</small>
                </button>
              ))}
            </div>

            <select
              className={cn('fx-pick', sector && 'fx-pick-on')}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              aria-label="Sector"
            >
              <option value="">All sectors</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s} ({registry.s[s] ?? 0})
                </option>
              ))}
            </select>

            <select
              className={cn('fx-pick', (projectStatus || status) && 'fx-pick-on')}
              value={projectStatus ? `p:${projectStatus}` : status ? `f:${status}` : ''}
              onChange={(e) => {
                const v = e.target.value;
                setProjectStatus(v.startsWith('p:') ? v.slice(2) : '');
                setStatus(v.startsWith('f:') ? v.slice(2) : '');
              }}
              aria-label="Status"
            >
              <option value="">Any status</option>
              <optgroup label="Project status">
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={`p:${s}`}>
                    {s}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Firm status">
                {FIRM_STATUSES.map((s) => (
                  <option key={s} value={`f:${s}`}>
                    {s}
                  </option>
                ))}
              </optgroup>
            </select>

            <select
              className="fx-pick"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort firms"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>

            <div className="fx-seg" role="group" aria-label="View">
              <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>
                Board
              </button>
              <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
                Table
              </button>
            </div>
          </div>
        </div>

        <div className="fx-pulse">
          <p className="fx-pulse-line" aria-live="polite">
            {loading ? (
              'Loading the registry…'
            ) : (
              <>
                <em>{visible.length}</em> of {firms.length} firms · <em>{pesoCompact(shownAssistance)}</em> assisted
                {byLane.attention.length > 0 && (
                  <>
                    {' '}
                    · <span className="fx-bad">{byLane.attention.length} need attention</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>

        <div className="fx-meter" aria-hidden>
          {LANES.map((l) => (
            <span
              key={l.key}
              className={l.key === 'attention' ? 'm-bad' : l.key === 'running' ? 'm-run' : 'm-good'}
              style={{ flexGrow: byLane[l.key].length }}
            />
          ))}
        </div>

        {(activeFilters.length > 0 || focusLane) && (
          <div className="fx-chips" aria-label="Active filters">
            {focusLane && (
              <button type="button" className="fx-chip" onClick={() => setFocusLane(null)}>
                Only “{LANES.find((l) => l.key === focusLane)?.name}”<b aria-hidden>×</b>
              </button>
            )}
            {activeFilters.map((f) => (
              <button key={f.key} type="button" className="fx-chip" onClick={f.clear} title="Remove this filter">
                {f.label}
                <b aria-hidden>×</b>
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button type="button" className="fx-link" onClick={clearFilters}>
                Reset all
              </button>
            )}
          </div>
        )}

        {error && (
          <div
            className="alert-dost-error mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
            role="alert"
          >
            <span>{error}</span>
            <button type="button" className="fx-link" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {view === 'board' ? (
          <div className={cn('fx-board', focusLane && 'fx-board-solo')}>
            {lanesShown.map((lane) => {
              const rows = byLane[lane.key];
              return (
                <section key={lane.key} className="fx-lane" aria-label={lane.name}>
                  <button
                    type="button"
                    className="fx-lane-head"
                    onClick={() => setFocusLane(focusLane === lane.key ? null : lane.key)}
                    title={focusLane ? 'Show all lanes' : `Show only ${lane.name}`}
                  >
                    <span className="fx-lane-dot" style={{ background: lane.color }} />
                    <span>
                      <span className="fx-lane-name">{lane.name}</span>
                      <span className="fx-lane-hint">{lane.hint}</span>
                    </span>
                    <span className="fx-lane-count">{loading ? '–' : rows.length}</span>
                  </button>
                  <div className="fx-tiles">
                    {loading ? (
                      [0, 1, 2].map((i) => <div key={i} className="fx-skel" />)
                    ) : rows.length === 0 ? (
                      <p className="fx-lane-empty">
                        {firms.length === 0 ? 'No firms yet' : 'Nothing here with these filters'}
                      </p>
                    ) : (
                      rows.map((f, i) => (
                        <button
                          key={f.firm_id}
                          type="button"
                          onClick={() => setSelectedId(f.firm_id === selectedId ? null : f.firm_id)}
                          className={cn('fx-tile animate-fade-up', f.firm_id === selectedId && 'fx-tile-on')}
                          style={{ '--accent': lane.color, animationDelay: `${Math.min(i, 8) * 30}ms` } as CSSProperties}
                          aria-pressed={f.firm_id === selectedId}
                        >
                          <h3>{f.firm}</h3>
                          <p className="fx-tile-ben">{f.beneficiary}</p>
                          <span className="fx-tile-amt">{money(f.amount_assisted)}</span>
                          <span className="fx-tile-foot">
                            <span className="fx-d">D{f.district}</span>
                            {lane.key === 'settled' ? (
                              <span>{f.sector}</span>
                            ) : (
                              <Pill value={valueTone(f.status) === 'bad' ? f.status : f.project_status} />
                            )}
                            <span className="ml-auto">{f.year}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="fx-table-wrap">
            <table className="fx-table">
              <thead>
                <tr>
                  <th scope="col">
                    <button type="button" className="fx-link !p-0 !text-[inherit]" onClick={() => setSort('name')}>
                      Firm {sort === 'name' && '↑'}
                    </button>
                  </th>
                  <th scope="col">Sector</th>
                  <th scope="col">District</th>
                  <th scope="col" className="fx-num">
                    <button type="button" className="fx-link !p-0 !text-[inherit]" onClick={() => setSort('amount')}>
                      Assistance {sort === 'amount' && '↓'}
                    </button>
                  </th>
                  <th scope="col">Project status</th>
                  <th scope="col">Firm status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr
                    key={f.firm_id}
                    tabIndex={0}
                    className={cn(f.firm_id === selectedId && 'fx-row-on')}
                    onClick={() => setSelectedId(f.firm_id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(f.firm_id);
                      }
                    }}
                  >
                    <td>
                      <strong className="block">{f.firm}</strong>
                      <span className="text-xs text-[var(--dost-muted)]">{f.beneficiary}</span>
                    </td>
                    <td>{f.sector}</td>
                    <td>
                      <span className="fx-d">D{f.district}</span>
                    </td>
                    <td className="fx-num">{money(f.amount_assisted)}</td>
                    <td>
                      <Pill value={f.project_status} />
                    </td>
                    <td>
                      <Pill value={f.status} />
                    </td>
                  </tr>
                ))}
                {!loading && visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[var(--dost-muted)]">
                      No firms match.{' '}
                      <button type="button" className="fx-link" onClick={clearFilters}>
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Live dossier (docked on very wide screens) ── */}
      <aside className="fx-dossier" aria-label="Firm details">
        {dossier ?? <Overview counts={registry.lanes} total={firms.length} amount={registry.total} />}
      </aside>

      {/* ── Dossier as a drawer (narrower screens) ── */}
      {!wide &&
        selected &&
        createPortal(
          <div className="pg-overlay" role="presentation" onClick={() => setSelectedId(null)}>
            <aside
              className="fx-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.firm} details`}
              onClick={(e) => e.stopPropagation()}
            >
              {dossier}
            </aside>
          </div>,
          document.body
        )}

      {toast && (
        <div className="fx-toast" role="status">
          {toast}
        </div>
      )}

      {/* ── Register / edit ── */}
      {formOpen &&
        createPortal(
          <div className="pg-overlay pg-overlay-center" role="presentation" onClick={() => setFormOpen(false)}>
            <form
              className="pg-sheet"
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              aria-label={editing ? 'Edit firm' : 'Register firm'}
            >
              <div className="pg-sheet-head">
                <div>
                  <p className="pg-kicker">{editing ? 'Update record' : 'New record'}</p>
                  <h2 className="font-display text-2xl font-extrabold text-white">
                    {editing ? `Edit ${editing.firm}` : 'Register a firm'}
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">Fields marked * are required.</p>
                </div>
                <button type="button" className="pg-close" onClick={() => setFormOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>

              <div className="pg-sheet-body">
                {formError && (
                  <p className="alert-dost-error rounded-xl px-4 py-3 text-sm" role="alert">
                    {formError}
                  </p>
                )}

                <fieldset className="pg-fieldset">
                  <legend>Firm details</legend>
                  <FormField label="Firm name *">
                    <TextInput {...set('firm')} required autoFocus placeholder="e.g. Piat Pottery Collective" />
                  </FormField>
                  <FormField label="Beneficiary (owner / contact) *">
                    <TextInput {...set('beneficiary')} required placeholder="Full name" />
                  </FormField>
                  <FormField label="Sector">
                    <SelectInput {...set('sector')}>
                      {SECTORS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectInput>
                  </FormField>
                  <FormField label="District">
                    <SelectInput {...set('district')}>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          District {d}
                        </option>
                      ))}
                    </SelectInput>
                  </FormField>
                </fieldset>

                <fieldset className="pg-fieldset">
                  <legend>Project details</legend>
                  <FormField label="Project title" className="sm:col-span-2">
                    <TextInput {...set('project_title')} placeholder="What was the assistance for?" />
                  </FormField>
                  <FormField label="Amount assisted">
                    <div>
                      <div className="fx-peso">
                        <span aria-hidden>₱</span>
                        <TextInput {...set('amount_assisted')} inputMode="decimal" placeholder="850000" />
                      </div>
                      <p className="fx-hint">{formAmount ? `= ${peso(formAmount)}` : 'Numbers only, no commas needed.'}</p>
                    </div>
                  </FormField>
                  <FormField label="SPIN no.">
                    <TextInput {...set('spin_no')} />
                  </FormField>
                  <FormField label="Year *">
                    <TextInput {...set('year')} inputMode="numeric" required maxLength={4} />
                  </FormField>
                  <FormField label="Employees">
                    <TextInput {...set('employee')} inputMode="numeric" placeholder="Number of workers" />
                  </FormField>
                  <FormField label="Equipment provided">
                    <TextInput {...set('equipment')} />
                  </FormField>
                  <FormField label="Training provided">
                    <TextInput {...set('trainings')} />
                  </FormField>
                </fieldset>

                <fieldset className="pg-fieldset">
                  <legend>Status &amp; documents</legend>
                  <FormField label="Project status">
                    <SelectInput {...set('project_status')}>
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectInput>
                  </FormField>
                  <FormField label="Firm status">
                    <SelectInput {...set('status')}>
                      {FIRM_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </SelectInput>
                  </FormField>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-semibold text-[var(--dost-primary-dark)]">Proposal (PDF)</span>
                    <label className="fx-file">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setProposalFile(e.target.files?.[0] ?? null)}
                      />
                      <span className="fx-file-btn">{proposalFile || editing?.proposal ? 'Replace file' : 'Choose file'}</span>
                      <span className="min-w-0 truncate">
                        {proposalFile
                          ? proposalFile.name
                          : editing?.proposal
                            ? 'A proposal is already on file'
                            : 'No file chosen (optional)'}
                      </span>
                    </label>
                  </div>
                </fieldset>
              </div>

              <div className="pg-sheet-foot">
                <Button type="button" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Register firm'}
                </Button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  );
}
