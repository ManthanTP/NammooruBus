import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'

export const useSavedStore = create((set, get) => ({
  savedTrips: [],

  initSaved: async (explicitUser) => {
    const user = explicitUser || useAuthStore.getState().user

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
        .order('created_at', { ascending: false })

      if (error) {
        if (import.meta.env.DEV) console.warn('[SavedStore] fetch error:', error.message)
        set({ savedTrips: localSaved })
        return
      }

      const dbTrips = data || []

      // Merge local saved trips into DB if any exist locally that aren't in DB
      if (localSaved.length > 0) {
        for (const local of localSaved) {
          const from_stop = local.from_stop || local.fromStopId || local.fromStop?.id
          const to_stop = local.to_stop || local.toStopId || local.toStop?.id
          const route_key = local.route_key || 'saved'

          if (from_stop && to_stop) {
            const alreadyInDb = dbTrips.some(
              (d) => d.from_stop === from_stop && d.to_stop === to_stop
            )
            if (!alreadyInDb) {
              await supabase.from('saved_trips').insert({
                user_id: user.id,
                from_stop,
                to_stop,
                route_key,
              })
            }
          }
        }

        // Refetch after merge
        const { data: updated } = await supabase
          .from('saved_trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const merged = updated || []
        set({ savedTrips: merged })
        localStorage.setItem('nb_saved', JSON.stringify(merged))
      } else {
        set({ savedTrips: dbTrips })
        localStorage.setItem('nb_saved', JSON.stringify(dbTrips))
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[SavedStore] init error:', err)
      set({ savedTrips: localSaved })
    }
  },

  saveTrip: async (trip, explicitUser) => {
    const user = explicitUser || useAuthStore.getState().user

    const from_stop =
      trip.from_stop ||
      trip.fromStopId ||
      trip.fromStop?.id ||
      trip.legs?.[0]?.fromStop?.id
    const to_stop =
      trip.to_stop ||
      trip.toStopId ||
      trip.toStop?.id ||
      trip.legs?.[trip.legs?.length - 1]?.toStop?.id

    if (!from_stop || !to_stop) {
      console.warn('[SavedStore] Missing from_stop or to_stop for saveTrip:', trip)
      return { success: false, error: 'missing_stops' }
    }

    const route_key =
      trip.route_key ||
      (trip.legs && trip.legs.length > 0
        ? trip.legs.map((l) => l.route?.code || l.route?.id).filter(Boolean).join('+')
        : 'saved')

    const newTrip = {
      id: `saved-${Date.now()}`,
      from_stop,
      to_stop,
      route_key,
      summary: trip.legsSummary || trip.summary || route_key,
      created_at: new Date().toISOString(),
    }

    const current = get().savedTrips
    const exists = current.some((t) => t.from_stop === from_stop && t.to_stop === to_stop)
    if (exists) {
      return { success: true, alreadySaved: true }
    }

    const updated = [newTrip, ...current]
    set({ savedTrips: updated })
    localStorage.setItem('nb_saved', JSON.stringify(updated))

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('saved_trips')
          .insert({
            user_id: user.id,
            from_stop,
            to_stop,
            route_key,
          })
          .select()
          .maybeSingle()

        if (error) {
          if (error.code === '23505') {
            // Unique violation: already saved, treat as success
            return { success: true, alreadySaved: true }
          }
          if (import.meta.env.DEV) console.warn('[SavedStore] DB insert error:', error.message)
        } else if (data) {
          const patched = updated.map((t) => (t.id === newTrip.id ? data : t))
          set({ savedTrips: patched })
          localStorage.setItem('nb_saved', JSON.stringify(patched))
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[SavedStore] Could not save trip to DB:', e)
      }
    }

    return { success: true }
  },

  removeTrip: async (target, explicitUser) => {
    const user = explicitUser || useAuthStore.getState().user
    const current = get().savedTrips

    let from_stop = null
    let to_stop = null
    let tripId = null

    if (typeof target === 'string') {
      tripId = target
      const match = current.find((t) => t.id === target)
      if (match) {
        from_stop = match.from_stop
        to_stop = match.to_stop
      }
    } else if (target && typeof target === 'object') {
      tripId = target.id
      from_stop = target.from_stop || target.fromStopId || target.fromStop?.id
      to_stop = target.to_stop || target.toStopId || target.toStop?.id
    }

    const updated = current.filter((t) => {
      if (tripId && t.id === tripId) return false
      if (from_stop && to_stop && t.from_stop === from_stop && t.to_stop === to_stop) return false
      return true
    })

    set({ savedTrips: updated })
    localStorage.setItem('nb_saved', JSON.stringify(updated))

    if (user?.id) {
      try {
        if (from_stop && to_stop) {
          await supabase
            .from('saved_trips')
            .delete()
            .eq('user_id', user.id)
            .eq('from_stop', from_stop)
            .eq('to_stop', to_stop)
        } else if (tripId && !tripId.startsWith('saved-')) {
          await supabase
            .from('saved_trips')
            .delete()
            .eq('id', tripId)
            .eq('user_id', user.id)
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[SavedStore] Could not delete from DB:', e)
      }
    }

    return { success: true }
  },

  isSaved: (arg1, arg2) => {
    const list = get().savedTrips || []
    if (!arg1) return false

    // Support isSaved(fromStopId, toStopId)
    if (arg2) {
      return list.some((t) => t.from_stop === arg1 && t.to_stop === arg2)
    }

    // Support isSaved(journeyObject)
    if (typeof arg1 === 'object') {
      const from = arg1.from_stop || arg1.fromStopId || arg1.fromStop?.id || arg1.legs?.[0]?.fromStop?.id
      const to = arg1.to_stop || arg1.toStopId || arg1.toStop?.id || arg1.legs?.[arg1.legs?.length - 1]?.toStop?.id
      if (from && to) {
        return list.some((t) => t.from_stop === from && t.to_stop === to)
      }
    }

    // Support isSaved(tripId)
    return list.some((t) => t.id === arg1)
  },
}))
