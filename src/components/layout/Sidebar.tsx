import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, RotateCcw,
  TrendingUp, ClipboardList, LogOut, HardHat, Menu, X, Users, Shield
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRBAC } from '@/hooks/useRBAC'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'

const staffNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/transactions', icon: ShoppingCart, label: 'Transactions' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/forecast', icon: TrendingUp, label: 'Demand Forecast' },
]

const ownerOnlyNavItems = [
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
]

function NavLinks({ isPrivileged, onNavigate }: { isPrivileged: boolean; onNavigate: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {isPrivileged && (
        <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
          Navigation
        </p>
      )}
      {staffNavItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}

      {isPrivileged && (
        <>
          <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-3 mb-1">
            Administration
          </p>
          {ownerOnlyNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { signOut, profile } = useAuth()
  const { isOwner, isAdmin, isPrivileged } = useRBAC()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    toast({ title: 'Logged out successfully' })
    navigate('/login')
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-sidebar p-2 rounded-md text-sidebar-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-transform duration-300',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="p-2 rounded-lg bg-sidebar-primary">
            <HardHat className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground text-base leading-tight">MiniConstruct</h1>
            <p className="text-xs text-sidebar-foreground/50">Inventory System</p>
          </div>
        </div>

        <NavLinks isPrivileged={isPrivileged} onNavigate={() => setMobileOpen(false)} />

        {/* User & Logout */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-sidebar-foreground truncate flex-1">
                {profile?.full_name || 'User'}
              </p>
              {profile?.role && (
                <Badge
                  variant="outline"
                  className="text-xs shrink-0 border-sidebar-border text-sidebar-foreground/70"
                >
                  {isOwner ? (
                    <><Shield className="h-2.5 w-2.5 mr-1" />Owner</>
                  ) : isAdmin ? (
                    <><Shield className="h-2.5 w-2.5 mr-1" />Admin</>
                  ) : 'Staff'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-sidebar-foreground/40 truncate">{profile?.email ?? ''}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  )
}
