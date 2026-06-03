import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Return } from '@/types'

export function useReturns() {
  return useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('*, transactions(transaction_number, customer_name), return_items(*, products(name, unit))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Return[]
    },
  })
}

export function useCreateReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transactionId,
      reason,
      items,
    }: {
      transactionId: string
      reason: string
      items: Array<{
        product_id: string
        transaction_item_id: string
        quantity: number
        refund_amount: number
      }>
    }) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: rtnNum, error: rpcError } = await supabase.rpc('generate_return_number')
      if (rpcError) throw rpcError

      const totalRefund = items.reduce((sum, i) => sum + i.refund_amount, 0)

      // Create return record
      const { data: returnRecord, error: rtnError } = await supabase
        .from('returns')
        .insert({
          return_number: rtnNum,
          transaction_id: transactionId,
          reason: reason || '',
          total_refund: totalRefund,
          created_by: user?.id ?? null,
        })
        .select()
        .single()
      if (rtnError) throw rtnError

      // Insert return items — trigger: restore_inventory_on_return
      const returnItems = items.map((i) => ({
        return_id: returnRecord.id,
        product_id: i.product_id,
        transaction_item_id: i.transaction_item_id,
        quantity: i.quantity,
        refund_amount: i.refund_amount,
      }))
      const { error: itemsError } = await supabase.from('return_items').insert(returnItems)
      if (itemsError) throw itemsError

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'partially_returned' })
        .eq('id', transactionId)

      if (user) {
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'PROCESS_RETURN',
          p_table_name: 'returns',
          p_record_id: returnRecord.id,
          p_details: { return_number: rtnNum, total_refund: totalRefund },
        })
      }

      return returnRecord
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['returns'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
