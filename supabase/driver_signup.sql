-- ====================================================================
-- NAMMOORU BUS: Driver Sign-Up & Key Verification (Phase 5.5)
-- Run this script in your Supabase SQL Editor.
-- ====================================================================

-- 1. Create table for holding the driver registration secret key (RLS secured)
CREATE TABLE IF NOT EXISTS public.driver_signup_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Secure the config table so clients cannot query it directly
ALTER TABLE public.driver_signup_config ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate driver_key_attempts with full schema
-- (Ensures failed_attempts, locked_until, and last_attempt_at columns are created)
DROP TABLE IF EXISTS public.driver_key_attempts CASCADE;

CREATE TABLE public.driver_key_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_key_attempts ENABLE ROW LEVEL SECURITY;

-- 3. RPC function to verify key, apply rate limiting, and promote user to driver
CREATE OR REPLACE FUNCTION public.claim_driver_role(p_key text)
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
BEGIN
  -- 1. Verify authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'login_required';
  END IF;

  -- 2. Check if driver registration key is configured in the system
  SELECT driver_key INTO v_active_key
  FROM public.driver_signup_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_active_key IS NULL OR length(trim(v_active_key)) = 0 THEN
    RETURN 'not_configured';
  END IF;

  -- 3. Check for existing lockout on user
  SELECT locked_until, failed_attempts
  INTO v_locked_until, v_failed_attempts
  FROM public.driver_key_attempts
  WHERE user_id = v_user_id;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN 'locked';
  END IF;

  -- 4. Validate key (trim whitespace)
  IF trim(p_key) = trim(v_active_key) THEN
    -- Success! Reset lockout counters
    DELETE FROM public.driver_key_attempts WHERE user_id = v_user_id;

    -- Update user profile role to driver
    UPDATE public.profiles
    SET role = 'driver',
        updated_at = v_now
    WHERE id = v_user_id;

    -- Ensure corresponding row in drivers table exists
    INSERT INTO public.drivers (profile_id)
    VALUES (v_user_id)
    ON CONFLICT (profile_id) DO NOTHING;

    RETURN 'ok';
  ELSE
    -- Failed attempt: track attempts and apply 15 min lock if >= 5 failed attempts
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
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_driver_role(text) TO authenticated;

-- ====================================================================
-- ACTIVE DRIVER REGISTRATION KEY:
-- Run this statement in Supabase SQL editor to activate your key:
--
-- INSERT INTO public.driver_signup_config (driver_key, is_active)
-- VALUES ('nammooru-driver-secret-2026', true);
-- ====================================================================
