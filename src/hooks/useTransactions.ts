import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Transaction, CartItem } from '@/types'

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(*), transaction_items(*, products(*))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      customerName,
      items,
    }: {
      customerName: string
      items: CartItem[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()

      // Generate transaction number
      const { data: txnNum } = await supabase.rpc('generate_transaction_number')
      const totalAmount = items.reduce((sum, i) => sum + i.product.unit_price * i.quantity, 0)

      // Create transaction
      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: txnNum,
          customer_name: customerName,
          total_amount: totalAmount,
          status: 'completed',
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (txnError) throw txnError

      // Insert items (triggers auto-deduct inventory)
      const txnItems = items.map((i) => ({
        transaction_id: transaction.id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.product.unit_price,
        subtotal: i.product.unit_price * i.quantity,
      }))
      const { error: itemsError } = await supabase.from('transaction_items').insert(txnItems)
      if (itemsError) throw itemsError

      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'CREATE_TRANSACTION',
          table_name: 'transactions',
          record_id: transaction.id,
          details: { transaction_number: txnNum, total_amount: totalAmount },
        })
      }

      return transaction
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useTransactionById(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, profiles(*), transaction_items(*, products(*))')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as Transaction | null
    },
    enabled: !!id,
  })
}
