import { useState } from 'react'
import { Search, ClipboardList, LogIn, LogOut, Package, ShoppingCart, RotateCcw, Edit, Trash2 } from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

const ACTION_CONFIG: Record<string, { icon: React.ElementType; variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'; label: string }> = {
  LOGIN:                { icon: LogIn, variant: 'success', label: 'Login' },
  LOGOUT:               { icon: LogOut, variant: 'secondary', label: 'Logout' },
  CREATE_PRODUCT:       { icon: Package, variant: 'default', label: 'Add Product' },
  UPDATE_PRODUCT:       { icon: Edit, variant: 'warning', label: 'Update Product' },
  DELETE_PRODUCT:       { icon: Trash2, variant: 'destructive', label: 'Delete Product' },
  CREATE_TRANSACTION:   { icon: ShoppingCart, variant: 'default', label: 'New Transaction' },
  PROCESS_RETURN:       { icon: RotateCcw, variant: 'warning', label: 'Process Return' },
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const { data: logs = [], isLoading } = useAuditLogs()

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.profiles?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    l.record_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">Track all user activities and system events</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, user, or record ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
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
              <p className="text-foreground font-medium">No audit logs yet</p>
              <p className="text-sm text-muted-foreground mt-1">Activities will appear here as you use the system</p>
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
                        <Badge variant={config?.variant ?? 'secondary'} className="gap-1">
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
