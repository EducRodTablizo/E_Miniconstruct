import { useState } from 'react'
import { Plus, Search, Eye, ShoppingCart, X } from 'lucide-react'
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
import { customerNameSchema } from '@/lib/validation'
import type { CartItem, Transaction } from '@/types'

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge variant="success">Completed</Badge>
  if (status === 'partially_returned') return <Badge variant="warning">Partial Return</Badge>
  return <Badge variant="secondary">Fully Returned</Badge>
}

function parseTransactionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (lower.includes('insufficient stock') || lower.includes('insufficient')) {
    return 'Insufficient stock for one or more items. Please check inventory levels.'
  }
  if (lower.includes('not found')) return 'One or more products no longer exist in inventory.'
  if (lower.includes('permission') || lower.includes('policy') || lower.includes('rls')) {
    return 'You do not have permission to record transactions.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }
  return msg || 'Failed to record transaction. Please try again.'
}

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [newTxnOpen, setNewTxnOpen] = useState(false)
  const [viewTxn, setViewTxn] = useState<Transaction | null>(null)
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [customerNameError, setCustomerNameError] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [qtyError, setQtyError] = useState('')

  const { data: transactions = [], isLoading } = useTransactions()
  const { data: products = [] } = useProducts()
  const createTransaction = useCreateTransaction()

  const filtered = transactions.filter(t =>
    t.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = () => {
    setQtyError('')
    const product = products.find(p => p.id === selectedProductId)
    if (!product) { toast({ title: 'Please select a product', variant: 'destructive' }); return }

    const safeQty = Math.floor(qty)
    if (!safeQty || safeQty <= 0) { setQtyError('Quantity must be at least 1'); return }
    if (safeQty > 999999) { setQtyError('Quantity is too large'); return }

    const existingCartItem = cart.find(i => i.product.id === product.id)
    const alreadyInCart = existingCartItem?.quantity ?? 0
    if (safeQty + alreadyInCart > product.stock_quantity) {
      setQtyError(`Only ${product.stock_quantity - alreadyInCart} more units available`)
      return
    }

    if (existingCartItem) {
      setCart(cart.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + safeQty } : i))
    } else {
      setCart([...cart, { product, quantity: safeQty }])
    }
    setSelectedProductId('')
    setQty(1)
  }

  const removeFromCart = (productId: string) => setCart(cart.filter(i => i.product.id !== productId))

  const cartTotal = cart.reduce((sum, i) => sum + i.product.unit_price * i.quantity, 0)

  const handleSubmitTransaction = async () => {
    // Validate customer name
    const nameResult = customerNameSchema.safeParse(customerName)
    if (!nameResult.success) {
      setCustomerNameError(nameResult.error.issues[0].message)
      return
    }
    setCustomerNameError('')

    if (cart.length === 0) { toast({ title: 'Cart is empty', description: 'Add at least one product to the cart.', variant: 'destructive' }); return }

    // Re-validate cart quantities against current stock (guard against stale data)
    for (const item of cart) {
      const liveProduct = products.find(p => p.id === item.product.id)
      if (liveProduct && item.quantity > liveProduct.stock_quantity) {
        toast({
          title: 'Stock Changed',
          description: `${item.product.name} now only has ${liveProduct.stock_quantity} units available. Please update your cart.`,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      await createTransaction.mutateAsync({ customerName: nameResult.data, items: cart })
      toast({ title: 'Transaction recorded!', description: `Total: ${formatCurrency(cartTotal)}` })
      setNewTxnOpen(false)
      setCart([])
      setCustomerName('Walk-in Customer')
      setCustomerNameError('')
    } catch (err) {
      toast({ title: 'Transaction Failed', description: parseTransactionError(err), variant: 'destructive' })
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
      <Dialog open={newTxnOpen} onOpenChange={open => { setNewTxnOpen(open); if (!open) { setCart([]); setCustomerName('Walk-in Customer'); setCustomerNameError(''); setQtyError('') } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Record a customer purchase and update inventory</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={e => { setCustomerName(e.target.value); setCustomerNameError('') }}
                placeholder="Walk-in Customer"
                maxLength={200}
              />
              {customerNameError && <p className="text-xs text-destructive">{customerNameError}</p>}
            </div>

            {/* Product Selector */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Add Products to Cart</p>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={id => { setSelectedProductId(id); setQtyError('') }}>
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
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="1"
                    max="999999"
                    value={qty}
                    onChange={e => { setQty(parseInt(e.target.value) || 1); setQtyError('') }}
                    className="w-24"
                    placeholder="Qty"
                  />
                </div>
                <Button type="button" onClick={addToCart} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {qtyError && <p className="text-xs text-destructive">{qtyError}</p>}
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
                            <X className="h-4 w-4" />
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
            <Button variant="outline" onClick={() => setNewTxnOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitTransaction}
              disabled={cart.length === 0 || createTransaction.isPending}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {createTransaction.isPending
                ? 'Processing...'
                : `Record Transaction${cart.length > 0 ? ` (${formatCurrency(cartTotal)})` : ''}`}
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
