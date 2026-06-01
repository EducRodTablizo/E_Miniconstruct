import { useState } from 'react'
import { Search, RotateCcw, Plus, Eye } from 'lucide-react'
import { useReturns, useCreateReturn } from '@/hooks/useReturns'
import { useTransactions } from '@/hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Return } from '@/types'

export default function ReturnsPage() {
  const [search, setSearch] = useState('')
  const [newReturnOpen, setNewReturnOpen] = useState(false)
  const [viewReturn, setViewReturn] = useState<Return | null>(null)
  const [selectedTxnId, setSelectedTxnId] = useState('')
  const [reason, setReason] = useState('')
  const [returnItems, setReturnItems] = useState<Record<string, number>>({})

  const { data: returns = [], isLoading } = useReturns()
  const { data: transactions = [] } = useTransactions()
  const createReturn = useCreateReturn()

  const filtered = returns.filter(r =>
    r.return_number.toLowerCase().includes(search.toLowerCase()) ||
    (r.transactions?.transaction_number ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const selectedTxn = transactions.find(t => t.id === selectedTxnId)
  const txnItems = selectedTxn?.transaction_items ?? []

  const setReturnQty = (itemId: string, qty: number) => {
    setReturnItems(prev => ({ ...prev, [itemId]: qty }))
  }

  const totalRefund = txnItems.reduce((sum, item) => {
    const retQty = returnItems[item.id] ?? 0
    return sum + retQty * item.unit_price
  }, 0)

  const handleSubmitReturn = async () => {
    if (!selectedTxnId) { toast({ title: 'Select a transaction', variant: 'destructive' }); return }
    const items = txnItems
      .filter(item => (returnItems[item.id] ?? 0) > 0)
      .map(item => ({
        product_id: item.product_id,
        transaction_item_id: item.id,
        quantity: returnItems[item.id],
        refund_amount: returnItems[item.id] * item.unit_price,
      }))
    if (items.length === 0) { toast({ title: 'Select at least one item to return', variant: 'destructive' }); return }

    // Validate quantities
    for (const item of txnItems) {
      const retQty = returnItems[item.id] ?? 0
      if (retQty > item.quantity) {
        toast({ title: 'Invalid quantity', description: `Cannot return more than purchased for ${item.products?.name}`, variant: 'destructive' })
        return
      }
    }

    try {
      await createReturn.mutateAsync({ transactionId: selectedTxnId, reason, items })
      toast({ title: 'Return processed successfully!', description: `Refund: ${formatCurrency(totalRefund)}` })
      setNewReturnOpen(false)
      setSelectedTxnId('')
      setReason('')
      setReturnItems({})
    } catch {
      toast({ title: 'Error', description: 'Failed to process return.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Returns</h1>
          <p className="text-muted-foreground text-sm mt-1">{returns.length} return records</p>
        </div>
        <Button onClick={() => setNewReturnOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Process Return
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by return number or transaction..."
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
              <RotateCcw className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-foreground font-medium">No returns found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Original Transaction</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{r.return_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.transactions?.transaction_number ?? '—'}</TableCell>
                    <TableCell>{r.transactions?.customer_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell className="font-semibold text-success">{formatCurrency(r.total_refund)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(r.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewReturn(r)}>
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

      {/* Process Return Dialog */}
      <Dialog open={newReturnOpen} onOpenChange={open => { setNewReturnOpen(open); if (!open) { setSelectedTxnId(''); setReturnItems({}); setReason('') } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>Select a transaction and specify items to return</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select Transaction</Label>
              <Select value={selectedTxnId} onValueChange={id => { setSelectedTxnId(id); setReturnItems({}) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Search and select transaction..." />
                </SelectTrigger>
                <SelectContent>
                  {transactions
                    .filter(t => t.status !== 'fully_returned')
                    .map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.transaction_number} — {t.customer_name} ({formatCurrency(t.total_amount)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTxn && txnItems.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Select Items to Return</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Return Qty</TableHead>
                      <TableHead>Refund</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txnItems.map(item => {
                      const retQty = returnItems[item.id] ?? 0
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.products?.name ?? '—'}</TableCell>
                          <TableCell>{item.quantity} {item.products?.unit}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={retQty || ''}
                              onChange={e => setReturnQty(item.id, parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className={retQty > 0 ? 'font-semibold text-success' : 'text-muted-foreground'}>
                            {retQty > 0 ? formatCurrency(retQty * item.unit_price) : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {totalRefund > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold text-foreground">Total Refund</TableCell>
                        <TableCell className="font-bold text-lg text-success">{formatCurrency(totalRefund)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Reason for Return (Optional)</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Damaged goods, wrong item ordered..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewReturnOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitReturn}
              disabled={createReturn.isPending || totalRefund === 0}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {createReturn.isPending ? 'Processing...' : `Process Return${totalRefund > 0 ? ` (${formatCurrency(totalRefund)})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={!!viewReturn} onOpenChange={() => setViewReturn(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription className="font-mono text-primary">{viewReturn?.return_number}</DialogDescription>
          </DialogHeader>
          {viewReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Original Transaction</p>
                  <p className="font-mono font-medium text-foreground">{viewReturn.transactions?.transaction_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{formatDate(viewReturn.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Refund</p>
                  <p className="font-bold text-lg text-success">{formatCurrency(viewReturn.total_refund)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="text-foreground">{viewReturn.reason || '—'}</p>
                </div>
              </div>
              {(viewReturn.return_items ?? []).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Returned Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Refund</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewReturn.return_items!.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name ?? '—'}</TableCell>
                          <TableCell>{item.quantity} {item.products?.unit}</TableCell>
                          <TableCell className="font-semibold text-success">{formatCurrency(item.refund_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
