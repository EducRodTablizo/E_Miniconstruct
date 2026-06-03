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

      // Generate transaction number via secure DB function
      const { data: txnNum, error: rpcError } = await supabase.rpc('generate_transaction_number')
      if (rpcError) throw rpcError

      const totalAmount = items.reduce((sum, i) => sum + i.product.unit_price * i.quantity, 0)

      // Create transaction
      const { data: transaction, error: txnError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: txnNum,
          customer_name: customerName || 'Walk-in Customer',
          total_amount: totalAmount,
          status: 'completed',
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (txnError) throw txnError

      // Insert items — triggers: prevent_negative_inventory + deduct_inventory_on_sale
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
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'CREATE_TRANSACTION',
          p_table_name: 'transactions',
          p_record_id: transaction.id,
          p_details: { transaction_number: txnNum, total_amount: totalAmount },
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
