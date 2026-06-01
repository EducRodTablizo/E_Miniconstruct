import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { useForecast } from '@/hooks/useForecast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ForecastPage() {
  const { data, isLoading } = useForecast()

  const needsReorder = useMemo(() =>
    (data?.forecastData ?? []).filter(f => f.needs_reorder),
    [data]
  )

  const chartData = useMemo(() => {
    if (!data) return []
    return data.forecastData.slice(0, 15).map(f => ({
      name: f.product_name.length > 20 ? f.product_name.slice(0, 20) + '…' : f.product_name,
      'Current Stock': f.current_stock,
      'Forecasted Demand': f.forecast_demand,
      'Suggested Reorder': f.suggested_reorder,
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Analyzing sales data...</p>
        </div>
      </div>
    )
  }

  const forecastData = data?.forecastData ?? []
  const months = data?.months ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Demand Forecast</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Based on Simple Moving Average of last {months.length} months &mdash; {months[0]} to {months[months.length - 1]}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold text-foreground">{forecastData.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Needs Reorder</p>
              <p className="text-2xl font-bold text-warning">{needsReorder.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Well Stocked</p>
              <p className="text-2xl font-bold text-success">{forecastData.length - needsReorder.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Forecast Chart</TabsTrigger>
          <TabsTrigger value="table">Reorder Recommendations</TabsTrigger>
          <TabsTrigger value="all">All Products</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock vs Forecasted Demand</CardTitle>
              <CardDescription>Top 15 products by current stock level</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>No data available yet. Record some transactions first.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      height={80}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Current Stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Forecasted Demand" fill="hsl(var(--muted-foreground))" opacity={0.7} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Suggested Reorder" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Reorder Recommendations
              </CardTitle>
              <CardDescription>Products that need restocking based on forecasted demand</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {needsReorder.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success opacity-60" />
                  <p className="font-medium text-foreground">All products are well-stocked!</p>
                  <p className="text-sm text-muted-foreground mt-1">No reorders needed based on current forecast.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Forecasted Demand</TableHead>
                      <TableHead>Suggested Reorder</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needsReorder.map(f => (
                      <TableRow key={f.product_id}>
                        <TableCell className="font-medium text-foreground">{f.product_name}</TableCell>
                        <TableCell>
                          <span className={f.current_stock === 0 ? 'text-destructive font-bold' : 'text-warning font-semibold'}>
                            {f.current_stock} {f.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.reorder_level} {f.unit}</TableCell>
                        <TableCell>{f.forecast_demand} {f.unit}</TableCell>
                        <TableCell>
                          <Badge variant="warning" className="font-bold">
                            +{f.suggested_reorder} {f.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.current_stock === 0 ? 'destructive' : 'warning'}>
                            {f.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Products Forecast</CardTitle>
              <CardDescription>Complete demand analysis for all inventory items</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Avg Monthly Sales</TableHead>
                    <TableHead>Forecasted Demand</TableHead>
                    <TableHead>Reorder Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.map(f => (
                    <TableRow key={f.product_id}>
                      <TableCell className="font-medium text-foreground">{f.product_name}</TableCell>
                      <TableCell>{f.current_stock} {f.unit}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(f.monthly_sales.reduce((a, b) => a + b, 0) / f.monthly_sales.length).toFixed(1)} {f.unit}
                      </TableCell>
                      <TableCell>{f.forecast_demand} {f.unit}</TableCell>
                      <TableCell>
                        {f.suggested_reorder > 0
                          ? <Badge variant="warning">+{f.suggested_reorder} {f.unit}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          f.current_stock === 0 ? 'destructive' :
                          f.needs_reorder ? 'warning' : 'success'
                        }>
                          {f.current_stock === 0 ? 'Out of Stock' : f.needs_reorder ? 'Reorder Needed' : 'Well Stocked'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
