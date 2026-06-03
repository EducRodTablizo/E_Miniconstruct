import { useAuth } from '@/hooks/useAuth'

/**
 * useRBAC — Role-Based Access Control hook
 *
 * Returns permission flags derived from the current user's profile role.
 * All checks are purely client-side (display gating); server-side enforcement
 * is handled by PostgreSQL RLS policies and the SECURITY DEFINER functions.
 */
export function useRBAC() {
  const { profile } = useAuth()

  const isOwner = profile?.role === 'owner'
  const isStaff = profile?.role === 'staff'
  const isActive = profile?.is_active ?? false

  return {
    // Role identity
    role: profile?.role ?? null,
    isOwner,
    isStaff,
    isActive,

    // Feature permissions
    canManageUsers: isOwner,
    canManageInventory: isOwner,       // Create/edit/delete products: owner only
    canViewInventory: isOwner || isStaff,
    canRecordTransactions: isOwner || isStaff,
    canProcessReturns: isOwner || isStaff,
    canViewForecast: isOwner || isStaff,
    canViewAuditLogs: isOwner,
    canViewDashboard: isOwner || isStaff,
  }
}
