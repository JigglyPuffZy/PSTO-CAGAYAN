import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

/** One shared client: creating a new one per call re-reads the session and adds listeners. */
export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to client/.env (see supabase/README.md).'
    );
  }
  client ??= createClient(url, anonKey);
  return client;
}

/** Maps portal username to Supabase Auth email. */
export function usernameToAuthEmail(username: string): string {
  const u = username.trim().toLowerCase();
  if (u.includes('@')) return u;
  return `${u.replace(/\s+/g, '')}@psto.local`;
}
