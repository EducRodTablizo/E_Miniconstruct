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
      const { data, error } = await supabase.from('products').insert(product).select().single()
      if (error) throw error
      // Audit log
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'CREATE_PRODUCT',
          table_name: 'products',
          record_id: data.id,
          details: { name: product.name },
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
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE_PRODUCT',
          table_name: 'products',
          record_id: id,
          details: updates,
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
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'DELETE_PRODUCT',
          table_name: 'products',
          record_id: id,
          details: {},
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
