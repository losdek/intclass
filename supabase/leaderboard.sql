-- Leaderboard for «за минуту». Run once in the Supabase SQL editor of the project
-- whose URL and anon key are set in js/store.js (LEADERBOARD).
--
-- The browser only gets the public anon key. It can read the leaderboard view and call
-- submit_score; it cannot touch the players table directly. A player row can only be
-- changed with the secret that was created on the pupil's device at registration.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id uuid primary key,
  secret_hash text not null,
  name text not null check (char_length(name) between 2 and 20),
  xp integer not null default 0 check (xp between 0 and 5000),
  level integer not null default 1 check (level between 1 and 50),
  updated_at timestamptz not null default now()
);

-- no policies: with row level security on, the anon key has no direct access to the table
alter table public.players enable row level security;

-- what everyone may see: never the secret
create or replace view public.leaderboard as
  select id as player, name, xp, level, updated_at from public.players;

grant select on public.leaderboard to anon, authenticated;

create or replace function public.submit_score(p_id uuid, p_secret text, p_name text, p_xp integer, p_level integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(extensions.digest(p_secret, 'sha256'), 'hex');
  v_name text := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));
  v_old public.players;
begin
  if char_length(coalesce(p_secret, '')) < 32 then
    raise exception 'bad secret';
  end if;
  if char_length(v_name) not between 2 and 20 or v_name ~ '[<>"''`\\/{}]' then
    raise exception 'bad name';
  end if;

  select * into v_old from public.players where id = p_id;
  if found then
    if v_old.secret_hash <> v_hash then
      raise exception 'not your player';
    end if;
    update public.players
       set name = v_name, xp = p_xp, level = p_level, updated_at = now()
     where id = p_id;
  else
    insert into public.players (id, secret_hash, name, xp, level)
    values (p_id, v_hash, v_name, p_xp, p_level);
  end if;
end;
$$;

revoke all on function public.submit_score(uuid, text, text, integer, integer) from public;
grant execute on function public.submit_score(uuid, text, text, integer, integer) to anon, authenticated;
