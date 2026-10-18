-- Admin and anonymous statistics for «за минуту». Run once in the Supabase SQL editor,
-- after leaderboard.sql, in the same project.
--
-- 1. SET THE ADMIN PASSWORD (run this once, with your own password; run it again to change it):
--
--      insert into public.admin_config (id, secret_hash)
--      values (true, encode(extensions.digest('YOUR PASSWORD HERE', 'sha256'), 'hex'))
--      on conflict (id) do update set secret_hash = excluded.secret_hash;
--
--    Use a long password (a phrase of 4+ words). Only its hash is stored, and the site's files never contain it.
--
-- 2. The admin page is /admin/ (it asks for that password). Everything it does goes through the functions below;
--    the anon key has no direct access to any table. Wrong passwords are counted: after 8 failures within
--    10 minutes every admin call is refused until the window passes.
--
-- Statistics are anonymous counters (no player id, no name, no IP): the day, the kind of event, the lesson id,
-- the question number and the result, and how many times it happened.

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------- admin password and lockout
create table if not exists public.admin_config (
  id boolean primary key default true check (id),
  secret_hash text not null
);
alter table public.admin_config enable row level security;

create table if not exists public.admin_attempts (at timestamptz not null default now());
alter table public.admin_attempts enable row level security;

-- true when the password is right; records a failed attempt otherwise (and refuses while locked)
create or replace function public._admin_ok(p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  delete from public.admin_attempts where at < now() - interval '1 day';
  if (select count(*) from public.admin_attempts where at > now() - interval '10 minutes') >= 8 then
    return false;
  end if;
  select secret_hash into v_hash from public.admin_config where id;
  if v_hash is not null and v_hash = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex') then
    return true;
  end if;
  insert into public.admin_attempts default values;
  return false;
end;
$$;
revoke all on function public._admin_ok(text) from public, anon, authenticated;

create or replace function public.admin_login(p_secret text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$ select public._admin_ok(p_secret); $$;

-- ----------------------------------------------------------------- players
create or replace function public.admin_players(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public._admin_ok(p_secret) then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((
    select jsonb_agg(to_jsonb(t))
    from (select id, name, xp, level, updated_at from public.players order by xp desc, updated_at asc limit 2000) t
  ), '[]'::jsonb));
end;
$$;

create or replace function public.admin_player_update(p_secret text, p_id uuid, p_name text, p_xp integer, p_level integer)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if not public._admin_ok(p_secret) then return jsonb_build_object('ok', false); end if;
  if char_length(v_name) not between 2 and 20 or v_name ~ '[<>"''`\\/{}]' then
    return jsonb_build_object('ok', true, 'error', 'bad name');
  end if;
  update public.players set name = v_name, xp = least(greatest(p_xp, 0), 5000), level = least(greatest(p_level, 1), 50), updated_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_player_delete(p_secret text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public._admin_ok(p_secret) then return jsonb_build_object('ok', false); end if;
  delete from public.players where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_players_reset(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public._admin_ok(p_secret) then return jsonb_build_object('ok', false); end if;
  delete from public.players where true;
  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------- anonymous statistics
-- kind: video_start | video_end | quiz_start | answer | quiz_end
--   answer:   q = question number (0–9), val = 1 right at the first try, 2 right at the second, 0 wrong
--   quiz_end: q = the score (0–10), val = 0
create table if not exists public.stats (
  day date not null default current_date,
  kind text not null check (kind in ('video_start', 'video_end', 'quiz_start', 'answer', 'quiz_end')),
  lesson text not null check (lesson ~ '^(math|rus)-[5-9]-[0-9]{1,2}$'),
  q smallint not null default 0 check (q between 0 and 10),
  val smallint not null default 0 check (val between 0 and 2),
  n integer not null default 0,
  primary key (day, kind, lesson, q, val)
);
alter table public.stats enable row level security;

create or replace function public.track_event(p_kind text, p_lesson text, p_q integer default 0, p_val integer default 0)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.stats (day, kind, lesson, q, val, n)
  values (current_date, p_kind, p_lesson, coalesce(p_q, 0), coalesce(p_val, 0), 1)
  on conflict (day, kind, lesson, q, val) do update set n = public.stats.n + 1;
end;
$$;
revoke all on function public.track_event(text, text, integer, integer) from public;
grant execute on function public.track_event(text, text, integer, integer) to anon, authenticated;

-- totals per kind/lesson/question/result over the last p_days days, and totals per day
create or replace function public.admin_stats(p_secret text, p_days integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_from date := current_date - least(greatest(coalesce(p_days, 60), 1), 365);
begin
  if not public._admin_ok(p_secret) then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object(
    'ok', true,
    'total', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select kind, lesson, q, val, sum(n)::int as n from public.stats where day >= v_from group by kind, lesson, q, val
    ) t), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(to_jsonb(d)) from (
      select day, kind, sum(n)::int as n from public.stats where day >= v_from group by day, kind order by day
    ) d), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_login(text), public.admin_players(text),
  public.admin_player_update(text, uuid, text, integer, integer), public.admin_player_delete(text, uuid),
  public.admin_players_reset(text), public.admin_stats(text, integer) from public;
grant execute on function public.admin_login(text), public.admin_players(text),
  public.admin_player_update(text, uuid, text, integer, integer), public.admin_player_delete(text, uuid),
  public.admin_players_reset(text), public.admin_stats(text, integer) to anon, authenticated;
