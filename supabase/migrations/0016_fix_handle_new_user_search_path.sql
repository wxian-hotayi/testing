-- =============================================================================
-- 0016_fix_handle_new_user_search_path.sql — BUGFIX (MT-12 runtime finding)
--
-- handle_new_user() pinned `search_path = public`, but on Supabase pgcrypto is
-- installed in the `extensions` schema. So `gen_random_bytes()` (used for the
-- referral code) was unresolvable inside the trigger → it raised, and EVERY
-- signup failed with GoTrue "Database error creating new user".
--
-- Root-cause fix only: add `extensions` to the function's search_path. Body is
-- byte-for-byte identical to 0001 otherwise (no logic change).
-- =============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, referral_code)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
  );
  return new;
end;
$$;
