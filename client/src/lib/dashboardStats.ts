import type { DashboardStats, Firm } from '../types';

const STATUS_KEYS = [
  'regular due',
  'unpaid penalties',
  'past due',
  'fully paid projects',
  'endorsed to osg',
] as const;

const STATUS_LABELS = [
  'Regular Due',
  'Unpaid Penalties',
  'Past Due',
  'Fully Paid',
  'Endorsed to OSG',
];

type FirmWithMeta = Firm & { created_at?: string | null };

export function computeDashboardStats(firms: FirmWithMeta[]): DashboardStats {
  const year = new Date().getFullYear();
  const monthlyCounts = Array.from({ length: 12 }, () => 0);

  for (const f of firms) {
    if (f.created_at) {
      const d = new Date(f.created_at);
      if (d.getFullYear() === year) monthlyCounts[d.getMonth()] += 1;
    } else if (Number(f.year) === year) {
      monthlyCounts[0] += 1;
    }
  }

  const districtTotals: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  const districtCounts = [0, 0, 0];

  for (const f of firms) {
    const d = Number(f.district);
    if (d >= 1 && d <= 3) {
      districtTotals[d as 1 | 2 | 3] += 1;
      districtCounts[d - 1] += 1;
    }
  }

  const statusMap: Record<string, number> = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
  for (const f of firms) {
    const key = String(f.project_status ?? '').toLowerCase().trim();
    if (key in statusMap) statusMap[key] += 1;
  }

  return {
    year,
    totalFirms: firms.length,
    districtTotals,
    monthlyCounts,
    districtLabels: ['District 1', 'District 2', 'District 3'],
    districtCounts,
    projectStatus: {
      labels: STATUS_LABELS,
      counts: STATUS_KEYS.map((k) => statusMap[k]),
    },
  };
}
