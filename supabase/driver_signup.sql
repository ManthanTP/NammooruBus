-- ====================================================================
-- NAMMOORU BUS: Driver Sign-Up & Key Verification (Phase 5.5)
-- Run this script once in your Supabase SQL Editor.
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
-- No public SELECT policy; only accessible via SECURITY DEFINER functions or service role

-- 2. Create table for tracking failed driver key attempts (rate limiting & lockout)
CREATE TABLE IF NOT EXISTS public.driver_key_attempts (
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
  v_attempts_record record;
  v_now timestamptz := now();
  v_user_name text;
BEGIN
  -- Verify authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 'login_required';
  END IF;

  -- Check if driver registration key is configured in the system
  SELECT driver_key INTO v_active_key
  FROM public.driver_signup_config
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_active_key IS NULL OR length(trim(v_active_key)) = 0 THEN
    RETURN 'not_configured';
  END IF;

  -- Check for existing lockout on user
  SELECT * INTO v_attempts_record
  FROM public.driver_key_attempts
  WHERE user_id = v_user_id;

  IF v_attempts_record.locked_until IS NOT NULL AND v_attempts_record.locked_until > v_now THEN
    RETURN 'locked';
  END IF;

  -- Validate key (trim whitespace)
  IF trim(p_key) = trim(v_active_key) THEN
    -- Success! Reset lockout counters
    DELETE FROM public.driver_key_attempts WHERE user_id = v_user_id;

    -- Update user profile role to driver
    UPDATE public.profiles
    SET role = 'driver',
        updated_at = v_now
    WHERE id = v_user_id;

    -- Fetch user name or default
    SELECT coalesce(full_name, split_part(email, '@', 1), 'Driver')
    INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    -- Ensure corresponding row in drivers table exists
    INSERT INTO public.drivers (id, name, is_active)
    VALUES (v_user_id, coalesce(v_user_name, 'Driver'), true)
    ON CONFLICT (id) DO UPDATE
    SET is_active = true;

    RETURN 'ok';
  ELSE
    -- Failed attempt: track attempts and apply 15 min lock if >= 5 failed attempts
    IF v_attempts_record.user_id IS NULL THEN
      INSERT INTO public.driver_key_attempts (user_id, failed_attempts, last_attempt_at)
      VALUES (v_user_id, 1, v_now);
    ELSE
      IF v_attempts_record.failed_attempts + 1 >= 5 THEN
        UPDATE public.driver_key_attempts
        SET failed_attempts = v_attempts_record.failed_attempts + 1,
            locked_until = v_now + interval '15 minutes',
            last_attempt_at = v_now
        WHERE user_id = v_user_id;
        RETURN 'locked';
      ELSE
        UPDATE public.driver_key_attempts
        SET failed_attempts = failed_attempts + 1,
            last_attempt_at = v_now
        WHERE user_id = v_user_id;
      END IF;
    END IF;

    RETURN 'invalid';
  END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_driver_role(text) TO authenticated;

-- ====================================================================
-- INSTRUCTIONS TO SET OR ROTATE YOUR DRIVER KEY:
-- Run the following statement in Supabase SQL editor with your chosen secret:
--
-- INSERT INTO public.driver_signup_config (driver_key, is_active)
-- VALUES ('CHANGE-ME-driver-key', true);
-- ====================================================================
