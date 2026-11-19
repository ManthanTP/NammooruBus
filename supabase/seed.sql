-- Nammooru Bus: Sample seed data for Hubballi (run in Supabase SQL editor after schema.sql)
-- Idempotent: safe to run multiple times

-- 1. STOPS -------------------------------------------------------------
insert into public.stops (id, name_en, name_kn, lat, lng, active)
values
  ('11111111-0000-0000-0000-000000000001', 'Old Bus Stand', 'ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ', 15.3524, 75.1388, true),
  ('11111111-0000-0000-0000-000000000002', 'Railway Station', 'ರೈಲ್ವೆ ನಿಲ್ದಾಣ', 15.3617, 75.1437, true),
  ('11111111-0000-0000-0000-000000000003', 'Chennamma Circle', 'ಚೆನ್ನಮ್ಮ ವೃತ್ತ', 15.3575, 75.1383, true),
  ('11111111-0000-0000-0000-000000000004', 'Keshwapur', 'ಕೇಶ್ವಾಪುರ', 15.3685, 75.1505, true),
  ('11111111-0000-0000-0000-000000000005', 'Vidyanagar', 'ವಿದ್ಯಾನಗರ', 15.3695, 75.1265, true),
  ('11111111-0000-0000-0000-000000000006', 'Navanagar', 'ನವನಗರ', 15.3950, 75.1050, true),
  ('11111111-0000-0000-0000-000000000007', 'Unkal', 'ಉಣಕಲ್', 15.3810, 75.1180, true),
  ('11111111-0000-0000-0000-000000000008', 'Airport', 'ವಿಮಾನ ನಿಲ್ದಾಣ', 15.3617, 75.0849, true)
on conflict (id) do update set
  name_en = excluded.name_en,
  name_kn = excluded.name_kn,
  lat = excluded.lat,
  lng = excluded.lng,
  active = excluded.active;

-- 2. ROUTES ------------------------------------------------------------
insert into public.routes (id, code, name_en, name_kn, color, two_way, active)
values
  ('22222222-0000-0000-0000-000000000201', '201', 'OBS - Airport via Keshwapur', 'ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ - ಕೇಶ್ವಾಪುರ ಮಾರ್ಗವಾಗಿ ವಿಮಾನ ನಿಲ್ದಾಣ', '#3451F2', true, true),
  ('22222222-0000-0000-0000-000000000045', '45A', 'OBS - Chennamma Circle via Railway Station', 'ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ - ರೈಲ್ವೆ ನಿಲ್ದಾಣ ಮಾರ್ಗವಾಗಿ ಚೆನ್ನಮ್ಮ ವೃತ್ತ', '#F0643C', true, true),
  ('22222222-0000-0000-0000-000000000012', '12', 'Chennamma Circle - Airport via Unkal', 'ಚೆನ್ನಮ್ಮ ವೃತ್ತ - ಉಣಕಲ್ ಮಾರ್ಗವಾಗಿ ವಿಮಾನ ನಿಲ್ದಾಣ', '#12A676', true, true),
  ('22222222-0000-0000-0000-000000000007', '7', 'OBS - Airport via Vidyanagar', 'ಹಳೆಯ ಬಸ್ ನಿಲ್ದಾಣ - ವಿದ್ಯಾನಗರ ಮಾರ್ಗವಾಗಿ ವಿಮಾನ ನಿಲ್ದಾಣ', '#8B5CF6', true, true)
on conflict (id) do update set
  code = excluded.code,
  name_en = excluded.name_en,
  name_kn = excluded.name_kn,
  color = excluded.color,
  two_way = excluded.two_way,
  active = excluded.active;

-- 3. ROUTE STOPS (with haversine * 1.3 dist and estimated minutes) ------
-- Helper temporary function to populate route stops with exact formula
do $$
declare
  r_id uuid;
  s_ids uuid[];
  prev_lat float8;
  prev_lng float8;
  curr_lat float8;
  curr_lng float8;
  d float8;
  dist numeric(6,2);
  mins int;
  idx int;
