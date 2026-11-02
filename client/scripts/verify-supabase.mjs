import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function fail(msg) {
  console.error('✗', msg);
  process.exit(1);
}

function ok(msg) {
  console.log('✓', msg);
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  fail(`Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in ${envPath}`);
}
ok('Found Supabase env vars');

const supabase = createClient(url, anonKey);

const tables = ['firm', 'firm_locations', 'profiles'];
for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(0);
  if (error?.message?.includes('does not exist')) {
    fail(`Table public.${table} missing — run supabase/setup.sql in SQL Editor`);
  }
  if (error && !error.message.includes('row-level security')) {
    fail(`${table}: ${error.message}`);
  }
  ok(`Table "${table}" reachable`);
}

const testUser = env.PSTO_TEST_USER;
const testPass = env.PSTO_TEST_PASSWORD;

if (testUser && testPass) {
  const email = testUser.includes('@') ? testUser : `${testUser.replace(/\s+/g, '')}@psto.local`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: testPass,
  });
  if (error) fail(`Login as ${email}: ${error.message}`);
  ok(`Signed in as ${email}`);

  const authed = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  const { data: firms, error: firmErr } = await authed.from('firm').select('firm_id').limit(5);
  if (firmErr) fail(`firm select: ${firmErr.message}`);
  ok(`Loaded ${firms?.length ?? 0} firm row(s)`);

  const { data: locs, error: locErr } = await authed.from('firm_locations').select('id').limit(5);
  if (locErr) fail(`firm_locations select: ${locErr.message}`);
  ok(`Loaded ${locs?.length ?? 0} map pin(s)`);

  const { error: storageErr } = await authed.storage.from('proposals').list('', { limit: 1 });
  if (storageErr?.message?.toLowerCase().includes('not found')) {
    fail('Storage bucket "proposals" missing — run supabase/setup.sql');
  }
  ok('Storage bucket "proposals" OK');

  const { data: prof, error: profErr } = await authed
    .from('profiles')
    .select('username, role')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profErr) fail(`profiles: ${profErr.message}`);
  if (!prof) fail('No profiles row — run setup.sql backfill or re-add user');
  ok(`Profile: ${prof.username} (${prof.role})`);

  await supabase.auth.signOut();
} else {
  console.log('→ Skipping login test (set PSTO_TEST_USER and PSTO_TEST_PASSWORD in .env)');
}

console.log('\nSupabase looks good. Run npm run dev and sign in.');
