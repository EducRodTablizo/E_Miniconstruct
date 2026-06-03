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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
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

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
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
    if (!error && data.user) {
      await supabase.rpc('log_audit_event', {
        p_user_id: data.user.id,
        p_action: 'LOGIN',
        p_table_name: 'auth',
        p_record_id: data.user.id,
        p_details: { email: data.user.email },
      })
    }
    return { data, error }
  }

  const signOut = async () => {
    if (user) {
      await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_action: 'LOGOUT',
        p_table_name: 'auth',
        p_record_id: user.id,
        p_details: {},
      })
    }
    return supabase.auth.signOut()
  }

  return { user, session, profile, loading, signIn, signOut }
}
