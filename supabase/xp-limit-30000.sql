-- Raise the XP limit from 10 000 to 30 000 (more lessons → more XP to earn).
-- Run once in the Supabase SQL editor of the live project. Safe to run again.
-- New installs get the same limit from leaderboard.sql and admin.sql.

-- the column check created by leaderboard.sql is named players_xp_check
alter table public.players drop constraint if exists players_xp_check;
alter table public.players add constraint players_xp_check check (xp between 0 and 30000);

-- the admin edit clamps XP to the same limit (same function as in admin.sql)
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
  update public.players set name = v_name, xp = least(greatest(p_xp, 0), 30000), level = least(greatest(p_level, 1), 50), updated_at = now()
   where id = p_id;
  return jsonb_build_object('ok', true);
end;
$$;
