import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useDataStore = create((set, get) => ({
  stops: [],
  routes: [],
  routeStops: [],
  schedules: [],
  fareConfig: null,
  dataVersion: 0,
  loading: false,
  error: null,
  isCached: false,

  // Selectors
  stopsById: () => {
    const stops = get().stops || []
    return stops.reduce((acc, stop) => {
      acc[stop.id] = stop
      return acc
    }, {})
  },

  routesById: () => {
    const routes = get().routes || []
    return routes.reduce((acc, route) => {
      acc[route.id] = route
      return acc
    }, {})
  },

  routeStopsByRoute: () => {
    const routeStops = get().routeStops || []
    return routeStops.reduce((acc, rs) => {
      if (!acc[rs.route_id]) acc[rs.route_id] = []
      acc[rs.route_id].push(rs)
      return acc
    }, {})
  },

  initData: async () => {
    // 1. Try restoring from localStorage first
    let cachedVersion = parseInt(localStorage.getItem('nb_version') || '0', 10)
    let cachedStops = null
    let cachedRoutes = null
    let cachedRouteStops = null
    let cachedSchedules = null
    let cachedFare = null

    try {
      cachedStops = JSON.parse(localStorage.getItem('nb_stops') || 'null')
      cachedRoutes = JSON.parse(localStorage.getItem('nb_routes') || 'null')
      cachedRouteStops = JSON.parse(localStorage.getItem('nb_route_stops') || 'null')
      cachedSchedules = JSON.parse(localStorage.getItem('nb_schedules') || 'null')
      cachedFare = JSON.parse(localStorage.getItem('nb_fare') || 'null')
    } catch (e) {
      console.warn('Failed to parse cached transport data from localStorage:', e)
    }

    const hasFullCache = cachedVersion > 0 && cachedStops && cachedRoutes && cachedRouteStops

    if (hasFullCache) {
      set({
        stops: cachedStops || [],
        routes: cachedRoutes || [],
        routeStops: cachedRouteStops || [],
        schedules: cachedSchedules || [],
        fareConfig: cachedFare,
        dataVersion: cachedVersion,
        isCached: true,
      })
    }

    // 2. If offline, keep cached data
    if (!navigator.onLine) {
      return
    }

    // 3. Check version against Supabase meta table
    try {
      set({ loading: !hasFullCache, error: null })

      const { data: metaData, error: metaError } = await supabase
        .from('meta')
        .select('value')
        .eq('key', 'data_version')
        .maybeSingle()

      if (metaError) {
        console.warn('Could not read meta.data_version, falling back to cache:', metaError)
        set({ loading: false })
        return
      }

      const serverVersion = metaData ? Number(metaData.value) : 1

      // If server version matches local version and we already have cache, skip refetch
      if (hasFullCache && serverVersion === cachedVersion) {
        set({ loading: false })
        return
      }

      // Fetch fresh master data
      const [stopsRes, routesRes, routeStopsRes, schedulesRes, fareRes] = await Promise.all([
        supabase.from('stops').select('*').eq('active', true),
        supabase.from('routes').select('*').eq('active', true),
        supabase.from('route_stops').select('*').order('seq', { ascending: true }),
        supabase.from('schedules').select('*'),
        supabase.from('fare_config').select('*').eq('id', 1).maybeSingle(),
      ])

      if (stopsRes.error) throw stopsRes.error
      if (routesRes.error) throw routesRes.error
      if (routeStopsRes.error) throw routeStopsRes.error
      if (schedulesRes.error) throw schedulesRes.error

      const stops = stopsRes.data || []
      const routes = routesRes.data || []
      const routeStops = routeStopsRes.data || []
      const schedules = schedulesRes.data || []
      const fareConfig = fareRes.data || { min_fare: 5, per_stage: 5, stage_km: 2.0 }

      // Update localStorage
      localStorage.setItem('nb_version', serverVersion.toString())
      localStorage.setItem('nb_stops', JSON.stringify(stops))
      localStorage.setItem('nb_routes', JSON.stringify(routes))
      localStorage.setItem('nb_route_stops', JSON.stringify(routeStops))
      localStorage.setItem('nb_schedules', JSON.stringify(schedules))
      localStorage.setItem('nb_fare', JSON.stringify(fareConfig))

      set({
        stops,
        routes,
        routeStops,
        schedules,
        fareConfig,
        dataVersion: serverVersion,
        loading: false,
        isCached: true,
      })
    } catch (err) {
      console.error('Failed to load transport master data:', err)
      set({ loading: false, error: err.message })
    }
  },
}))
