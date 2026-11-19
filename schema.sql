-- Nammooru Bus: Supabase schema, functions, realtime and RLS (run once in the SQL editor)
-- Not yet run against a live project: test on a fresh Supabase project first.

-- A.1 TABLES -------------------------------------------------------
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'passenger' check (role in ('passenger','driver','admin')),
  full_name text,
  lang text not null default 'en' check (lang in ('en','kn')),
  created_at timestamptz not null default now()
);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_kn text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_en text not null,
  name_kn text,
  color text not null default '#3451F2',
  two_way boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  stop_id uuid not null references public.stops(id) on delete restrict,
  seq int not null check (seq >= 0),
  dist_km numeric(6,2) not null default 0 check (dist_km >= 0),
  min_from_prev int not null default 0 check (min_from_prev >= 0),
  unique (route_id, seq) deferrable initially deferred,
  unique (route_id, stop_id)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  day_type text not null check (day_type in ('weekday','weekend')),
  first_bus time not null,
  last_bus time not null,
  headway_min int not null check (headway_min > 0),
  unique (route_id, day_type)
);

create table public.fare_config (
  id int primary key default 1 check (id = 1),
  min_fare int not null default 5,
  per_stage int not null default 5,
  stage_km numeric(4,1) not null default 2.0
);
insert into public.fare_config default values on conflict do nothing;

create table public.buses (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null unique,
  route_id uuid references public.routes(id) on delete set null,
  active boolean not null default true
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  bus_id uuid references public.buses(id) on delete set null,
  phone text
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid references public.buses(id) on delete set null,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  direction smallint not null default 0 check (direction in (0,1)),
  status text not null default 'active' check (status in ('active','delayed','breakdown','ended')),
  crowd_level text check (crowd_level in ('empty','moderate','full')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index trips_status_idx on public.trips(status);

create table public.bus_positions (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  speed_kmh real,
  heading real,
  updated_at timestamptz not null default now()
);

create table public.crowd_reports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level text not null check (level in ('empty','moderate','full')),
  created_at timestamptz not null default now()
);
create index crowd_recent_idx on public.crowd_reports(trip_id, user_id, created_at desc);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid references public.routes(id) on delete set null,
  category text not null check (category in ('delay','behaviour','cleanliness','safety','other')),
  rating smallint check (rating between 1 and 5),
  message text not null check (char_length(message) between 5 and 1000),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  type text not null default 'info' check (type in ('diversion','delay','cancel','info')),
  route_ids uuid[] not null default '{}',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null
);

create table public.saved_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_stop uuid not null references public.stops(id) on delete cascade,
  to_stop uuid not null references public.stops(id) on delete cascade,
  route_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, from_stop, to_stop, route_key)
);

create table public.search_log (
  id bigint generated always as identity primary key,
  from_stop uuid,
  to_stop uuid,
  created_at timestamptz not null default now()
);

create table public.meta (
  key text primary key,
  value bigint not null default 1
);
insert into public.meta(key, value) values ('data_version', 1) on conflict do nothing;

-- A.2 FUNCTIONS AND TRIGGERS --------------------------------------
create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.bump_data_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.meta set value = value + 1 where key = 'data_version';
  return null;
end $$;
create trigger bump_stops after insert or update or delete on public.stops for each statement execute function public.bump_data_version();
create trigger bump_routes after insert or update or delete on public.routes for each statement execute function public.bump_data_version();
create trigger bump_route_stops after insert or update or delete on public.route_stops for each statement execute function public.bump_data_version();
create trigger bump_schedules after insert or update or delete on public.schedules for each statement execute function public.bump_data_version();
create trigger bump_fare after update on public.fare_config for each statement execute function public.bump_data_version();

create or replace function public.cleanup_on_trip_end() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'ended' then
    delete from public.bus_positions where trip_id = new.id;
    new.ended_at := coalesce(new.ended_at, now());
    new.crowd_level := null;
  end if;
  return new;
end $$;
create trigger trip_end_cleanup before update on public.trips
  for each row execute function public.cleanup_on_trip_end();

