import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ShoppingCart, AlertTriangle, TrendingUp,
  ArrowRight, CheckCircle, RotateCcw
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { isToday } from 'date-fns'

function StatsCard({
  title, value, sub, icon: Icon, color
}: { title: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: products = [] } = useProducts()
  const { data: transactions = [] } = useTransactions()

  const stats = useMemo(() => {
    const totalProducts = products.length
    const lowStock = products.filter(p => p.stock_quantity <= p.reorder_level).length
    const outOfStock = products.filter(p => p.stock_quantity === 0).length
    const todaySales = transactions
      .filter(t => isToday(new Date(t.transaction_date)))
      .reduce((sum, t) => sum + t.total_amount, 0)
    const totalTransactions = transactions.length
    return { totalProducts, lowStock, outOfStock, todaySales, totalTransactions }
  }, [products, transactions])

  const recentTransactions = transactions.slice(0, 8)
  const lowStockProducts = products
    .filter(p => p.stock_quantity <= p.reorder_level)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 6)

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <Badge variant="success">Completed</Badge>
    if (status === 'partially_returned') return <Badge variant="warning">Partial Return</Badge>
    return <Badge variant="secondary">Fully Returned</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your construction materials inventory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts}
          sub="In inventory"
          icon={Package}
          color="bg-primary/10 text-primary"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStock}
          sub={stats.outOfStock > 0 ? `${stats.outOfStock} out of stock` : 'Monitor these items'}
          icon={AlertTriangle}
          color="bg-warning/10 text-warning"
        />
        <StatsCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySales)}
          sub="Total revenue today"
          icon={TrendingUp}
          color="bg-success/10 text-success"
        />
        <StatsCard
          title="Total Transactions"
          value={stats.totalTransactions}
          sub="All time"
          icon={ShoppingCart}
          color="bg-accent text-accent-foreground"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest sales activity</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/transactions" className="gap-1 text-primary">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No transactions yet</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/transactions">Create First Transaction</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Txn #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs font-medium text-primary">{t.transaction_number}</TableCell>
                        <TableCell>{t.customer_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{formatDateShort(t.transaction_date)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(t.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Low Stock
                </CardTitle>
                <CardDescription>Items needing attention</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory" className="gap-1 text-primary">
                  View <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStockProducts.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-60" />
                  <p className="text-sm text-muted-foreground">All items well-stocked!</p>
                </div>
              ) : (
                lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.categories?.name ?? 'Uncategorized'}</p>
                    </div>
                    <Badge variant={p.stock_quantity === 0 ? 'destructive' : 'warning'} className="ml-2 shrink-0">
                      {p.stock_quantity} {p.unit}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/transactions" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                New Transaction
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Add Product
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/returns" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Process Return
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/forecast" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                View Forecast
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
