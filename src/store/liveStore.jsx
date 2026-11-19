import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useLiveStore = create((set, get) => ({
  trips: [], // Active trips with joined bus_positions, route, and driver
  speedsByTrip: {}, // Map of trip_id -> array of recent speeds
  selectedTripId: null,
  isReconnecting: false,
  subscriberCount: 0,
  channel: null,
  pollTimer: null,
  staleTimer: null,

  // Set selected trip
  setSelectedTripId: (id) => set({ selectedTripId: id }),

  // Number of active trips currently running
  getActiveCount: () => {
    const now = Date.now()
    return get().trips.filter((t) => {
      if (t.status === 'ended') return false
      if (!t.position?.updated_at) return false
      const ageMs = now - new Date(t.position.updated_at).getTime()
      return ageMs < 300 * 1000 // Exclude older than 5 minutes
    }).length
  },

  // Initial fetch of active trips and positions
  fetchActiveTrips: async () => {
    try {
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          direction,
          status,
          crowd_level,
          started_at,
          route_id,
          bus_id,
          driver_id,
          bus:buses(id, reg_no),
          route:routes(id, code, name_en, name_kn, color),
          position:bus_positions(lat, lng, speed_kmh, heading, updated_at)
        `)
        .neq('status', 'ended')

      if (tripsError) throw tripsError

      const now = Date.now()
      // Filter out trips whose positions are older than 5 minutes
      const validTrips = (tripsData || []).filter((t) => {
        if (!t.position?.updated_at) return false
        const ageMs = now - new Date(t.position.updated_at).getTime()
        return ageMs <= 300 * 1000
      })

      // Update speed histories
      const speeds = { ...get().speedsByTrip }
      validTrips.forEach((t) => {
        if (t.position?.speed_kmh !== undefined && t.position?.speed_kmh !== null) {
          if (!speeds[t.id]) speeds[t.id] = []
          speeds[t.id] = [...speeds[t.id].slice(-9), t.position.speed_kmh]
        }
      })

      set({
        trips: validTrips,
        speedsByTrip: speeds,
        isReconnecting: false,
      })
    } catch (err) {
      console.warn('Live tracking fetch failed, marking reconnecting:', err)
      set({ isReconnecting: true })
    }
  },

  // Subscribe to Realtime postgres_changes
  subscribe: () => {
    const count = get().subscriberCount + 1
    set({ subscriberCount: count })

    if (get().channel) {
      // Already subscribed
      return
    }

    // 1. Initial fetch
    get().fetchActiveTrips()

    // 2. Setup periodic stale cleanup & polling fallback
    const pollTimer = setInterval(() => {
      get().fetchActiveTrips()
    }, 10000) // Fallback 10s poll

    const staleTimer = setInterval(() => {
      // Remove trips with position age > 300s
      const now = Date.now()
      set((state) => ({
        trips: state.trips.filter((t) => {
          if (t.status === 'ended') return false
          if (!t.position?.updated_at) return false
          const ageMs = now - new Date(t.position.updated_at).getTime()
          return ageMs < 300 * 1000
        }),
      }))
    }, 5000)

    // 3. Create Supabase Realtime channel
    const channel = supabase
      .channel('nammooru-live-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_positions' },
        (payload) => {
          const { eventType, new: newPos, old: oldPos } = payload
          if (eventType === 'DELETE') {
            set((state) => ({
              trips: state.trips.filter((t) => t.id !== oldPos.trip_id),
            }))
            return
          }

          if (newPos) {
            set((state) => {
              const tripIndex = state.trips.findIndex((t) => t.id === newPos.trip_id)
              if (tripIndex === -1) {
                // Trip not loaded yet, trigger refetch
                get().fetchActiveTrips()
                return state
              }

              const updatedTrips = [...state.trips]
              updatedTrips[tripIndex] = {
                ...updatedTrips[tripIndex],
                position: newPos,
              }

              // Update speeds window
              const currentSpeeds = state.speedsByTrip[newPos.trip_id] || []
              const updatedSpeeds = {
                ...state.speedsByTrip,
                [newPos.trip_id]: [...currentSpeeds.slice(-9), newPos.speed_kmh || 17],
              }

              return {
                trips: updatedTrips,
                speedsByTrip: updatedSpeeds,
                isReconnecting: false,
              }
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          const { eventType, new: newTrip } = payload
          if (eventType === 'UPDATE' && newTrip.status === 'ended') {
            set((state) => ({
              trips: state.trips.filter((t) => t.id !== newTrip.id),
            }))
            return
          }

          if (newTrip) {
            set((state) => {
              const tripIndex = state.trips.findIndex((t) => t.id === newTrip.id)
              if (tripIndex === -1) {
                get().fetchActiveTrips()
                return state
              }

              const updatedTrips = [...state.trips]
              updatedTrips[tripIndex] = {
                ...updatedTrips[tripIndex],
                status: newTrip.status,
                crowd_level: newTrip.crowd_level,
              }
              return { trips: updatedTrips }
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isReconnecting: false })
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          set({ isReconnecting: true })
        }
      })

    set({ channel, pollTimer, staleTimer })
  },

  // Unsubscribe when components unmount
  unsubscribe: () => {
    const count = Math.max(0, get().subscriberCount - 1)
    set({ subscriberCount: count })

    if (count === 0 && get().channel) {
      supabase.removeChannel(get().channel)
      clearInterval(get().pollTimer)
      clearInterval(get().staleTimer)
      set({ channel: null, pollTimer: null, staleTimer: null })
    }
  },

  // Reset store on logout
  resetStore: () => {
    if (get().channel) {
      supabase.removeChannel(get().channel)
    }
    clearInterval(get().pollTimer)
    clearInterval(get().staleTimer)
    set({
      trips: [],
      speedsByTrip: {},
      selectedTripId: null,
      isReconnecting: false,
      subscriberCount: 0,
      channel: null,
      pollTimer: null,
      staleTimer: null,
    })
  },

  // Call Supabase report_crowd RPC
  reportCrowd: async (tripId, level) => {
    const { error } = await supabase.rpc('report_crowd', {
      p_trip: tripId,
      p_level: level,
    })
    return { error }
  },
}))
