import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'
import type { ForecastData } from '@/types'

const MONTHS_HISTORY = 6
const SMA_WINDOW = 3

export function useForecast() {
  return useQuery({
    queryKey: ['forecast'],
    queryFn: async () => {
      // Get all products
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, unit, stock_quantity, reorder_level')
        .order('name')
      if (prodError) throw prodError

      // Build month range (last 6 months)
      const months = Array.from({ length: MONTHS_HISTORY }, (_, i) => {
        const d = subMonths(new Date(), MONTHS_HISTORY - 1 - i)
        return {
          label: format(d, 'MMM yyyy'),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        }
      })

      // Get transaction_items with dates
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('product_id, quantity, transactions!inner(transaction_date)')
        .gte('transactions.transaction_date', months[0].start)
        .lte('transactions.transaction_date', months[MONTHS_HISTORY - 1].end)
      if (itemsError) throw itemsError

      // Aggregate sales per product per month
      const salesMap: Record<string, number[]> = {}
      products.forEach((p) => {
        salesMap[p.id] = Array(MONTHS_HISTORY).fill(0)
      })

      items.forEach((item) => {
        const txnDate = (item.transactions as unknown as { transaction_date: string }).transaction_date
        const monthIdx = months.findIndex(
          (m) => txnDate >= m.start && txnDate <= m.end
        )
        if (monthIdx !== -1 && salesMap[item.product_id] !== undefined) {
          salesMap[item.product_id][monthIdx] += item.quantity
        }
      })

      // Compute SMA forecast
      const forecastData: ForecastData[] = products.map((p) => {
        const monthlySales = salesMap[p.id] || Array(MONTHS_HISTORY).fill(0)
        // SMA using last SMA_WINDOW months
        const recent = monthlySales.slice(-SMA_WINDOW)
        const forecastDemand = Math.ceil(recent.reduce((a, b) => a + b, 0) / SMA_WINDOW)
        const suggestedReorder = Math.max(0, forecastDemand - p.stock_quantity)
        return {
          product_id: p.id,
          product_name: p.name,
          unit: p.unit,
          current_stock: p.stock_quantity,
          reorder_level: p.reorder_level,
          monthly_sales: monthlySales,
          forecast_demand: forecastDemand,
          suggested_reorder: suggestedReorder,
          needs_reorder: p.stock_quantity < forecastDemand || p.stock_quantity <= p.reorder_level,
        }
      })

      return { forecastData, months: months.map((m) => m.label) }
    },
  })
}
