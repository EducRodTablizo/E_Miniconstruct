import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Filter, Edit, Trash2, Package, X, Lock } from 'lucide-react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useCategories } from '@/hooks/useProducts'
import { useRBAC } from '@/hooks/useRBAC'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/useToast'
import { formatCurrency, getStockStatusColor, getStockStatusLabel } from '@/lib/utils'
import { productSchema, type ProductForm } from '@/lib/validation'
import type { Product } from '@/types'

const UNITS = ['pcs', 'bags', 'meters', 'kg', 'liters', 'rolls', 'sheets', 'sets', 'pairs', 'boxes', 'bundles']

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { isPrivileged } = useRBAC()
  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { stock_quantity: 0, reorder_level: 10, unit: 'pcs', unit_price: 0 },
  })

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' ||
      (categoryFilter === '__none__' && !p.category_id) ||
      p.category_id === categoryFilter
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setEditProduct(null)
    reset({ stock_quantity: 0, reorder_level: 10, unit: 'pcs', unit_price: 0, category_id: '' })
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    reset({
      name: p.name,
      description: p.description ?? '',
      category_id: p.category_id ?? '',
      unit: p.unit,
      unit_price: p.unit_price,
      stock_quantity: p.stock_quantity,
      reorder_level: p.reorder_level,
    })
    setModalOpen(true)
  }

  const onSubmit = async (data: ProductForm) => {
    try {
      if (editProduct) {
        await updateProduct.mutateAsync({ id: editProduct.id, ...data })
        toast({ title: 'Product updated successfully' })
      } else {
        await createProduct.mutateAsync(data as Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories'>)
        toast({ title: 'Product added to inventory' })
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product'
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('stock')) {
        toast({ title: 'Stock Error', description: msg, variant: 'destructive' })
      } else if (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('permission')) {
        toast({ title: 'Permission Denied', description: 'Only owners can manage products.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' })
      }
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProduct.mutateAsync(deleteId)
      toast({ title: 'Product deleted from inventory' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('foreign key') || msg.includes('transaction')) {
        toast({ title: 'Cannot Delete', description: 'This product has existing transactions. Deactivate or archive it instead.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' })
      }
    }
    setDeleteId(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} construction materials</p>
        </div>
        {isPrivileged ? (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            View only — owners manage inventory
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or keyword..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Category filter — Filter icon is outside the SelectTrigger for clean display */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="__none__">No Category</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(search || categoryFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground shrink-0"
                onClick={() => { setSearch(''); setCategoryFilter('all') }}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground">
              <div className="h-8 w-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm">Loading inventory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-foreground font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || categoryFilter !== 'all' ? 'Try adjusting your search or filters' : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder At</TableHead>
                  <TableHead>Status</TableHead>
                  {isPrivileged && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.categories?.name ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.unit_price)}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getStockStatusColor(p.stock_quantity, p.reorder_level)}`}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.reorder_level} {p.unit}</TableCell>
                    <TableCell>
                      <Badge variant={p.stock_quantity === 0 ? 'destructive' : p.stock_quantity <= p.reorder_level ? 'warning' : 'success'}>
                        {getStockStatusLabel(p.stock_quantity, p.reorder_level)}
                      </Badge>
                    </TableCell>
                    {isPrivileged && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal — owners and admins only */}
      {isPrivileged && (
        <>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input id="name" placeholder="e.g. Portland Cement Type I" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Optional product description (max 1000 chars)..." rows={2} {...register('description')} />
                  {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                      value={watch('category_id') ?? ''}
                      onValueChange={v => setValue('category_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit *</Label>
                    <Select value={watch('unit') ?? 'pcs'} onValueChange={v => setValue('unit', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit_price">Unit Price (PHP) *</Label>
                  <Input id="unit_price" type="number" step="0.01" min="0" max="9999999" placeholder="0.00" {...register('unit_price')} />
                  {errors.unit_price && <p className="text-xs text-destructive">{errors.unit_price.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                    <Input id="stock_quantity" type="number" min="0" max="999999" placeholder="0" {...register('stock_quantity')} />
                    {errors.stock_quantity && <p className="text-xs text-destructive">{errors.stock_quantity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reorder_level">Reorder Level *</Label>
                    <Input id="reorder_level" type="number" min="0" max="999999" placeholder="10" {...register('reorder_level')} />
                    {errors.reorder_level && <p className="text-xs text-destructive">{errors.reorder_level.message}</p>}
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                    {(createProduct.isPending || updateProduct.isPending) ? 'Saving...' : editProduct ? 'Save Changes' : 'Add Product'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this product? This action cannot be undone and will remove the item from your inventory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
