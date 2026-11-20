-- ====================================================================
-- NAMMOORU BUS: Route Geometry Caching (Phase 5.6)
-- Run this in Supabase SQL editor to add the geometry column to routes.
-- ====================================================================

ALTER TABLE public.routes
ADD COLUMN IF NOT EXISTS geometry jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.routes.geometry IS 'Cached road-following polyline coordinates [[lat, lng], ...] from OSRM';
