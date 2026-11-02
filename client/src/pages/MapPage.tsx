import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { FirmMap } from '../components/map/FirmMap';
import { FirmLocationCard } from '../components/map/FirmLocationCard';
import { Button } from '../components/ui/Button';
import { FormField, SelectInput, TextInput } from '../components/ui/Field';
import { DISTRICTS, SECTORS } from '../constants';
import { cn } from '../lib/cn';
import type { Firm, FirmLocation } from '../types';

type MapForm = {
  firm: string;
  beneficiary: string;
  project_title: string;
  amount: string;
  spin_no: string;
  employee: string;
  equipment: string;
  trainings: string;
  sector: string;
  district: string;
  photo: string;
};

const emptyForm = (): MapForm => ({
  firm: '',
  beneficiary: '',
  project_title: '',
  amount: '',
  spin_no: '',
  employee: '',
  equipment: '',
  trainings: '',
  sector: SECTORS[0],
  district: '1',
  photo: '',
});

const DOT: Record<string, string> = {
  '1': 'bg-[var(--dost-primary)]',
  '2': 'bg-[var(--dost-mid)]',
  '3': 'bg-[var(--dost-soft)]',
};

function matches(p: FirmLocation, q: string) {
  if (!q) return true;
  const hay = [p.firm, p.beneficiary, p.project_title, p.spin_no, p.sector].join(' ').toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export function MapPage() {
  const [params] = useSearchParams();
  const resultsRef = useRef<HTMLUListElement>(null);

  const [locations, setLocations] = useState<FirmLocation[]>([]);
  const [registry, setRegistry] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [sector, setSector] = useState('');
  const [district, setDistrict] = useState('');
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);

  const [viewedId, setViewedId] = useState<number | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<MapForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      setLocations(await api.listLocations());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load map pins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api.listFirms().then(setRegistry).catch(() => setRegistry([]));
  }, [refresh]);

  const filtered = useMemo(
    () =>
      locations.filter(
        (p) =>
          (!sector || p.sector === sector) &&
          (!district || p.district === district) &&
          matches(p, search.trim())
      ),
    [locations, search, sector, district]
  );

  const viewed = useMemo(
    () => locations.find((l) => l.id === viewedId) ?? null,
    [locations, viewedId]
  );

  // Arriving from the registry ("Show on map"): jump straight to that firm once pins load.
  const arrivedFor = useRef<string | null>(null);
  useEffect(() => {
    const q = params.get('q');
    if (!q || arrivedFor.current === q || locations.length === 0) return;
    arrivedFor.current = q;
    const exact = locations.find((l) => l.firm.toLowerCase() === q.toLowerCase());
    if (exact) setViewedId(exact.id);
  }, [params, locations]);

  // A single search hit opens itself.
  useEffect(() => {
    if (search.trim() && filtered.length === 1) setViewedId(filtered[0].id);
  }, [filtered, search]);

  function view(loc: FirmLocation) {
    setViewedId(loc.id);
    if (window.innerWidth < 1024) setPanelOpen(false);
  }

  function clearSearch() {
    setSearch('');
    setSector('');
    setDistrict('');
    setViewedId(null);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setPicked(null);
    setSaveError('');
    setPinMode(true);
    setViewedId(null);
  }

  function startEdit(p: FirmLocation) {
    setEditingId(p.id);
    setPicked({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude) });
    setForm({
      firm: p.firm,
      beneficiary: p.beneficiary,
      project_title: p.project_title,
      amount: p.amount,
      spin_no: p.spin_no,
      employee: p.employee,
      equipment: p.equipment,
      trainings: p.trainings,
      sector: p.sector,
      district: p.district,
      photo: p.photo ?? '',
    });
    setSaveError('');
    setPinMode(true);
  }

  function closePinMode() {
    setPinMode(false);
    setEditingId(null);
    setPicked(null);
    setSaveError('');
  }

  function fillFromRegistry(id: string) {
    const f = registry.find((r) => String(r.firm_id) === id);
    if (!f) return;
    setForm((cur) => ({
      ...cur,
      firm: f.firm,
      beneficiary: f.beneficiary,
      project_title: f.project_title,
      amount: f.amount_assisted,
      spin_no: f.spin_no,
      employee: f.employee,
      equipment: f.equipment,
      trainings: f.trainings,
      sector: f.sector || cur.sector,
      district: f.district || cur.district,
    }));
  }

  async function save() {
    if (!picked) {
      setSaveError('Click the map to choose where this firm is.');
      return;
    }
    if (!form.firm.trim()) {
      setSaveError('Firm name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const body = { ...form, latitude: String(picked.lat), longitude: String(picked.lng) };
      if (editingId) await api.updateLocation(editingId, body);
      else await api.createLocation(body);
      closePinMode();
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number, confirmed = false) {
    if (!confirmed && !confirm('Remove this pin from the map?')) return;
    try {
      await api.deleteLocation(id);
      if (viewedId === id) setViewedId(null);
      if (editingId === id) closePinMode();
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function onSearchKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && filtered[0]) {
      e.preventDefault();
      view(filtered[0]);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      resultsRef.current?.querySelector('button')?.focus();
    }
  }

  const filtersActive = Boolean(search || sector || district);

  const chip = (on: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
      on
        ? 'border-[var(--dost-primary)] bg-[var(--dost-primary)] text-white'
        : 'border-[var(--dost-pale)] bg-white text-[var(--dost-primary-dark)] hover:border-[var(--dost-primary)]'
    );

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-3 pt-3 lg:px-6">
      <div className="pg-map-stage">
        <FirmMap
          locations={filtered}
          picked={picked}
          selectedId={viewedId}
          pickEnabled={pinMode}
          onPick={(lat, lng) => {
            setPicked({ lat, lng });
            setSaveError('');
          }}
          onView={view}
        />

        {/* ── Search panel ── */}
        <div className="pg-search-panel">
          <div className="flex items-center gap-2 px-3 pt-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--dost-wash)] px-3 ring-1 ring-[var(--dost-pale)] focus-within:ring-2 focus-within:ring-[var(--dost-primary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--dost-mid)]" aria-hidden>
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m20 20-3.6-3.6" />
              </svg>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPanelOpen(true);
                }}
                onKeyDown={onSearchKey}
                onFocus={() => setPanelOpen(true)}
                placeholder="Search a firm to find it on the map"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--dost-primary-dark)] outline-none placeholder:text-[var(--dost-soft)]"
                aria-label="Search firms on the map"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-lg leading-none text-[var(--dost-muted)]" aria-label="Clear search">
                  ×
                </button>
              )}
            </div>
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--dost-primary)] ring-1 ring-[var(--dost-pale)] hover:bg-[var(--dost-wash)] lg:hidden"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              aria-label={panelOpen ? 'Hide results' : 'Show results'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cn('h-4 w-4 transition-transform', !panelOpen && 'rotate-180')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 15 6-6 6 6" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
            <button type="button" className={chip(!district)} onClick={() => setDistrict('')}>
              All
            </button>
            {DISTRICTS.map((d) => (
              <button key={d} type="button" className={chip(district === d)} onClick={() => setDistrict(district === d ? '' : d)}>
                <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', DOT[d])} />D{d}
              </button>
            ))}
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="ml-auto max-w-[9.5rem] rounded-full border border-[var(--dost-pale)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--dost-primary-dark)] outline-none"
              aria-label="Filter by sector"
            >
              <option value="">All sectors</option>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between px-3 pb-1 pt-2.5 text-xs">
            <p className="font-bold text-[var(--dost-primary-dark)]">
              {loading ? 'Loading pins…' : `${filtered.length} of ${locations.length} firms on map`}
            </p>
            {filtersActive && (
              <button type="button" onClick={clearSearch} className="font-bold text-[var(--dost-primary)] hover:underline">
                Reset
              </button>
            )}
          </div>

          {panelOpen && (
            <ul ref={resultsRef} className="pg-results" role="listbox" aria-label="Search results">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === viewedId}
                    onClick={() => view(p)}
                    onKeyDown={(e) => {
                      const items = Array.from(resultsRef.current?.querySelectorAll('button') ?? []);
                      const i = items.indexOf(e.currentTarget as HTMLButtonElement);
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        items[i + 1]?.focus();
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        items[i - 1]?.focus();
                      }
                    }}
                    className={cn('pg-result', p.id === viewedId && 'pg-result-on')}
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT[p.district] ?? 'bg-[var(--dost-pale)]')} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--dost-primary-dark)]">{p.firm}</span>
                      <span className="block truncate text-xs text-[var(--dost-muted)]">
                        {p.beneficiary} · {p.sector}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-[var(--dost-mid)]">D{p.district}</span>
                  </button>
                </li>
              ))}
              {!loading && filtered.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-[var(--dost-muted)]">
                  {locations.length === 0 ? 'No pins yet. Use “Add pin” to place the first firm.' : 'No firms match your search.'}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* ── Zoom + add ── */}
        <div className="pg-map-actions">
          {!pinMode && (
            <Button variant="primary" size="lg" onClick={startAdd} className="shadow-xl">
              <span className="text-lg leading-none">＋</span> Add pin
            </Button>
          )}
        </div>

        {loadError && (
          <p className="alert-dost-error absolute bottom-4 left-4 z-[1000] rounded-xl px-4 py-3 text-sm shadow-lg">{loadError}</p>
        )}

        {/* ── Spotlight (selected firm) ── */}
        {viewed && !pinMode && (() => {
          const lat = parseFloat(viewed.latitude);
          const lng = parseFloat(viewed.longitude);
          if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
          return (
            <div className="pg-spotlight">
              <FirmLocationCard
                key={viewed.id}
                loc={viewed}
                lat={lat}
                lng={lng}
                registryHref={`/firms?q=${encodeURIComponent(viewed.firm)}`}
                onClose={() => setViewedId(null)}
                onEdit={() => startEdit(viewed)}
                onRemove={() => remove(viewed.id, true)}
              />
            </div>
          );
        })()}

        {/* ── Add / edit pin ── */}
        {pinMode && (
          <div className="pg-pin-panel">
            <div className="pg-pin-head">
              <div>
                <p className="pg-kicker">{editingId ? 'Edit pin' : 'New pin'}</p>
                <p className="font-display text-lg font-extrabold text-white">
                  {picked ? 'Location set' : '1 · Click the map'}
                </p>
              </div>
              <button type="button" className="pg-close" onClick={closePinMode} aria-label="Close pin form">
                ×
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-4">
              <p
                className={cn(
                  'rounded-xl px-3 py-2 text-xs font-semibold tabular-nums',
                  picked ? 'bg-[var(--dost-wash)] text-[var(--dost-primary-dark)]' : 'bg-[var(--dost-primary)]/10 text-[var(--dost-primary)]'
                )}
              >
                {picked
                  ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)} — click again to move`
                  : 'Click the exact spot on the map where the firm operates.'}
              </p>

              {saveError && <p className="alert-dost-error rounded-lg px-3 py-2 text-xs">{saveError}</p>}

              {!editingId && registry.length > 0 && (
                <FormField label="Quick fill from registry">
                  <SelectInput defaultValue="" onChange={(e) => fillFromRegistry(e.target.value)}>
                    <option value="">Choose a registered firm…</option>
                    {registry.map((f) => (
                      <option key={f.firm_id} value={f.firm_id}>
                        {f.firm}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              )}

              <FormField label="Firm *">
                <TextInput value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} />
              </FormField>
              <FormField label="Beneficiary">
                <TextInput value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} />
              </FormField>
              <FormField label="Project title">
                <TextInput value={form.project_title} onChange={(e) => setForm({ ...form, project_title: e.target.value })} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Sector">
                  <SelectInput value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                    {SECTORS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </SelectInput>
                </FormField>
                <FormField label="District">
                  <SelectInput value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        District {d}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>
              <FormField label="Business photo URL">
                <TextInput
                  value={form.photo}
                  onChange={(e) => setForm({ ...form, photo: e.target.value })}
                  placeholder="https://…"
                  autoComplete="off"
                />
              </FormField>
            </div>

            <div className="flex gap-2 border-t border-[var(--dost-wash)] p-3">
              <Button className="flex-1" onClick={closePinMode} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save pin' : 'Place pin'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
