import type { AuthUser, Firm, FirmLocation } from '../types';
import { computeDashboardStats } from '../lib/dashboardStats';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Demo mode: a front-end-only sample account and in-memory data so the portal can be
 * explored without Supabase. It exists only in `vite dev` and only while the Supabase
 * env vars are missing, so it can never ship in a production build.
 */
export const DEMO_USERNAME = 'demo';
export const DEMO_PASSWORD = 'demo1234';

const SESSION_KEY = 'psto-demo-session';

export function isDemoMode(): boolean {
  return import.meta.env.DEV && !isSupabaseConfigured();
}

const demoUser: AuthUser = { user_id: 'demo-user', username: DEMO_USERNAME, role: 'superadmin' };

function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setSession(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

const year = new Date().getFullYear();
const at = (month: number, day = 10) => new Date(year, month, day).toISOString();

type FirmRow = Firm & { created_at: string };

const mkFirm = (
  id: number,
  month: number,
  firm: string,
  beneficiary: string,
  project_title: string,
  amount: string,
  sector: string,
  district: string,
  project_status: string,
  status: string,
  employee: string
): FirmRow => ({
  firm_id: id,
  year: String(year),
  firm,
  beneficiary,
  project_title,
  amount_assisted: amount,
  spin_no: `SPIN-${year}-${String(id).padStart(3, '0')}`,
  sector,
  district,
  employee,
  proposal: null,
  equipment: 'Processing equipment set',
  trainings: 'GMP, Basic Bookkeeping',
  project_status,
  status,
  created_at: at(month, 5 + id),
});

let firms: FirmRow[] = [
  mkFirm(1, 0, 'Cagayan Cassava Foods', 'Maria Santos', 'Cassava chips upgrade', '850000', 'Food Processing', '1', 'Regular Due', 'Updated', '12'),
  mkFirm(2, 1, 'Aparri Fishers Cooperative', 'Jose Ramirez', 'Fish drying and packaging', '1200000', 'Aquaculture', '3', 'Fully Paid Projects', 'Fully Paid', '28'),
  mkFirm(3, 1, 'Solana Rice Mill', 'Ana Dela Cruz', 'Rice milling line', '2400000', 'Agriculture', '2', 'Past Due', 'Due and Demandable', '19'),
  mkFirm(4, 2, 'Tuguegarao Furniture Works', 'Ramon Bautista', 'CNC furniture cutting', '1750000', 'Furniture', '1', 'Regular Due', 'Updated', '24'),
  mkFirm(5, 3, 'Buguey Bamboo Crafts', 'Liza Mendoza', 'Bamboo gift and decor line', '640000', 'Gift, Houseware & Decor', '3', 'Unpaid Penalties', 'Delinquent', '9'),
  mkFirm(6, 3, 'Iguig Metal Fabrication', 'Carlos Pascual', 'Metal roofing fabrication', '1980000', 'Metals & Engineering', '2', 'Regular Due', 'Pending', '15'),
  mkFirm(7, 4, 'Gattaran Banana Chips', 'Rosario Agbayani', 'Banana chips and packaging', '520000', 'Food Processing', '3', 'Fully Paid Projects', 'Fully Paid', '11'),
  mkFirm(8, 5, 'Enrile Tilapia Growers', 'Eduardo Tumaneng', 'Tilapia hatchery upgrade', '1320000', 'Aquaculture', '1', 'Regular Due', 'Updated', '17'),
  mkFirm(9, 6, 'Amulung Coffee Roasters', 'Grace Villanueva', 'Coffee roasting equipment', '760000', 'Food Processing', '2', 'Endorsed to OSG', 'Delinquent', '8'),
  mkFirm(10, 7, 'Alcala Abaca Weavers', 'Teresita Guzman', 'Abaca fiber processing', '430000', 'Gift, Houseware & Decor', '1', 'Regular Due', 'Pending', '21'),
  mkFirm(11, 8, 'Lal-lo Corn Dryers', 'Fernando Rivera', 'Corn drying and storage', '2100000', 'Agriculture', '3', 'Past Due', 'Due and Demandable', '14'),
  mkFirm(12, 9, 'Piat Pottery Collective', 'Nenita Cabanilla', 'Kiln and glazing upgrade', '390000', 'Gift, Houseware & Decor', '2', 'Fully Paid Projects', 'Fully Paid', '7'),
];

const mkLoc = (
  id: number,
  f: FirmRow,
  latitude: string,
  longitude: string
): FirmLocation => ({
  id,
  firm: f.firm,
  beneficiary: f.beneficiary,
  project_title: f.project_title,
  amount: f.amount_assisted,
  spin_no: f.spin_no,
  employee: f.employee,
  equipment: f.equipment,
  trainings: f.trainings,
  sector: f.sector,
  district: f.district,
  latitude,
  longitude,
  photo: null,
  proposal: null,
});

let locations: FirmLocation[] = [
  mkLoc(1, firms[0], '17.6131', '121.7270'),
  mkLoc(2, firms[1], '18.3553', '121.6417'),
  mkLoc(3, firms[2], '17.6828', '121.7429'),
  mkLoc(4, firms[3], '17.6205', '121.7340'),
  mkLoc(5, firms[4], '18.2714', '121.8300'),
  mkLoc(6, firms[5], '17.7400', '121.7050'),
  mkLoc(7, firms[6], '18.2150', '121.6580'),
  mkLoc(8, firms[7], '17.5800', '121.6900'),
];

let nextFirmId = 13;
let nextLocId = 9;

function body(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === 'string') out[k] = v;
  });
  return out;
}

