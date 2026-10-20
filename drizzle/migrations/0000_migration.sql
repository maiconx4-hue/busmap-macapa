
create extension if not exists pgcrypto with schema extensions;

-- ========== SETTINGS ==========
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);
grant select on public.app_settings to anon, authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;

insert into public.app_settings(key,value,description) values
 ('session_timeout_seconds','60','Sessão inativa após N segundos sem atualização'),
 ('min_update_interval_seconds','4','Intervalo mínimo entre envios de posição'),
 ('max_speed_kmh','110','Velocidade máxima plausível entre dois pontos'),
 ('bounds','{"min_lat":-1.6,"max_lat":4.6,"min_lng":-55.2,"max_lng":-49.5}','Área geográfica aceita (Amapá)'),
 ('max_accuracy_m','2000','Precisão acima disso é descartada'),
 ('good_accuracy_m','80','Precisão média máxima para pontuar uma sessão'),
 ('min_session_seconds','120','Duração mínima para uma sessão ser avaliada'),
 ('min_session_points','6','Mínimo de posições aceitas por sessão'),
 ('max_rejected_ratio','0.3','Proporção máxima de pontos rejeitados'),
 ('xp_base','10','XP base por sessão válida'),
 ('xp_per_minute','2','XP por minuto efetivo'),
 ('xp_session_cap','90','XP máximo por sessão'),
 ('xp_daily_cap','240','XP máximo por dia (por conta e por dispositivo)'),
 ('max_sessions_per_hour','12','Sessões iniciadas por dispositivo por hora'),
 ('location_retention_hours','24','Retenção de posições brutas'),
 ('levels','[{"tier":"bronze","name":"Iniciante","min_xp":0,"min_sessions":1,"min_days":1},{"tier":"silver","name":"Colaborador","min_xp":300,"min_sessions":10,"min_days":4},{"tier":"gold","name":"Explorador","min_xp":1200,"min_sessions":40,"min_days":12},{"tier":"platinum","name":"Embaixador","min_xp":4000,"min_sessions":120,"min_days":30}]','Critérios dos níveis');

create or replace function public.setting_num(_key text) returns numeric
language sql stable security definer set search_path=public as
$$ select (value #>> '{}')::numeric from public.app_settings where key=_key $$;

-- ========== ADMIN ==========
create table public.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;
alter table public.admin_users enable row level security;
create policy "own admin row" on public.admin_users for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as
$$ select exists(select 1 from public.admin_users where user_id = auth.uid()) $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admin update settings" on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read settings" on public.app_settings for select to anon, authenticated using (true);
grant update on public.app_settings to authenticated;

-- ========== ROUTES ==========
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  code text not null check (char_length(code) between 1 and 20),
  description text,
  color text not null default '#e4572e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  direction text not null default 'ida',
  origin_name text, destination_name text,
  origin_lat double precision, origin_lng double precision,
  destination_lat double precision, destination_lng double precision,
  waypoints jsonb not null default '[]',
  geometry jsonb not null default '[]',
  distance_m double precision,
  creation_method text not null check (creation_method in ('routed','manual')),
  published boolean not null default false,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code, direction)
);
create index routes_pub_idx on public.routes(published, active);
grant select on public.routes to anon;
grant select, insert, update, delete on public.routes to authenticated;
grant all on public.routes to service_role;
alter table public.routes enable row level security;
create policy "public read published routes" on public.routes for select to anon, authenticated using (published and active);
create policy "admin read all routes" on public.routes for select to authenticated using (public.is_admin());
create policy "admin insert routes" on public.routes for insert to authenticated with check (public.is_admin());
create policy "admin update routes" on public.routes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete routes" on public.routes for delete to authenticated using (public.is_admin());

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as
$$ begin new.updated_at = now(); return new; end $$;
create trigger routes_touch before update on public.routes for each row execute function public.touch_updated_at();

-- ========== PROFILES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname is null or char_length(nickname) between 2 and 30),
  show_on_map boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as
