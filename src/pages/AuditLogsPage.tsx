import { useState } from 'react'
import {
  Search, ClipboardList, LogIn, LogOut, Package, ShoppingCart,
  RotateCcw, Edit, Trash2, Users, UserCheck, UserX, Key, Bot, FileBarChart2, Filter
} from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'

const ACTION_CONFIG: Record<string, { icon: React.ElementType; variant: BadgeVariant; label: string; category: string }> = {
  // Auth
  LOGIN:               { icon: LogIn,         variant: 'success',     label: 'Login',           category: 'auth' },
  LOGOUT:              { icon: LogOut,         variant: 'secondary',   label: 'Logout',          category: 'auth' },
  // Products
  CREATE_PRODUCT:      { icon: Package,        variant: 'default',     label: 'Add Product',     category: 'inventory' },
  UPDATE_PRODUCT:      { icon: Edit,           variant: 'warning',     label: 'Update Product',  category: 'inventory' },
  DELETE_PRODUCT:      { icon: Trash2,         variant: 'destructive', label: 'Delete Product',  category: 'inventory' },
  STOCK_ADJUSTMENT:    { icon: Package,        variant: 'warning',     label: 'Stock Adjust',    category: 'inventory' },
  // Transactions
  CREATE_TRANSACTION:  { icon: ShoppingCart,   variant: 'default',     label: 'New Transaction', category: 'transaction' },
  UPDATE_TRANSACTION:  { icon: Edit,           variant: 'warning',     label: 'Edit Transaction',category: 'transaction' },
  // Returns
  PROCESS_RETURN:      { icon: RotateCcw,      variant: 'warning',     label: 'Process Return',  category: 'return' },
  // Users
  CREATE_STAFF_USER:   { icon: Users,          variant: 'default',     label: 'Create User',     category: 'user' },
  UPDATE_USER_ROLE:    { icon: Key,            variant: 'warning',     label: 'Role Change',     category: 'user' },
  ACTIVATE_USER:       { icon: UserCheck,      variant: 'success',     label: 'Activate User',   category: 'user' },
  DEACTIVATE_USER:     { icon: UserX,          variant: 'destructive', label: 'Deactivate User', category: 'user' },
  // AI
  AI_QUERY:            { icon: Bot,            variant: 'secondary',   label: 'AI Query',        category: 'ai' },
  // Reports
  GENERATE_REPORT:     { icon: FileBarChart2,  variant: 'default',     label: 'Generate Report', category: 'report' },
}

const CATEGORIES = [
  { value: 'all',         label: 'All Categories' },
  { value: 'auth',        label: 'Authentication' },
  { value: 'inventory',   label: 'Inventory' },
  { value: 'transaction', label: 'Transactions' },
  { value: 'return',      label: 'Returns' },
  { value: 'user',        label: 'User Management' },
  { value: 'ai',          label: 'AI Queries' },
  { value: 'report',      label: 'Reports' },
]

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const { data: logs = [], isLoading } = useAuditLogs()

  const filtered = logs.filter(l => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      l.record_id.toLowerCase().includes(search.toLowerCase())

    const config = ACTION_CONFIG[l.action]
    const matchesCategory = category === 'all' || config?.category === category

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all user activities and system events</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, or record ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || category !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="self-center"
                onClick={() => { setSearch(''); setCategory('all') }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-foreground font-medium">No audit logs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || category !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Activities will appear here as you use the system'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => {
                  const config = ACTION_CONFIG[log.action]
                  const Icon = config?.icon ?? ClipboardList
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={config?.variant ?? 'secondary'} className="gap-1 whitespace-nowrap">
                          <Icon className="h-3 w-3" />
                          {config?.label ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">{log.profiles?.full_name || 'System'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{log.table_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">{log.record_id || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                        {Object.keys(log.details ?? {}).length > 0
                          ? JSON.stringify(log.details).slice(0, 80)
                          : '—'
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(log.created_at)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
