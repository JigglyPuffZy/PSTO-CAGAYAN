-- =============================================================================
-- PSTO Cagayan — create the login account (username: admin)
-- Run AFTER setup.sql: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Change the password below before running. Safe to re-run (skips if it exists).
-- =============================================================================

create extension if not exists pgcrypto;

do $$
declare
  v_email    text := 'admin@psto.local';   -- login screen username: admin
  v_password text := 'Admin123!';          -- <-- CHANGE THIS
  v_role     text := 'superadmin';         -- 'admin' or 'superadmin'
  v_id       uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'User % already exists, skipping.', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(v_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', split_part(v_email, '@', 1), 'role', v_role),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- Profile row (the signup trigger normally adds it; this guarantees it)
  insert into public.profiles (id, username, role)
  values (v_id, split_part(v_email, '@', 1), v_role)
  on conflict (id) do update set username = excluded.username, role = excluded.role;
end $$;

-- Check: should return one row with username = admin
select u.email, p.username, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'admin@psto.local';