function fromForm(fd: FormData): Omit<Firm, 'firm_id' | 'proposal'> {
  const b = body(fd);
  return {
    year: b.year ?? String(year),
    firm: b.firm ?? '',
    beneficiary: b.beneficiary ?? '',
    project_title: b.project_title ?? '',
    amount_assisted: b.amount_assisted ?? '',
    spin_no: b.spin_no ?? '',
    sector: b.sector ?? '',
    district: b.district ?? '1',
    employee: b.employee ?? '',
    equipment: b.equipment ?? '',
    trainings: b.trainings ?? b.training ?? '',
    project_status: b.project_status ?? '',
    status: b.status ?? '',
  };
}

function proposalUrl(fd: FormData): string | null | undefined {
  const file = fd.get('proposal');
  return file instanceof File && file.size > 0 ? URL.createObjectURL(file) : undefined;
}

export const demoApi = {
  async health() {
    return { ok: true, service: 'psto-demo' };
  },

  async login(username: string, password: string) {
    if (username.trim().toLowerCase() !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      throw new Error(
        `Demo mode: sign in with username "${DEMO_USERNAME}" and password "${DEMO_PASSWORD}".`
      );
    }
    setSession(true);
    return { user: demoUser };
  },

  async me() {
    if (!hasSession()) throw new Error('Not authenticated');
    return { user: demoUser };
  },

  async logout() {
    setSession(false);
  },

  async dashboardStats() {
    return computeDashboardStats(firms);
  },

  async listFirms(params: Record<string, string> = {}) {
    const { sector, district, project_status, status } = params;
    let rows = [...firms].sort((a, b) => b.firm_id - a.firm_id);
    if (sector) rows = rows.filter((f) => f.sector === sector);
    if (district) rows = rows.filter((f) => f.district === district);
    if (project_status) rows = rows.filter((f) => f.project_status === project_status);
    if (status) rows = rows.filter((f) => f.status === status);
    const search = params.search?.toLowerCase();
    if (search) {
      rows = rows.filter(
        (f) =>
          f.firm.toLowerCase().includes(search) ||
          f.beneficiary.toLowerCase().includes(search) ||
          f.project_title.toLowerCase().includes(search) ||
          f.spin_no.toLowerCase().includes(search)
      );
    }
    return rows;
  },

  async createFirm(data: FormData) {
    const firm_id = nextFirmId++;
    firms.push({
      ...fromForm(data),
      firm_id,
      proposal: proposalUrl(data) ?? null,
      created_at: new Date().toISOString(),
    });
    return { firm_id };
  },

  async updateFirm(id: number, data: FormData) {
    const url = proposalUrl(data);
    firms = firms.map((f) =>
      f.firm_id === id
        ? { ...f, ...fromForm(data), proposal: url === undefined ? f.proposal : url }
        : f
    );
    return { ok: true };
  },

  async deleteFirm(id: number) {
    firms = firms.filter((f) => f.firm_id !== id);
    return { ok: true };
  },

  async listLocations() {
    return [...locations];
  },

  async createLocation(b: Partial<FirmLocation>) {
    const id = nextLocId++;
    locations.push({
      id,
      firm: b.firm ?? '',
      beneficiary: b.beneficiary ?? '',
      project_title: b.project_title ?? '',
      amount: b.amount ?? '',
      spin_no: b.spin_no ?? '',
      employee: b.employee ?? '',
      equipment: b.equipment ?? '',
      trainings: b.trainings ?? '',
      sector: b.sector ?? '',
      district: b.district ?? '1',
      latitude: b.latitude ?? '0',
      longitude: b.longitude ?? '0',
      photo: b.photo ?? null,
      proposal: null,
    });
    return { id };
  },

  async updateLocation(id: number, b: Partial<FirmLocation>) {
    locations = locations.map((l) => (l.id === id ? { ...l, ...b, id } : l));
    return { ok: true };
  },

  async deleteLocation(id: number) {
    locations = locations.filter((l) => l.id !== id);
    return { ok: true };
  },
};
