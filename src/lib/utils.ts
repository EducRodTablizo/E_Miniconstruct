import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export function getStockStatusColor(qty: number, reorderLevel: number): string {
  if (qty === 0) return 'text-destructive'
  if (qty <= reorderLevel) return 'text-warning'
  return 'text-success'
}

export function getStockStatusLabel(qty: number, reorderLevel: number): string {
  if (qty === 0) return 'Out of Stock'
  if (qty <= reorderLevel) return 'Low Stock'
  return 'In Stock'
}
