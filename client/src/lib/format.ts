import type { Firm } from '../types';

export function parseAmount(v: string | null | undefined): number {
  const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function peso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
}

export function pesoCompact(n: number): string {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `₱${Math.round(n / 1_000)}K`;
  return peso(n);
}

const ATTENTION = new Set([
  'Past Due',
  'Unpaid Penalties',
  'Endorsed to OSG',
  'Delinquent',
  'Due and Demandable',
]);

export type FirmTone = 'ok' | 'warn' | 'neutral';

export function firmTone(f: Pick<Firm, 'project_status' | 'status'>): FirmTone {
  if (ATTENTION.has(f.project_status) || ATTENTION.has(f.status)) return 'warn';
  if (f.project_status === 'Fully Paid Projects' || f.status === 'Fully Paid') return 'ok';
  return 'neutral';
}

export function matchesFirm(f: Firm, q: string): boolean {
  if (!q) return true;
  const hay = [f.firm, f.beneficiary, f.project_title, f.spin_no, f.sector, f.equipment]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
}

export type ValueTone = 'good' | 'bad' | 'wait' | 'info';

const VALUE_TONE: Record<string, ValueTone> = {
  'Fully Paid Projects': 'good',
  'Fully Paid': 'good',
  Updated: 'good',
  'Regular Due': 'info',
  Pending: 'wait',
  'Past Due': 'bad',
  'Unpaid Penalties': 'bad',
  'Endorsed to OSG': 'bad',
  Delinquent: 'bad',
  'Due and Demandable': 'bad',
};

/** Colour meaning of a single project/firm status value (green = settled, red = needs action). */
export function valueTone(v: string | null | undefined): ValueTone {
  return VALUE_TONE[v ?? ''] ?? 'info';
}
