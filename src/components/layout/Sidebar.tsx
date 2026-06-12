import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, RotateCcw,
  ClipboardList, LogOut, HardHat, Menu, X, Users, Shield,
  Bot, FileBarChart2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRBAC } from '@/hooks/useRBAC'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/useToast'

const staffNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/transactions', icon: ShoppingCart, label: 'Transactions' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
]

const ownerOnlyNavItems = [
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/historical-reports', icon: FileBarChart2, label: 'Historical Reports' },
]

interface NavLinksProps {
  isPrivileged: boolean
  collapsed: boolean
  onNavigate: () => void
}

function NavLinks({ isPrivileged, collapsed, onNavigate }: NavLinksProps) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5">
      {isPrivileged && !collapsed && (
        <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">
          Navigation
        </p>
      )}

      {staffNavItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={collapsed ? label : undefined}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-0 py-2.5 mx-0.5' : '',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && label}
        </NavLink>
      ))}

      {isPrivileged && (
        <>
          {!collapsed && (
            <p className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mt-4 mb-1">
              Administration
            </p>
          )}
          {collapsed && <div className="my-2 border-t border-sidebar-border mx-1" />}
          {ownerOnlyNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5 mx-0.5' : '',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && label}
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
  const { collapsed, toggle } = useSidebar()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    toast({ title: 'Logged out successfully' })
    navigate('/login')
  }

  return (
    <>
      {/* Mobile toggle button */}
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
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-40 flex flex-col transition-all duration-300',
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'w-[60px]' : 'w-64'
        )}
      >
        {/* Logo + Collapse Toggle */}
        <div className={cn(
          'flex items-center border-b border-sidebar-border',
          collapsed ? 'flex-col gap-2 py-4 px-0' : 'gap-3 px-5 py-4'
        )}>
          {/* Logo Icon */}
          <div className={cn('p-2 rounded-lg bg-sidebar-primary shrink-0', collapsed && 'mx-auto')}>
            <HardHat className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>

          {/* Brand text — hidden when collapsed */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sidebar-foreground text-base leading-tight">MiniConstruct</h1>
              <p className="text-xs text-sidebar-foreground/50">Inventory System</p>
            </div>
          )}

          {/* Collapse toggle (desktop only) */}
          <button
            className={cn(
              'hidden md:flex items-center justify-center h-7 w-7 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0',
              collapsed && 'mx-auto mt-1'
            )}
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        </div>

        <NavLinks
          isPrivileged={isPrivileged}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
        />

        {/* User & Logout */}
        <div className={cn('border-t border-sidebar-border space-y-1', collapsed ? 'px-1 py-3' : 'px-3 py-4')}>
          {!collapsed && (
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
          )}
          <Button
            variant="ghost"
            size="sm"
            title={collapsed ? 'Logout' : undefined}
            className={cn(
              'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed ? 'w-full justify-center px-0' : 'w-full justify-start gap-3'
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </aside>
    </>
  )
}