begin
  -- Clear existing route_stops for these 4 routes to cleanly reseed
  delete from public.route_stops where route_id in (
    '22222222-0000-0000-0000-000000000201'::uuid,
    '22222222-0000-0000-0000-000000000045'::uuid,
    '22222222-0000-0000-0000-000000000012'::uuid,
    '22222222-0000-0000-0000-000000000007'::uuid
  );

  -- Route 201: OBS (1), CHC (3), KSP (4), NVN (6), AIR (8)
  r_id := '22222222-0000-0000-0000-000000000201';
  s_ids := array[
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000003'::uuid,
    '11111111-0000-0000-0000-000000000004'::uuid,
    '11111111-0000-0000-0000-000000000006'::uuid,
    '11111111-0000-0000-0000-000000000008'::uuid
  ];
  for idx in 1 .. array_length(s_ids, 1) loop
    select lat, lng into curr_lat, curr_lng from public.stops where id = s_ids[idx];
    if idx = 1 then
      dist := 0;
      mins := 0;
    else
      -- haversine in km * 1.3
      d := 2 * 6371 * asin(sqrt(
        power(sin(radians(curr_lat - prev_lat) / 2), 2) +
        cos(radians(prev_lat)) * cos(radians(curr_lat)) * power(sin(radians(curr_lng - prev_lng) / 2), 2)
      )) * 1.3;
      dist := round(d::numeric, 2);
      mins := round((dist / 17.0 * 60))::int + 1;
    end if;
    insert into public.route_stops (route_id, stop_id, seq, dist_km, min_from_prev)
    values (r_id, s_ids[idx], idx - 1, dist, mins);
    prev_lat := curr_lat;
    prev_lng := curr_lng;
  end loop;

  -- Route 45A: OBS (1), RLY (2), CHC (3)
  r_id := '22222222-0000-0000-0000-000000000045';
  s_ids := array[
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000002'::uuid,
    '11111111-0000-0000-0000-000000000003'::uuid
  ];
  for idx in 1 .. array_length(s_ids, 1) loop
    select lat, lng into curr_lat, curr_lng from public.stops where id = s_ids[idx];
    if idx = 1 then
      dist := 0;
      mins := 0;
    else
      d := 2 * 6371 * asin(sqrt(
        power(sin(radians(curr_lat - prev_lat) / 2), 2) +
        cos(radians(prev_lat)) * cos(radians(curr_lat)) * power(sin(radians(curr_lng - prev_lng) / 2), 2)
      )) * 1.3;
      dist := round(d::numeric, 2);
      mins := round((dist / 17.0 * 60))::int + 1;
    end if;
    insert into public.route_stops (route_id, stop_id, seq, dist_km, min_from_prev)
    values (r_id, s_ids[idx], idx - 1, dist, mins);
    prev_lat := curr_lat;
    prev_lng := curr_lng;
  end loop;

  -- Route 12: CHC (3), VDN (5), UNK (7), AIR (8)
  r_id := '22222222-0000-0000-0000-000000000012';
  s_ids := array[
    '11111111-0000-0000-0000-000000000003'::uuid,
    '11111111-0000-0000-0000-000000000005'::uuid,
    '11111111-0000-0000-0000-000000000007'::uuid,
    '11111111-0000-0000-0000-000000000008'::uuid
  ];
  for idx in 1 .. array_length(s_ids, 1) loop
    select lat, lng into curr_lat, curr_lng from public.stops where id = s_ids[idx];
    if idx = 1 then
      dist := 0;
      mins := 0;
    else
      d := 2 * 6371 * asin(sqrt(
        power(sin(radians(curr_lat - prev_lat) / 2), 2) +
        cos(radians(prev_lat)) * cos(radians(curr_lat)) * power(sin(radians(curr_lng - prev_lng) / 2), 2)
      )) * 1.3;
      dist := round(d::numeric, 2);
      mins := round((dist / 17.0 * 60))::int + 1;
    end if;
    insert into public.route_stops (route_id, stop_id, seq, dist_km, min_from_prev)
    values (r_id, s_ids[idx], idx - 1, dist, mins);
    prev_lat := curr_lat;
    prev_lng := curr_lng;
  end loop;

  -- Route 7: OBS (1), RLY (2), VDN (5), AIR (8)
  r_id := '22222222-0000-0000-0000-000000000007';
  s_ids := array[
    '11111111-0000-0000-0000-000000000001'::uuid,
    '11111111-0000-0000-0000-000000000002'::uuid,
    '11111111-0000-0000-0000-000000000005'::uuid,
    '11111111-0000-0000-0000-000000000008'::uuid
  ];
  for idx in 1 .. array_length(s_ids, 1) loop
    select lat, lng into curr_lat, curr_lng from public.stops where id = s_ids[idx];
    if idx = 1 then
      dist := 0;
      mins := 0;
    else
      d := 2 * 6371 * asin(sqrt(
        power(sin(radians(curr_lat - prev_lat) / 2), 2) +
        cos(radians(prev_lat)) * cos(radians(curr_lat)) * power(sin(radians(curr_lng - prev_lng) / 2), 2)
      )) * 1.3;
      dist := round(d::numeric, 2);
      mins := round((dist / 17.0 * 60))::int + 1;
    end if;
    insert into public.route_stops (route_id, stop_id, seq, dist_km, min_from_prev)
    values (r_id, s_ids[idx], idx - 1, dist, mins);
    prev_lat := curr_lat;
    prev_lng := curr_lng;
  end loop;
