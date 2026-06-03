import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }, [])

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Prevent setting unverified sessions automatically into application state
        if (currentSession?.user && !currentSession.user.confirmed_at) {
          setSession(null)
          setUser(null)
          setProfile(null)
          if (event === 'INITIAL_SESSION') setLoading(false)
          return
        }

        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession?.user) {
          setTimeout(() => fetchProfile(currentSession.user.id), 0)
        } else {
          setProfile(null)
        }
        if (event === 'INITIAL_SESSION') {
          setLoading(false)
        }
      }
    )

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      // Guard layout check against unverified sessions left in local storage
      if (currentSession?.user && !currentSession.user.confirmed_at) {
        supabase.auth.signOut()
        setLoading(false)
        return
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) return { data, error }

    // Enforce Requirement 5: Block unverified users from entering system
    if (data.user && !data.user.confirmed_at) {
      await supabase.auth.signOut() // Kill the active session token instantly
      return { 
        data: { user: null, session: null }, 
        error: { name: 'AuthError', status: 403, message: 'Please verify your email address before logging in.' } 
      }
    }

    if (data.user) {
      // Log audit
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'LOGIN',
        table_name: 'auth',
        record_id: data.user.id,
        details: { email: data.user.email },
      })
    }
    return { data, error }
  }

  const signOut = async () => {
    if (user) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'LOGOUT',
        table_name: 'auth',
        record_id: user.id,
        details: {},
      })
    }
    return supabase.auth.signOut()
  }

  return { user, session, profile, loading, signIn, signOut }
}