-- ====================================================================
-- NAMMOORU BUS: Driver Bus Linking & Driver Report (Phase 5.6)
-- Run this in Supabase SQL editor after driver_signup.sql.
-- ====================================================================

-- 1. One-time backfill: ensure every auth user has a profile row
INSERT INTO public.profiles (id, role, lang)
SELECT id, 'passenger', 'en'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Drop the old 1-argument claim_driver_role if present
DROP FUNCTION IF EXISTS public.claim_driver_role(text);

-- 3. Replace claim_driver_role with 3-argument version (key, reg_no, route_id)
CREATE OR REPLACE FUNCTION public.claim_driver_role(
  p_key text,
  p_reg_no text,
  p_route_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_active_key text;
  v_locked_until timestamptz;
  v_failed_attempts int := 0;
  v_now timestamptz := now();
  v_clean_reg text;
  v_bus_id uuid;
  v_assigned_driver_profile uuid;
BEGIN
  -- 1. Check user authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'login_required';
  END IF;

  -- 2. Validate bus registration number
  v_clean_reg := upper(trim(coalesce(p_reg_no, '')));
  IF length(v_clean_reg) = 0 THEN
    RETURN 'bus_required';
  END IF;

  -- 3. Check if driver registration secret key is configured
  SELECT driver_key INTO v_active_key
  FROM public.driver_signup_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_active_key IS NULL OR length(trim(v_active_key)) = 0 THEN
    RETURN 'not_configured';
  END IF;

  -- 4. Check lockout state
  SELECT locked_until, failed_attempts
  INTO v_locked_until, v_failed_attempts
  FROM public.driver_key_attempts
  WHERE user_id = v_user_id;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN 'locked';
  END IF;

  -- 5. Verify driver secret key
  IF trim(p_key) <> trim(v_active_key) THEN
    -- Track failed attempt
    v_failed_attempts := coalesce(v_failed_attempts, 0) + 1;
    IF v_failed_attempts >= 5 THEN
      INSERT INTO public.driver_key_attempts (user_id, failed_attempts, locked_until, last_attempt_at)
      VALUES (v_user_id, v_failed_attempts, v_now + interval '15 minutes', v_now)
      ON CONFLICT (user_id) DO UPDATE
      SET failed_attempts = v_failed_attempts,
          locked_until = v_now + interval '15 minutes',
          last_attempt_at = v_now;
      RETURN 'locked';
    ELSE
      INSERT INTO public.driver_key_attempts (user_id, failed_attempts, last_attempt_at)
      VALUES (v_user_id, v_failed_attempts, v_now)
      ON CONFLICT (user_id) DO UPDATE
      SET failed_attempts = v_failed_attempts,
          last_attempt_at = v_now;
      RETURN 'invalid';
    END IF;
  END IF;

  -- 6. Check if bus already exists
  SELECT id INTO v_bus_id
  FROM public.buses
  WHERE upper(trim(reg_no)) = v_clean_reg
  LIMIT 1;

  IF v_bus_id IS NOT NULL THEN
    -- Check if another driver is already using this bus
    SELECT profile_id INTO v_assigned_driver_profile
    FROM public.drivers
    WHERE bus_id = v_bus_id AND profile_id <> v_user_id
    LIMIT 1;

    IF v_assigned_driver_profile IS NOT NULL THEN
      RETURN 'bus_taken';
    END IF;

    -- If existing bus has no route assigned and route is provided, update it
    IF p_route_id IS NOT NULL THEN
      UPDATE public.buses
      SET route_id = coalesce(route_id, p_route_id)
      WHERE id = v_bus_id;
    END IF;
  ELSE
    -- Create new bus
    INSERT INTO public.buses (reg_no, route_id, active)
    VALUES (v_clean_reg, p_route_id, true)
    RETURNING id INTO v_bus_id;
  END IF;

  -- 7. Reset lockout records on success
  DELETE FROM public.driver_key_attempts WHERE user_id = v_user_id;

  -- 8. Promote user profile to driver
  UPDATE public.profiles
  SET role = 'driver'
  WHERE id = v_user_id;

  -- 9. Upsert driver row with bus_id
  INSERT INTO public.drivers (profile_id, bus_id)
  VALUES (v_user_id, v_bus_id)
  ON CONFLICT (profile_id) DO UPDATE
  SET bus_id = v_bus_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_driver_role(text, text, uuid) TO authenticated;

-- 4. set_my_bus RPC for existing drivers needing to set or link their bus
CREATE OR REPLACE FUNCTION public.set_my_bus(
  p_reg_no text,
  p_route_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_clean_reg text;
  v_bus_id uuid;
  v_assigned_driver_profile uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'login_required';
  END IF;

  v_clean_reg := upper(trim(coalesce(p_reg_no, '')));
  IF length(v_clean_reg) = 0 THEN
    RETURN 'bus_required';
  END IF;

  -- Check if bus exists
  SELECT id INTO v_bus_id
  FROM public.buses
  WHERE upper(trim(reg_no)) = v_clean_reg
  LIMIT 1;

  IF v_bus_id IS NOT NULL THEN
    -- Check if another driver is using it
    SELECT profile_id INTO v_assigned_driver_profile
    FROM public.drivers
    WHERE bus_id = v_bus_id AND profile_id <> v_user_id
    LIMIT 1;

    IF v_assigned_driver_profile IS NOT NULL THEN
      RETURN 'bus_taken';
    END IF;

    IF p_route_id IS NOT NULL THEN
      UPDATE public.buses
      SET route_id = coalesce(route_id, p_route_id)
      WHERE id = v_bus_id;
    END IF;
  ELSE
    INSERT INTO public.buses (reg_no, route_id, active)
    VALUES (v_clean_reg, p_route_id, true)
    RETURNING id INTO v_bus_id;
  END IF;

  -- Upsert drivers row for caller
  INSERT INTO public.drivers (profile_id, bus_id)
  VALUES (v_user_id, v_bus_id)
  ON CONFLICT (profile_id) DO UPDATE
  SET bus_id = v_bus_id;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_bus(text, uuid) TO authenticated;

-- 5. driver_report RPC for driver history dashboard
CREATE OR REPLACE FUNCTION public.driver_report(
  p_from timestamptz DEFAULT (now() - interval '30 days'),
  p_to timestamptz DEFAULT now()
)
RETURNS TABLE (
  report_date date,
  trips_count bigint,
  total_minutes numeric,
  delayed_count bigint,
  breakdown_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    date(t.started_at) AS report_date,
    count(*)::bigint AS trips_count,
    round(
      coalesce(
        sum(extract(epoch FROM (coalesce(t.ended_at, now()) - t.started_at)) / 60.0),
        0
      )::numeric,
      1
    ) AS total_minutes,
    count(*) FILTER (WHERE t.status = 'delayed')::bigint AS delayed_count,
    count(*) FILTER (WHERE t.status = 'breakdown')::bigint AS breakdown_count
  FROM public.trips t
  JOIN public.drivers d ON d.id = t.driver_id
  WHERE d.profile_id = auth.uid()
    AND t.started_at >= p_from
    AND t.started_at <= p_to
  GROUP BY date(t.started_at)
  ORDER BY report_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.driver_report(timestamptz, timestamptz) TO authenticated;
