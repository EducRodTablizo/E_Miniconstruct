export interface Profile {
  id: string
  full_name: string
  role: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  category_id: string | null
  unit: string
  unit_price: number
  stock_quantity: number
  reorder_level: number
  created_at: string
  updated_at: string
  categories?: Category | null
}

export interface Transaction {
  id: string
  transaction_number: string
  customer_name: string
  transaction_date: string
  total_amount: number
  status: 'completed' | 'partially_returned' | 'fully_returned'
  created_by: string | null
  created_at: string
  profiles?: Profile | null
  transaction_items?: TransactionItem[]
}

export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  products?: Product | null
}

export interface Return {
  id: string
  return_number: string
  transaction_id: string
  reason: string
  total_refund: number
  created_by: string | null
  created_at: string
  transactions?: Transaction | null
  return_items?: ReturnItem[]
}

export interface ReturnItem {
  id: string
  return_id: string
  product_id: string
  transaction_item_id: string | null
  quantity: number
  refund_amount: number
  products?: Product | null
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string
  details: Record<string, unknown>
  created_at: string
  profiles?: Profile | null
}

export interface ForecastData {
  product_id: string
  product_name: string
  unit: string
  current_stock: number
  reorder_level: number
  monthly_sales: number[]
  forecast_demand: number
  suggested_reorder: number
  needs_reorder: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}