$$ begin insert into public.profiles(id) values (new.id) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ========== PROGRESS / ACHIEVEMENTS ==========
create table public.user_progress (
  user_id uuid primary key,
  xp integer not null default 0,
  tier text not null default 'none',
  valid_sessions integer not null default 0,
  total_seconds integer not null default 0,
  active_days integer not null default 0,
  first_contribution_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.user_progress to authenticated;
grant all on public.user_progress to service_role;
alter table public.user_progress enable row level security;
create policy "own progress" on public.user_progress for select to authenticated using (user_id = auth.uid());

create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null default 'award',
  metric text not null check (metric in ('valid_sessions','xp','active_days','total_minutes','distinct_routes','claimed')),
  threshold integer not null,
  sort integer not null default 0
);
grant select on public.achievements to anon, authenticated;
grant all on public.achievements to service_role;
alter table public.achievements enable row level security;
create policy "public achievements" on public.achievements for select to anon, authenticated using (true);
insert into public.achievements(code,name,description,icon,metric,threshold,sort) values
 ('first_ride','Primeira viagem','Concluiu a primeira sessão válida','bus','valid_sessions',1,1),
 ('ten_rides','Passageiro frequente','10 sessões válidas','repeat','valid_sessions',10,2),
 ('fifty_rides','Veterano do busão','50 sessões válidas','medal','valid_sessions',50,3),
 ('hour_shared','Uma hora no mapa','60 minutos de contribuição efetiva','clock','total_minutes',60,4),
 ('week_streak','Presença constante','Contribuiu em 7 dias diferentes','calendar','active_days',7,5),
 ('explorer','Explorador de linhas','Contribuiu em 5 linhas diferentes','map','distinct_routes',5,6),
 ('xp_1000','Mil pontos','Acumulou 1000 XP','star','xp',1000,7);

create table public.user_achievements (
  user_id uuid not null,
  achievement_code text not null references public.achievements(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(user_id, achievement_code)
);
grant select on public.user_achievements to authenticated;
grant all on public.user_achievements to service_role;
alter table public.user_achievements enable row level security;
create policy "own achievements" on public.user_achievements for select to authenticated using (user_id = auth.uid());

-- ========== DEVICES / SESSIONS ==========
create table public.anon_devices (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
grant all on public.anon_devices to service_role;
alter table public.anon_devices enable row level security;

create table public.location_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  device_id uuid not null references public.anon_devices(id) on delete cascade,
  route_id uuid references public.routes(id) on delete set null,
  token_hash text not null,
  live_public_id uuid not null default gen_random_uuid() unique,
  status text not null default 'active' check (status in ('active','ended','expired')),
  started_at timestamptz not null default now(),
  last_update_at timestamptz,
  last_lat double precision, last_lng double precision,
  n_points integer not null default 0,
  n_rejected integer not null default 0,
  sum_accuracy double precision not null default 0,
  ended_at timestamptz
);
create index ls_active_idx on public.location_sessions(status, last_update_at);
create index ls_device_idx on public.location_sessions(device_id, started_at);
grant select on public.location_sessions to authenticated;
grant all on public.location_sessions to service_role;
alter table public.location_sessions enable row level security;
create policy "admin read sessions" on public.location_sessions for select to authenticated using (public.is_admin());

create table public.location_updates (
  id bigserial primary key,
  session_id uuid not null references public.location_sessions(id) on delete cascade,
  lat double precision not null, lng double precision not null,
  accuracy double precision, speed double precision,
  accepted boolean not null,
  reason text,
  recorded_at timestamptz not null default now()
);
create index lu_session_idx on public.location_updates(session_id, recorded_at);
create index lu_time_idx on public.location_updates(recorded_at);
grant select on public.location_updates to authenticated;
grant all on public.location_updates to service_role;
alter table public.location_updates enable row level security;
create policy "admin read updates" on public.location_updates for select to authenticated using (public.is_admin());

-- public, minimal, realtime-friendly view of active positions
create table public.live_positions (
  public_id uuid primary key,
  route_id uuid references public.routes(id) on delete cascade,
  lat double precision not null, lng double precision not null,
  accuracy double precision,
  heading double precision,
  updated_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  validation text not null default 'pending' check (validation in ('pending','ok','suspect')),
  contributor_kind text not null check (contributor_kind in ('member','visitor')),
  tier text not null default 'none',
  xp integer,
  valid_sessions integer,
  nickname text
);
create index lp_updated_idx on public.live_positions(updated_at);
grant select on public.live_positions to anon, authenticated;
grant all on public.live_positions to service_role;
alter table public.live_positions enable row level security;
create policy "public read recent positions" on public.live_positions for select to anon, authenticated
  using (updated_at > now() - interval '10 minutes');
alter table public.live_positions replica identity full;

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid,
  device_id uuid,
  route_id uuid references public.routes(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null,
  n_points integer not null,
  avg_accuracy double precision,
  status text not null check (status in ('valid','invalid','unverified')),
  reason text,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now()
);
create index contrib_user_idx on public.contributions(user_id, created_at desc);
create index contrib_device_idx on public.contributions(device_id, created_at desc);
grant select on public.contributions to authenticated;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;
create policy "own contributions" on public.contributions for select to authenticated using (user_id = auth.uid());
create policy "admin contributions" on public.contributions for select to authenticated using (public.is_admin());

-- ========== HELPERS ==========
create or replace function public.haversine_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2-lat1)/2),2) + cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)))
$$;

