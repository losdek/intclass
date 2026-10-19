-- Google accounts for «за минуту»: progress kept on the server and the leaderboard nickname on every device.
-- Run once in the Supabase SQL editor, after leaderboard.sql, in the same project.
--
-- Turn Google on first (Supabase dashboard):
--   1. Google Cloud console → APIs & Services → Credentials → Create OAuth client ID → «Web application».
--      Authorized redirect URI: https://<your-project-ref>.supabase.co/auth/v1/callback
--   2. Supabase → Authentication → Sign In / Providers → Google: enable, paste the Client ID and Client secret.
--   3. Supabase → Authentication → URL Configuration: Site URL https://losdek.github.io/intclass/
--      and add the redirect URL https://losdek.github.io/intclass/** (plus http://localhost:8765/** for testing).
--
-- Only the signed-in pupil can read or change their own row, through account_sync (auth.uid()).
-- We keep the progress lists and the leaderboard player of the account; the e-mail stays in Supabase Auth.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  player_id uuid,
  player_secret text,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.accounts enable row level security;

-- union of the lists, best score per lesson; drops anything that is not a lesson id
create or replace function public._merge_progress(a jsonb, b jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  with lists as (
    select key, coalesce(jsonb_agg(distinct x order by x) filter (where x is not null), '[]'::jsonb) as v
      from unnest(array['completed', 'watched', 'bookmarks']) key
      left join lateral (
        select jsonb_array_elements_text(case when jsonb_typeof(a -> key) = 'array' then a -> key else '[]'::jsonb end)
        union
        select jsonb_array_elements_text(case when jsonb_typeof(b -> key) = 'array' then b -> key else '[]'::jsonb end)
      ) t(x) on x ~ '^(math|rus)-[5-9]-[0-9]{1,2}$'
     group by key
  ), best as (
    select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) as v from (
      select k, max(n) as n from (
        select k, (v)::int as n from jsonb_each_text(case when jsonb_typeof(a -> 'best') = 'object' then a -> 'best' else '{}'::jsonb end) e(k, v) where v ~ '^[0-9]{1,2}$'
        union all
        select k, (v)::int from jsonb_each_text(case when jsonb_typeof(b -> 'best') = 'object' then b -> 'best' else '{}'::jsonb end) e(k, v) where v ~ '^[0-9]{1,2}$'
      ) s where k ~ '^(math|rus)-[5-9]-[0-9]{1,2}$' group by k
    ) m
  )
  select jsonb_build_object('best', (select v from best)) || coalesce((select jsonb_object_agg(key, v) from lists), '{}'::jsonb);
$$;

-- Called after sign-in and whenever progress changes. Sends this device's progress (and its leaderboard player,
-- if it has one and the account has none yet); returns the merged progress and the account's player.
create or replace function public.account_sync(p_progress jsonb, p_player_id uuid default null, p_player_secret text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_acc public.accounts;
  v_name text;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if pg_column_size(p_progress) > 32000 then raise exception 'too big'; end if;

  insert into public.accounts (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_acc from public.accounts where user_id = v_uid for update;

  -- the device's player joins the account only when the account has none and the secret matches
  if v_acc.player_id is null and p_player_id is not null and char_length(coalesce(p_player_secret, '')) >= 32 then
    if not exists (select 1 from public.players where id = p_player_id)
       or exists (select 1 from public.players where id = p_player_id and secret_hash = encode(digest(p_player_secret, 'sha256'), 'hex')) then
      v_acc.player_id := p_player_id;
      v_acc.player_secret := p_player_secret;
    end if;
  end if;

  v_acc.progress := public._merge_progress(v_acc.progress, coalesce(p_progress, '{}'::jsonb));
  update public.accounts
     set progress = v_acc.progress, player_id = v_acc.player_id, player_secret = v_acc.player_secret, updated_at = now()
   where user_id = v_uid;

  select name into v_name from public.players where id = v_acc.player_id;
  return jsonb_build_object(
    'progress', v_acc.progress,
    'player', case when v_acc.player_id is null then null
                   else jsonb_build_object('id', v_acc.player_id, 'secret', v_acc.player_secret, 'name', v_name) end
  );
end;
$$;

revoke all on function public._merge_progress(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.account_sync(jsonb, uuid, text) from public, anon;
grant execute on function public.account_sync(jsonb, uuid, text) to authenticated;
