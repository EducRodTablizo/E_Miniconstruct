import { useState } from 'react'
import { Plus, Search, Eye, ShoppingCart } from 'lucide-react'
import { useTransactions, useCreateTransaction } from '@/hooks/useTransactions'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CartItem, Transaction } from '@/types'

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>
  if (status === 'partially_returned') return <Badge variant="warning">Partial Return</Badge>
  return <Badge variant="secondary">Fully Returned</Badge>
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [newTxnOpen, setNewTxnOpen] = useState(false)
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null)
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)

  const { data: transactions = [], isLoading } = useTransactions()
  const { data: products = [] } = useProducts()
  const createTransaction = useCreateTransaction()

  const filtered = transactions.filter(t =>
    t.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = () => {
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return
    if (qty <= 0) { toast({ title: 'Invalid quantity', variant: 'destructive' }); return }
    if (qty > product.stock_quantity) {
      toast({ title: 'Insufficient stock', description: `Only ${product.stock_quantity} ${product.unit} available.`, variant: 'destructive' })
      return
    }
    const existing = cart.findIndex(i => i.product.id === product.id)
    if (existing >= 0) {
      const updated = [...cart]
      const newQty = updated[existing].quantity + qty
      if (newQty > product.stock_quantity) {
        toast({ title: 'Insufficient stock', variant: 'destructive' })
        return
      }
      updated[existing].quantity = newQty
      setCart(updated)
    } else {
      setCart([...cart, { product, quantity: qty }])
    }
    setSelectedProductId('')
    setQty(1)
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(i => i.product.id !== productId))
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.product.unit_price * i.quantity, 0)

  const handleSubmitTransaction = async () => {
    if (cart.length === 0) { toast({ title: 'Cart is empty', variant: 'destructive' }); return }
    if (!customerName.trim()) { toast({ title: 'Customer name is required', variant: 'destructive' }); return }
    try {
      await createTransaction.mutateAsync({ customerName, items: cart })
      toast({ title: 'Transaction recorded successfully!', description: `Total: ${formatCurrency(cartTotal)}` })
      setNewTxnOpen(false)
      setCart([])
      setCustomerName('Walk-in Customer')
    } catch {
      toast({ title: 'Error', description: 'Failed to record transaction.', variant: 'destructive' })
    }
  }

  const availableProducts = products.filter(p => p.stock_quantity > 0 && !cart.find(i => i.product.id === p.id))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">{transactions.length} total sales records</p>
        </div>
        <Button onClick={() => setNewTxnOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Transaction
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction number or customer..."
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
            <div className="py-16 text-center text-muted-foreground">
              <div className="h-8 w-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-foreground font-medium">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{t.transaction_number}</TableCell>
                    <TableCell>{t.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(t.transaction_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{t.transaction_items?.length ?? 0} items</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(t.total_amount)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewTxn(t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Transaction Dialog */}
      <Dialog open={newTxnOpen} onOpenChange={setNewTxnOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Record a customer purchase</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" />
            </div>

            {/* Product Selector */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Add Products</p>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.unit_price)}/{p.unit} ({p.stock_quantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={e => setQty(parseInt(e.target.value) || 1)}
                  className="w-24"
                  placeholder="Qty"
                />
                <Button type="button" onClick={addToCart} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(item => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell>{item.quantity} {item.product.unit}</TableCell>
                        <TableCell>{formatCurrency(item.product.unit_price)}</TableCell>
                        <TableCell className="font-semibold text-primary">{formatCurrency(item.product.unit_price * item.quantity)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => removeFromCart(item.product.id)}>
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold text-foreground">Total</TableCell>
                      <TableCell colSpan={2} className="font-bold text-lg text-primary">{formatCurrency(cartTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewTxnOpen(false); setCart([]) }}>Cancel</Button>
            <Button
              onClick={handleSubmitTransaction}
              disabled={cart.length === 0 || createTransaction.isPending}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {createTransaction.isPending ? 'Processing...' : `Record Transaction ${cart.length > 0 ? `(${formatCurrency(cartTotal)})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTxn} onOpenChange={() => setViewTxn(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription className="font-mono text-primary">{viewTxn?.transaction_number}</DialogDescription>
          </DialogHeader>
          {viewTxn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium text-foreground">{viewTxn.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{formatDate(viewTxn.transaction_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={viewTxn.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(viewTxn.total_amount)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Items Purchased</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewTxn.transaction_items ?? []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name ?? '—'}</TableCell>
                        <TableCell>{item.quantity} {item.products?.unit}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
