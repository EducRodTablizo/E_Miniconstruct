import { useAuth } from '@/hooks/useAuth'

export type UserRole = 'owner' | 'admin' | 'staff'

/**
 * useRBAC — Role-Based Access Control hook
 *
 * Roles:
 *   owner — original owner of the system; full access
 *   admin — administrator account; same full access as owner
 *   staff — field staff; view inventory, record transactions, process returns
 *
 * All checks are client-side (display gating).
 * Server-side enforcement is via PostgreSQL RLS + SECURITY DEFINER is_owner()
 * which returns true for BOTH 'owner' and 'admin' roles.
 */
export function useRBAC() {
  const { profile } = useAuth()

  const role = profile?.role as UserRole | null ?? null
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'
  const isStaff = role === 'staff'
  const isActive = profile?.is_active ?? false

  // Privileged = owner OR admin (identical permissions)
  const isPrivileged = isOwner || isAdmin

  return {
    // Role identity
    role,
    isOwner,
    isAdmin,
    isStaff,
    isActive,
    isPrivileged,

    // Feature permissions
    canManageUsers: isPrivileged,
    canManageInventory: isPrivileged,         // Create/edit/delete products
    canViewInventory: isPrivileged || isStaff,
    canRecordTransactions: isPrivileged || isStaff,
    canProcessReturns: isPrivileged || isStaff,
    canViewForecast: isPrivileged || isStaff,
    canViewAuditLogs: isPrivileged,
    canViewDashboard: isPrivileged || isStaff,
  }
}
