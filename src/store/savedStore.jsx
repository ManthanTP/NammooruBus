import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useSavedStore = create((set, get) => ({
  savedTrips: [],

  initSaved: async (user) => {
    // 1. Load from localStorage
    let localSaved = []
    try {
      localSaved = JSON.parse(localStorage.getItem('nb_saved') || '[]')
    } catch (e) {
      console.warn('Failed parsing local saved trips:', e)
    }

    if (!user) {
      set({ savedTrips: localSaved })
      return
    }

    // 2. If logged in, fetch from saved_trips table
    try {
      const { data, error } = await supabase
        .from('saved_trips')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const dbTrips = data || []

      // Merge local into DB if any exist locally that aren't in DB
      if (localSaved.length > 0) {
        for (const local of localSaved) {
          const exists = dbTrips.some(
            (d) => d.from_stop === local.from_stop && d.to_stop === local.to_stop
          )
          if (!exists && local.from_stop && local.to_stop) {
            await supabase.from('saved_trips').insert({
              user_id: user.id,
              from_stop: local.from_stop,
              to_stop: local.to_stop,
              route_key: local.route_key || 'saved',
            })
          }
        }

        // Refetch after merge
        const { data: updated } = await supabase
          .from('saved_trips')
          .select('*')
          .eq('user_id', user.id)

        set({ savedTrips: updated || [] })
        localStorage.removeItem('nb_saved')
      } else {
        set({ savedTrips: dbTrips })
      }
    } catch (err) {
      console.warn('Failed syncing saved trips from Supabase:', err)
      set({ savedTrips: localSaved })
    }
  },

  saveTrip: async (trip, user) => {
    const from_stop = trip.fromStop?.id || trip.from_stop
    const to_stop = trip.toStop?.id || trip.to_stop
    const route_key = trip.route_key || trip.id || `${from_stop}-${to_stop}`

    const newTrip = {
      id: `local-${Date.now()}`,
      from_stop,
      to_stop,
      route_key,
      fromStop: trip.fromStop,
      toStop: trip.toStop,
      routeSummary: trip.summary || '',
      created_at: new Date().toISOString(),
    }

    const current = get().savedTrips
    const exists = current.some((t) => t.from_stop === from_stop && t.to_stop === to_stop)
    if (exists) return

    const updated = [newTrip, ...current]
    set({ savedTrips: updated })

    if (user?.id) {
      try {
        const { data } = await supabase.from('saved_trips').insert({
          user_id: user.id,
          from_stop,
          to_stop,
          route_key,
        }).select().maybeSingle()

        if (data) {
          set({
            savedTrips: updated.map((t) => (t.id === newTrip.id ? { ...t, id: data.id } : t)),
          })
        }
      } catch (e) {
        console.warn('Could not save trip to DB:', e)
      }
    } else {
      localStorage.setItem('nb_saved', JSON.stringify(updated))
    }
  },

  removeTrip: async (tripId, user) => {
    const current = get().savedTrips
    const updated = current.filter((t) => t.id !== tripId)
    set({ savedTrips: updated })

    if (user?.id) {
      try {
        await supabase.from('saved_trips').delete().eq('id', tripId).eq('user_id', user.id)
      } catch (e) {
        console.warn('Could not delete trip from DB:', e)
      }
    } else {
      localStorage.setItem('nb_saved', JSON.stringify(updated))
    }
  },

  isSaved: (fromStopId, toStopId) => {
    return get().savedTrips.some(
      (t) => t.from_stop === fromStopId && t.to_stop === toStopId
    )
  },
}))
