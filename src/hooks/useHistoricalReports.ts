import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface HistoricalReport {
  id: string
  report_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  period_label: string
  period_start: string
  period_end: string
  total_sales: number
  total_transactions: number
  inventory_changes: unknown[]
  user_activities: unknown[]
  audit_summary: unknown[]
  generated_by: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

export function useHistoricalReports() {
  return useQuery({
    queryKey: ['historical-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historical_reports')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as HistoricalReport[]
    },
  })
}

export function useGenerateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      report_type: string
      period_start: string
      period_end: string
      period_label: string
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-historical-report', {
        body: params,
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data.report as HistoricalReport
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historical-reports'] }),
  })
}
