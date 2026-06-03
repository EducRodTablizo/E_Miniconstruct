import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/types'

/** Fetch all staff profiles — owner only (enforced by RLS) */
export function useStaffList() {
  return useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })
}

/** Create a new staff account via the admin-create-user Edge Function */
export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      fullName,
      email,
      password,
    }: {
      fullName: string
      email: string
      password: string
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { fullName: fullName.trim(), email: email.toLowerCase().trim(), password },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-list'] }),
  })
}

/** Toggle a user's is_active status (owner only — enforced by RLS + trigger) */
export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
          p_table_name: 'profiles',
          p_record_id: userId,
          p_details: { is_active: isActive },
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-list'] }),
  })
}

/** Change a user's role (owner only — enforced by trigger) */
export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'owner' | 'staff' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'UPDATE_USER_ROLE',
          p_table_name: 'profiles',
          p_record_id: userId,
          p_details: { new_role: role },
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-list'] }),
  })
}