create or replace function public.report_crowd(p_trip uuid, p_level text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if p_level not in ('empty','moderate','full') then raise exception 'bad_level'; end if;
  if not exists (select 1 from public.trips where id = p_trip and status <> 'ended') then raise exception 'trip_not_active'; end if;
  if exists (select 1 from public.crowd_reports where trip_id = p_trip and user_id = auth.uid() and created_at > now() - interval '5 minutes') then
    raise exception 'rate_limited';
  end if;
  insert into public.crowd_reports(trip_id, user_id, level) values (p_trip, auth.uid(), p_level);
  update public.trips set crowd_level = p_level where id = p_trip;
end $$;

create or replace function public.nearby_stops(p_lat double precision, p_lng double precision, p_radius_m int default 1000)
returns table(stop_id uuid, dist_m double precision)
language sql stable as $$
  select * from (
    select s.id as stop_id,
      6371000 * 2 * asin(sqrt(
        power(sin(radians(s.lat - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(s.lat)) * power(sin(radians(s.lng - p_lng) / 2), 2)
      )) as dist_m
    from public.stops s where s.active
  ) t where t.dist_m <= p_radius_m order by t.dist_m
$$;
-- (Client also computes nearby stops locally from cached data; this RPC is optional.)

-- A.3 REALTIME ------------------------------------------------------
alter publication supabase_realtime add table public.bus_positions, public.trips, public.alerts;

-- A.4 ROW LEVEL SECURITY -------------------------------------------
alter table public.profiles      enable row level security;
alter table public.stops         enable row level security;
alter table public.routes        enable row level security;
alter table public.route_stops   enable row level security;
alter table public.schedules     enable row level security;
alter table public.fare_config   enable row level security;
alter table public.buses         enable row level security;
alter table public.drivers       enable row level security;
alter table public.trips         enable row level security;
alter table public.bus_positions enable row level security;
alter table public.crowd_reports enable row level security;
alter table public.complaints    enable row level security;
alter table public.alerts        enable row level security;
alter table public.saved_trips   enable row level security;
alter table public.search_log    enable row level security;
alter table public.meta          enable row level security;

-- Master data: public read, admin write
do $$
declare t text;
begin
  foreach t in array array['stops','routes','route_stops','schedules','fare_config','buses','alerts','meta'] loop
    execute format('create policy "%1$s public read" on public.%1$s for select using (true)', t);
    execute format('create policy "%1$s admin write" on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- profiles
create policy "profiles read own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());
create policy "profiles admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- drivers
create policy "drivers read own or admin" on public.drivers for select using (profile_id = auth.uid() or public.is_admin());
create policy "drivers admin write" on public.drivers for all using (public.is_admin()) with check (public.is_admin());

-- trips
create policy "trips public read active" on public.trips for select using (status <> 'ended' or public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_id and d.profile_id = auth.uid()));
create policy "trips driver insert" on public.trips for insert with check (exists (select 1 from public.drivers d where d.id = driver_id and d.profile_id = auth.uid()));
create policy "trips driver update" on public.trips for update using (exists (select 1 from public.drivers d where d.id = driver_id and d.profile_id = auth.uid()) or public.is_admin());

-- bus_positions
create policy "positions public read" on public.bus_positions for select using (true);
create policy "positions driver insert" on public.bus_positions for insert with check (exists (select 1 from public.trips t join public.drivers d on d.id = t.driver_id where t.id = trip_id and d.profile_id = auth.uid() and t.status <> 'ended'));
create policy "positions driver update" on public.bus_positions for update using (exists (select 1 from public.trips t join public.drivers d on d.id = t.driver_id where t.id = trip_id and d.profile_id = auth.uid() and t.status <> 'ended'));
create policy "positions admin delete" on public.bus_positions for delete using (public.is_admin());

-- crowd_reports (insert only via report_crowd)
create policy "crowd admin read" on public.crowd_reports for select using (public.is_admin());

-- complaints
create policy "complaints insert own" on public.complaints for insert with check (user_id = auth.uid());
create policy "complaints read own or admin" on public.complaints for select using (user_id = auth.uid() or public.is_admin());
create policy "complaints admin update" on public.complaints for update using (public.is_admin()) with check (public.is_admin());

-- saved_trips
create policy "saved own all" on public.saved_trips for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- search_log
create policy "search insert any" on public.search_log for insert with check (true);
create policy "search admin read" on public.search_log for select using (public.is_admin());

-- A.5 FIRST ADMIN (after you register once in the app)
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'your@email.com');

-- A.6 MAKING A DRIVER (admin UI does this; manual version)
-- update public.profiles set role = 'driver' where id = '<user id>';
-- insert into public.drivers(profile_id, bus_id) values ('<user id>', '<bus id>');

-- ================================================================

-- A.7 EXTRAS ADDED FOR NAMMOORU BUS ---------------------------------

-- Atomic save of a route's ordered stops (avoids unique(route_id, seq) clashes while reordering)
create or replace function public.save_route_stops(p_route uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.route_stops where route_id = p_route;
  insert into public.route_stops(route_id, stop_id, seq, dist_km, min_from_prev)
  select p_route, (x->>'stop_id')::uuid, (x->>'seq')::int,
         coalesce((x->>'dist_km')::numeric, 0), coalesce((x->>'min_from_prev')::int, 0)
  from jsonb_array_elements(p_items) x;
end $$;

-- Audit log
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit admin read" on public.audit_logs for select using (public.is_admin());

create or replace function public.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if tg_op = 'DELETE' then v := to_jsonb(old); else v := to_jsonb(new); end if;
  insert into public.audit_logs(actor_id, action, entity, entity_id) values (auth.uid(), tg_op, tg_table_name, v->>'id');
  return null;
end $$;
create trigger audit_stops after insert or update or delete on public.stops for each row execute function public.log_change();
create trigger audit_routes after insert or update or delete on public.routes for each row execute function public.log_change();
create trigger audit_fare after update on public.fare_config for each row execute function public.log_change();
create trigger audit_alerts after insert or update or delete on public.alerts for each row execute function public.log_change();
create trigger audit_profiles after update of role on public.profiles for each row execute function public.log_change();