end $$;

-- 4. SCHEDULES ---------------------------------------------------------
insert into public.schedules (route_id, day_type, first_bus, last_bus, headway_min)
values
  ('22222222-0000-0000-0000-000000000201', 'weekday', '06:00:00', '21:30:00', 12),
  ('22222222-0000-0000-0000-000000000201', 'weekend', '06:00:00', '21:30:00', 12),
  ('22222222-0000-0000-0000-000000000045', 'weekday', '06:00:00', '21:30:00', 9),
  ('22222222-0000-0000-0000-000000000045', 'weekend', '06:00:00', '21:30:00', 9),
  ('22222222-0000-0000-0000-000000000012', 'weekday', '06:00:00', '21:30:00', 15),
  ('22222222-0000-0000-0000-000000000012', 'weekend', '06:00:00', '21:30:00', 15),
  ('22222222-0000-0000-0000-000000000007', 'weekday', '06:00:00', '21:30:00', 18),
  ('22222222-0000-0000-0000-000000000007', 'weekend', '06:00:00', '21:30:00', 18)
on conflict (route_id, day_type) do update set
  first_bus = excluded.first_bus,
  last_bus = excluded.last_bus,
  headway_min = excluded.headway_min;

-- 5. FARE CONFIG -------------------------------------------------------
insert into public.fare_config (id, min_fare, per_stage, stage_km)
values (1, 5, 5, 2.0)
on conflict (id) do update set
  min_fare = excluded.min_fare,
  per_stage = excluded.per_stage,
  stage_km = excluded.stage_km;

-- 6. BUSES -------------------------------------------------------------
insert into public.buses (id, reg_no, route_id, active)
values
  ('44444444-0000-0000-0000-000000000001', 'KA-25-F-1001', '22222222-0000-0000-0000-000000000201', true),
  ('44444444-0000-0000-0000-000000000002', 'KA-25-F-1002', '22222222-0000-0000-0000-000000000045', true),
  ('44444444-0000-0000-0000-000000000003', 'KA-25-F-1003', '22222222-0000-0000-0000-000000000012', true),
  ('44444444-0000-0000-0000-000000000004', 'KA-25-F-1004', '22222222-0000-0000-0000-000000000007', true)
on conflict (reg_no) do update set
  route_id = excluded.route_id,
  active = excluded.active;

-- 7. INITIAL DATA VERSION ----------------------------------------------
insert into public.meta (key, value)
values ('data_version', 1)
on conflict (key) do nothing;
