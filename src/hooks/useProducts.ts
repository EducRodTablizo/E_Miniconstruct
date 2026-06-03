import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Product } from '@/types'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .order('name')
      if (error) throw error
      return data as Product[]
    },
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories'>) => {
      // Sanitize: convert empty string category_id to null
      const payload = {
        ...product,
        category_id: product.category_id || null,
      }
      const { data, error } = await supabase.from('products').insert(payload).select().single()
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'CREATE_PRODUCT',
          p_table_name: 'products',
          p_record_id: data.id,
          p_details: { name: product.name },
        })
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Product> & { id: string }) => {
      const { id, ...rest } = input
      // Strip joined/readonly fields before sending to DB
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { categories: _c, created_at: _ca, updated_at: _ua, ...updates } = rest
      // Sanitize: convert empty category_id to null
      const payload = {
        ...updates,
        category_id: updates.category_id || null,
      }
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'UPDATE_PRODUCT',
          p_table_name: 'products',
          p_record_id: id,
          p_details: { name: updates.name },
        })
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'DELETE_PRODUCT',
          p_table_name: 'products',
          p_record_id: id,
          p_details: {},
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}
