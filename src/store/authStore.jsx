import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: async () => {
    try {
      if (typeof window !== 'undefined' && window.__mockAuth) {
        set({
          session: { user: window.__mockAuth.user },
          user: window.__mockAuth.user,
          profile: window.__mockAuth.profile,
          loading: false,
        })
        return
      }

      set({ loading: true, error: null })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Error fetching user profile:', profileError)
        }

        if (profile?.lang && profile.lang !== i18n.language) {
          i18n.changeLanguage(profile.lang)
          localStorage.setItem('nb_lang', profile.lang)
        }

        set({
          session,
          user: session.user,
          profile: profile || { id: session.user.id, role: 'passenger', lang: 'en' },
          loading: false,
        })
      } else {
        set({ session: null, user: null, profile: null, loading: false })
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle()

          set({
            session: newSession,
            user: newSession.user,
            profile: profile || { id: newSession.user.id, role: 'passenger', lang: 'en' },
            loading: false,
          })
        } else {
          set({ session: null, user: null, profile: null, loading: false })
        }
      })
    } catch (err) {
      console.error('Auth initialization failed:', err)
      set({ session: null, user: null, profile: null, loading: false, error: err.message })
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      let userProfile = null
      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        userProfile = profile || { id: data.user.id, role: 'passenger', lang: 'en' }
        if (userProfile.lang) {
          i18n.changeLanguage(userProfile.lang)
          localStorage.setItem('nb_lang', userProfile.lang)
        }
      }

      set({
        session: data.session,
        user: data.user,
        profile: userProfile,
        loading: false,
      })

      return { data, profile: userProfile, error: null }
    } catch (err) {
      set({ loading: false, error: err.message })
      return { data: null, profile: null, error: err }
    }
  },

  signUp: async (email, password, fullName, preferredLang = 'en') => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (error) throw error

      if (data?.user) {
        // Update preferred language in profile
        await supabase
          .from('profiles')
          .update({ lang: preferredLang })
          .eq('id', data.user.id)

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()

        set({
          session: data.session,
          user: data.user,
          profile: profile || { id: data.user.id, role: 'passenger', lang: preferredLang },
          loading: false,
        })
      } else {
        set({ loading: false })
      }

      return { data, error: null }
    } catch (err) {
      set({ loading: false, error: err.message })
      return { data: null, error: err }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      set({ session: null, user: null, profile: null, loading: false })
    }
  },

  refreshProfile: async () => {
    const user = get().user
    if (!user) return null
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (profile) {
      set({ profile })
    }
    return profile
  },

  claimDriverRole: async (driverKey, busRegNo = null, routeId = null) => {
    try {
      const { data, error } = await supabase.rpc('claim_driver_role', {
        p_key: driverKey,
        p_reg_no: busRegNo ? busRegNo.trim().toUpperCase() : null,
        p_route_id: routeId || null,
      })
      if (error) throw error
      if (data === 'ok') {
        await get().refreshProfile()
      }
      return { status: data || 'invalid', error: null }
    } catch (err) {
      console.error('claimDriverRole error:', err)
      return { status: 'error', error: err.message }
    }
  },

  setMyBus: async (busRegNo, routeId = null) => {
    try {
      const { data, error } = await supabase.rpc('set_my_bus', {
        p_reg_no: busRegNo ? busRegNo.trim().toUpperCase() : '',
        p_route_id: routeId || null,
      })
      if (error) throw error
      return { status: data, error: null }
    } catch (err) {
      console.error('setMyBus error:', err)
      return { status: 'error', error: err.message }
    }
  },

  resetPassword: async (email) => {
    const redirectUrl = `${window.location.origin}/reset-password`
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
  },

  updatePassword: async (newPassword) => {
    return await supabase.auth.updateUser({ password: newPassword })
  },

  updateLang: async (lang) => {
    const user = get().user
    set((state) => ({
      profile: state.profile ? { ...state.profile, lang } : null,
    }))
    if (user?.id) {
      try {
        await supabase.from('profiles').update({ lang }).eq('id', user.id)
      } catch (err) {
        console.error('Failed to sync language to profile:', err)
      }
    }
  },
}))