create or replace function public.hash_secret(_s text) returns text
language sql immutable set search_path=public, extensions as
$$ select encode(extensions.digest(_s, 'sha256'),'hex') $$;

create or replace function public.compute_tier(_xp int, _sessions int, _days int) returns text
language plpgsql stable security definer set search_path=public as $$
declare lv jsonb; t text := 'none';
begin
  for lv in select * from jsonb_array_elements((select value from app_settings where key='levels')) loop
    if _xp >= (lv->>'min_xp')::int and _sessions >= (lv->>'min_sessions')::int and _days >= (lv->>'min_days')::int then
      t := lv->>'tier';
    end if;
  end loop;
  return t;
end $$;

create or replace function public.recompute_progress(_user uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_xp int; v_s int; v_sec int; v_days int; v_first timestamptz; v_routes int; v_claimed int;
begin
  select coalesce(sum(xp_awarded),0), count(*) filter (where status='valid'),
         coalesce(sum(duration_seconds) filter (where status='valid'),0),
         count(distinct (started_at at time zone 'America/Belem')::date) filter (where status='valid'),
         min(started_at) filter (where status='valid'),
         count(distinct route_id) filter (where status='valid')
    into v_xp, v_s, v_sec, v_days, v_first, v_routes
  from contributions where user_id=_user;
  insert into user_progress(user_id,xp,tier,valid_sessions,total_seconds,active_days,first_contribution_at,updated_at)
  values (_user,v_xp,compute_tier(v_xp,v_s,v_days),v_s,v_sec,v_days,v_first,now())
  on conflict (user_id) do update set xp=excluded.xp, tier=excluded.tier, valid_sessions=excluded.valid_sessions,
    total_seconds=excluded.total_seconds, active_days=excluded.active_days, first_contribution_at=excluded.first_contribution_at, updated_at=now();
  insert into user_achievements(user_id, achievement_code)
  select _user, a.code from achievements a
  where (a.metric='valid_sessions' and v_s>=a.threshold) or (a.metric='xp' and v_xp>=a.threshold)
     or (a.metric='active_days' and v_days>=a.threshold) or (a.metric='total_minutes' and v_sec/60>=a.threshold)
     or (a.metric='distinct_routes' and v_routes>=a.threshold)
  on conflict do nothing;
end $$;

create or replace function public.finalize_session(_sid uuid, _final_status text) returns void
language plpgsql security definer set search_path=public as $$
declare s location_sessions; dur int; avg_acc double precision; st text := 'valid'; why text := null;
  xp int := 0; today_user int; today_dev int; cap int; accepted int;
begin
  select * into s from location_sessions where id=_sid for update;
  if not found or s.status <> 'active' then return; end if;
  update location_sessions set status=_final_status, ended_at=coalesce(s.last_update_at, now()) where id=_sid;
  delete from live_positions where public_id = s.live_public_id;
  accepted := s.n_points;
  dur := greatest(0, extract(epoch from (coalesce(s.last_update_at, s.started_at) - s.started_at))::int);
  avg_acc := case when accepted>0 then s.sum_accuracy/accepted else null end;
  if accepted = 0 then return; end if; -- nothing to record
  if dur < setting_num('min_session_seconds') or accepted < setting_num('min_session_points') then
    st := 'invalid'; why := 'Sessão curta demais para avaliação';
  elsif s.n_rejected::numeric / greatest(1, accepted + s.n_rejected) > setting_num('max_rejected_ratio') then
    st := 'invalid'; why := 'Muitas posições inconsistentes (saltos ou velocidade impossível)';
  elsif avg_acc > setting_num('good_accuracy_m') then
    st := 'unverified'; why := 'Precisão do GPS insuficiente para avaliar com segurança';
  elsif s.route_id is null then
    st := 'unverified'; why := 'Linha removida';
  end if;
  if st = 'valid' then
    xp := least(setting_num('xp_session_cap')::int, setting_num('xp_base')::int + (dur/60) * setting_num('xp_per_minute')::int);
    cap := setting_num('xp_daily_cap')::int;
    select coalesce(sum(xp_awarded),0) into today_dev from contributions
      where device_id=s.device_id and created_at > now() - interval '24 hours';
    xp := least(xp, greatest(0, cap - today_dev));
    if s.user_id is not null then
      select coalesce(sum(xp_awarded),0) into today_user from contributions
        where user_id=s.user_id and created_at > now() - interval '24 hours';
      xp := least(xp, greatest(0, cap - today_user));
    end if;
    if xp = 0 then why := 'Limite diário de experiência atingido'; end if;
  end if;
  insert into contributions(session_id,user_id,device_id,route_id,started_at,ended_at,duration_seconds,n_points,avg_accuracy,status,reason,xp_awarded)
  values (s.id,s.user_id,s.device_id,s.route_id,s.started_at,coalesce(s.last_update_at,now()),dur,accepted,avg_acc,st,why,xp)
  on conflict (session_id) do nothing;
  if s.user_id is not null then perform recompute_progress(s.user_id); end if;
end $$;

create or replace function public.cleanup_stale() returns void
language plpgsql security definer set search_path=public as $$
declare r record; tmo int := setting_num('session_timeout_seconds')::int;
begin
  for r in select id from location_sessions where status='active'
     and coalesce(last_update_at, started_at) < now() - make_interval(secs => tmo) limit 50 loop
    perform finalize_session(r.id, 'expired');
  end loop;
  delete from location_updates where recorded_at < now() - make_interval(hours => setting_num('location_retention_hours')::int);
  delete from live_positions where updated_at < now() - interval '15 minutes';
end $$;

-- ========== PUBLIC RPCs ==========
create or replace function public.ensure_device(_secret text) returns uuid
language plpgsql security definer set search_path=public as $$
declare d uuid; h text;
begin
  if _secret is null or length(_secret) < 32 or length(_secret) > 128 then raise exception 'invalid_device'; end if;
  h := hash_secret(_secret);
  select id into d from anon_devices where secret_hash=h;
  if d is null then insert into anon_devices(secret_hash) values (h) returning id into d; end if;
  return d;
end $$;

create or replace function public.start_session(_device_secret text, _route_id uuid)
returns jsonb language plpgsql security definer set search_path=public, extensions as $$
declare d uuid; tok text; sid uuid; pub uuid; uid uuid := auth.uid(); prof profiles; prog user_progress; n int;
begin
  perform cleanup_stale();
  d := ensure_device(_device_secret);
  if not exists(select 1 from routes where id=_route_id and published and active) then raise exception 'route_unavailable'; end if;
  select count(*) into n from location_sessions where device_id=d and started_at > now() - interval '1 hour';
  if n >= setting_num('max_sessions_per_hour') then raise exception 'rate_limited'; end if;
  for sid in select id from location_sessions where device_id=d and status='active' loop
    perform finalize_session(sid, 'ended');
  end loop;
  tok := encode(extensions.gen_random_bytes(24),'hex');
  insert into location_sessions(user_id,device_id,route_id,token_hash) values (uid,d,_route_id,hash_secret(tok))
  returning id, live_public_id into sid, pub;
  return jsonb_build_object('session_id', sid, 'token', tok);
end $$;

create or replace function public.push_location(_session_id uuid, _token text, _lat double precision, _lng double precision, _accuracy double precision, _heading double precision)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s location_sessions; b jsonb; dt double precision; dist double precision; spd double precision;
  ok boolean := true; why text; prof profiles; prog user_progress; tmo int; acc double precision;
begin
  select * into s from location_sessions where id=_session_id for update;
  if not found or s.token_hash <> hash_secret(coalesce(_token,'')) then raise exception 'invalid_session'; end if;
  if s.status <> 'active' then return jsonb_build_object('status','ended'); end if;
  tmo := setting_num('session_timeout_seconds')::int;
  if s.last_update_at is not null and s.last_update_at < now() - make_interval(secs => tmo) then
    perform finalize_session(s.id, 'expired');
    return jsonb_build_object('status','expired');
  end if;
  if s.last_update_at is not null and now() - s.last_update_at < make_interval(secs => setting_num('min_update_interval_seconds')::int) then
    return jsonb_build_object('status','rate_limited');
  end if;
  if _lat is null or _lng is null or _lat not between -90 and 90 or _lng not between -180 and 180 or _lat <> _lat or _lng <> _lng then
    raise exception 'invalid_coordinates';
  end if;
  acc := coalesce(_accuracy, 9999);
  if acc < 0 or acc > setting_num('max_accuracy_m') then ok := false; why := 'precisao';
  else
    select value into b from app_settings where key='bounds';
    if _lat < (b->>'min_lat')::float or _lat > (b->>'max_lat')::float or _lng < (b->>'min_lng')::float or _lng > (b->>'max_lng')::float then
      ok := false; why := 'fora_da_area';
    elsif s.last_lat is not null then
      dt := greatest(1, extract(epoch from now() - s.last_update_at));
      dist := haversine_m(s.last_lat, s.last_lng, _lat, _lng);
      spd := (greatest(0, dist - acc) / dt) * 3.6;
      if spd > setting_num('max_speed_kmh') then ok := false; why := 'velocidade'; end if;
    end if;
  end if;
  insert into location_updates(session_id,lat,lng,accuracy,accepted,reason) values (s.id,_lat,_lng,_accuracy,ok,why);
  if not ok then
    update location_sessions set n_rejected = n_rejected + 1, last_update_at = coalesce(last_update_at, now()) where id=s.id;
    return jsonb_build_object('status','rejected','reason',why);
  end if;
  update location_sessions set last_update_at=now(), last_lat=_lat, last_lng=_lng, n_points=n_points+1, sum_accuracy=sum_accuracy+acc where id=s.id;
  if s.user_id is not null then
    select * into prof from profiles where id=s.user_id;
    select * into prog from user_progress where user_id=s.user_id;
  end if;
  insert into live_positions(public_id,route_id,lat,lng,accuracy,heading,updated_at,started_at,validation,contributor_kind,tier,xp,valid_sessions,nickname)
  values (s.live_public_id, s.route_id, _lat, _lng, _accuracy, _heading, now(), s.started_at,
    case when s.n_points + 1 >= 3 and s.n_rejected <= s.n_points / 3 then 'ok' when s.n_rejected > s.n_points / 3 then 'suspect' else 'pending' end,
    case when s.user_id is null then 'visitor' else 'member' end,
    coalesce(prog.tier,'none'), prog.xp, prog.valid_sessions,
    case when prof.show_on_map then prof.nickname else null end)
  on conflict (public_id) do update set lat=excluded.lat, lng=excluded.lng, accuracy=excluded.accuracy, heading=excluded.heading,
    updated_at=excluded.updated_at, validation=excluded.validation, tier=excluded.tier, xp=excluded.xp,
    valid_sessions=excluded.valid_sessions, nickname=excluded.nickname;
  return jsonb_build_object('status','ok');
end $$;

create or replace function public.end_session(_session_id uuid, _token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s location_sessions; c contributions;
begin
  select * into s from location_sessions where id=_session_id;
  if not found or s.token_hash <> hash_secret(coalesce(_token,'')) then raise exception 'invalid_session'; end if;
  perform finalize_session(s.id, 'ended');
  select * into c from contributions where session_id=s.id;
  if c.id is null then return jsonb_build_object('status','ended','evaluated',false); end if;
  return jsonb_build_object('status','ended','evaluated',true,'result',c.status,'reason',c.reason,'xp',c.xp_awarded,'duration',c.duration_seconds);
end $$;

-- visitor summary by device secret (only holder of secret)
create or replace function public.device_summary(_device_secret text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d anon_devices;
begin
  select * into d from anon_devices where secret_hash = hash_secret(coalesce(_device_secret,''));
  if not found then return jsonb_build_object('sessions',0,'valid',0,'xp',0,'claimed',false); end if;
  return (select jsonb_build_object('sessions',count(*),'valid',count(*) filter (where status='valid'),
     'xp',coalesce(sum(xp_awarded) filter (where user_id is null),0), 'claimed', d.claimed_by is not null,
     'unclaimed', count(*) filter (where user_id is null))
   from contributions where device_id=d.id);
end $$;

create or replace function public.claim_device(_device_secret text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare d anon_devices; uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into d from anon_devices where secret_hash = hash_secret(coalesce(_device_secret,'')) for update;
  if not found then return jsonb_build_object('claimed',0); end if;
  if d.claimed_by is not null and d.claimed_by <> uid then return jsonb_build_object('claimed',0,'reason','already_claimed'); end if;
  update anon_devices set claimed_by=uid, claimed_at=coalesce(claimed_at, now()) where id=d.id;
  update contributions set user_id=uid where device_id=d.id and user_id is null;
  get diagnostics n = row_count;
  update location_sessions set user_id=uid where device_id=d.id and user_id is null;
  perform recompute_progress(uid);
  return jsonb_build_object('claimed', n);
end $$;

create or replace function public.prepare_account_deletion() returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  -- anonymize aggregated contributions (kept without personal link), remove personal data
  update contributions set user_id=null where user_id=uid;
  update location_sessions set user_id=null where user_id=uid;
  update anon_devices set claimed_by=null where claimed_by=uid;
  delete from user_achievements where user_id=uid;
  delete from user_progress where user_id=uid;
  delete from admin_users where user_id=uid;
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'routes_total',(select count(*) from routes),
    'routes_published',(select count(*) from routes where published and active),
    'sessions_active',(select count(*) from location_sessions where status='active' and last_update_at > now() - make_interval(secs => setting_num('session_timeout_seconds')::int)),
    'sessions_24h',(select count(*) from location_sessions where started_at > now() - interval '24 hours'),
    'contributions_total',(select count(*) from contributions),
    'contributions_valid',(select count(*) from contributions where status='valid'),
    'members',(select count(*) from user_progress),
    'updates_24h',(select count(*) from location_updates where recorded_at > now() - interval '24 hours'));
end $$;

-- Function permissions
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.start_session(text, uuid) to anon, authenticated;
grant execute on function public.push_location(uuid, text, double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.end_session(uuid, text) to anon, authenticated;
grant execute on function public.device_summary(text) to anon, authenticated;
grant execute on function public.claim_device(text) to authenticated;
grant execute on function public.prepare_account_deletion() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.haversine_m(double precision,double precision,double precision,double precision) to anon, authenticated;

alter publication supabase_realtime add table public.live_positions;
alter publication supabase_realtime add table public.routes;
