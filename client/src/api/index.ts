import type { AuthUser, Firm, FirmLocation } from '../types';
import { computeDashboardStats } from '../lib/dashboardStats';
import { uploadProposal } from '../lib/storage';
import { getSupabase, usernameToAuthEmail } from '../lib/supabase';
import { demoApi, isDemoMode } from './demo';

function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === 'string') out[k] = v;
  });
  return out;
}

const profileCache = new Map<string, AuthUser>();

/** Pages switch often; reuse the unfiltered lists for a few seconds and share in-flight requests. */
const TTL_MS = 20_000;
type Cached<T> = { at: number; promise: Promise<T> };
let firmsCache: Cached<Firm[]> | null = null;
let locationsCache: Cached<FirmLocation[]> | null = null;

function cached<T>(slot: Cached<T> | null, load: () => Promise<T>, set: (c: Cached<T> | null) => void): Promise<T> {
  if (slot && Date.now() - slot.at < TTL_MS) return slot.promise;
  const promise = load();
  set({ at: Date.now(), promise });
  promise.catch(() => set(null));
  return promise;
}

async function profileToUser(userId: string): Promise<AuthUser> {
  const cached = profileCache.get(userId);
  if (cached) return cached;
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('username, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const username = data?.username ?? 'user';
  const role = data?.role === 'superadmin' ? 'superadmin' : 'admin';
  const user = { user_id: userId, username, role } as AuthUser;
  profileCache.set(userId, user);
  return user;
}

const supabaseApi = {
  async health() {
    const { error } = await getSupabase().from('firm').select('firm_id').limit(1);
    if (error) throw new Error(error.message);
    return { ok: true, service: 'psto' };
  },

  async login(username: string, password: string) {
    const email = usernameToAuthEmail(username);
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error('Login failed');
    const user = await profileToUser(data.user.id);
    return { user };
  },

  async me() {
    // getSession reads the stored session locally; getUser would add a network round trip.
    const { data, error } = await getSupabase().auth.getSession();
    if (error || !data.session) throw new Error('Not authenticated');
    return { user: await profileToUser(data.session.user.id) };
  },

  async logout() {
    profileCache.clear();
    await getSupabase().auth.signOut();
  },

  async dashboardStats() {
    const firms = await supabaseApi.listFirms();
    return computeDashboardStats(firms);
  },

  listFirms(params: Record<string, string> = {}): Promise<Firm[]> {
    if (Object.keys(params).length === 0) {
      return cached(firmsCache, () => supabaseApi.fetchFirms(params), (c) => (firmsCache = c));
    }
    return supabaseApi.fetchFirms(params);
  },

  async fetchFirms(params: Record<string, string> = {}) {
    let q = getSupabase().from('firm').select('*').order('firm_id', { ascending: false });

    const { sector, district, project_status, status } = params;
    if (sector) q = q.eq('sector', sector);
    if (district) q = q.eq('district', district);
    if (project_status) q = q.eq('project_status', project_status);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    let rows = (data ?? []) as (Firm & { created_at?: string })[];

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
    firmsCache = null;
    const body = formToObject(data);
    let proposal: string | null = null;
    const file = data.get('proposal');
    if (file instanceof File && file.size > 0) {
      proposal = await uploadProposal(file);
    }

    const { data: row, error } = await getSupabase()
      .from('firm')
      .insert({
        year: body.year,
        firm: body.firm,
        beneficiary: body.beneficiary,
        project_title: body.project_title,
        amount_assisted: body.amount_assisted,
        spin_no: body.spin_no,
        sector: body.sector,
        district: body.district,
        employee: body.employee,
        proposal,
        equipment: body.equipment,
        trainings: body.trainings ?? body.training,
        project_status: body.project_status,
        status: body.status,
      })
      .select('firm_id')
      .single();

    if (error) throw new Error(error.message);
    return { firm_id: row.firm_id as number };
  },

  async updateFirm(id: number, data: FormData) {
    firmsCache = null;
    const body = formToObject(data);
    const file = data.get('proposal');

    const patch: Record<string, unknown> = {
      year: body.year,
      firm: body.firm,
      beneficiary: body.beneficiary,
      project_title: body.project_title,
      amount_assisted: body.amount_assisted,
      spin_no: body.spin_no,
      sector: body.sector,
      district: body.district,
      employee: body.employee,
      equipment: body.equipment,
      trainings: body.trainings ?? body.training,
      project_status: body.project_status,
      status: body.status,
    };

    if (file instanceof File && file.size > 0) {
      patch.proposal = await uploadProposal(file);
    }

    const { error } = await getSupabase().from('firm').update(patch).eq('firm_id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async deleteFirm(id: number) {
    firmsCache = null;
    const { error } = await getSupabase().from('firm').delete().eq('firm_id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  listLocations(): Promise<FirmLocation[]> {
    return cached(locationsCache, () => supabaseApi.fetchLocations(), (c) => (locationsCache = c));
  },

  async fetchLocations() {
    const { data, error } = await getSupabase()
      .from('firm_locations')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as FirmLocation[];
  },

  async createLocation(body: Partial<FirmLocation>) {
    locationsCache = null;
    const { data, error } = await getSupabase()
      .from('firm_locations')
      .insert({
        firm: body.firm,
        beneficiary: body.beneficiary,
        project_title: body.project_title,
        amount: body.amount ?? '',
        spin_no: body.spin_no ?? '',
        employee: body.employee ?? '',
        equipment: body.equipment ?? '',
        trainings: body.trainings ?? '',
        sector: body.sector,
        district: body.district,
        latitude: body.latitude,
        longitude: body.longitude,
        photo: body.photo ?? null,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as number };
  },

  async updateLocation(id: number, body: Partial<FirmLocation>) {
    locationsCache = null;
    const { error } = await getSupabase()
      .from('firm_locations')
      .update({
        firm: body.firm,
        beneficiary: body.beneficiary,
        project_title: body.project_title,
        amount: body.amount,
        spin_no: body.spin_no,
        employee: body.employee,
        equipment: body.equipment,
        trainings: body.trainings,
        sector: body.sector,
        district: body.district,
        latitude: body.latitude,
        longitude: body.longitude,
        photo: body.photo ?? null,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  async deleteLocation(id: number) {
    locationsCache = null;
    const { error } = await getSupabase().from('firm_locations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
};

export const api: typeof supabaseApi = isDemoMode() ? (demoApi as unknown as typeof supabaseApi) : supabaseApi;
