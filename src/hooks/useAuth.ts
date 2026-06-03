import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    // Try to fetch existing profile
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // If no profile exists (user signed up before trigger was set up), auto-create one
    if (!data && userEmail) {
      const role = userEmail === 'rodbenedict.tablizo@gmail.com' ? 'admin' : 'staff'
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, full_name: userEmail.split('@')[0], email: userEmail, role, is_active: true },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle()
      data = newProfile
    }

    setProfile(data as Profile | null)
    return data as Profile | null
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession?.user) {
          setTimeout(() => fetchProfile(currentSession.user.id, currentSession.user.email), 0)
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
        fetchProfile(currentSession.user.id, currentSession.user.email)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error && data.user) {
      // Check if account is active; also auto-creates profile if missing
      const userProfile = await fetchProfile(data.user.id, data.user.email)
      if (userProfile && !userProfile.is_active) {
        await supabase.auth.signOut()
        return {
          data: { user: null, session: null },
          error: { message: 'Your account has been deactivated. Please contact the system administrator.' } as Error,
        }
      }

      await supabase.rpc('log_audit_event', {
        p_user_id: data.user.id,
        p_action: 'LOGIN',
        p_table_name: 'auth',
        p_record_id: data.user.id,
        p_details: { email: data.user.email, role: userProfile?.role },
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
