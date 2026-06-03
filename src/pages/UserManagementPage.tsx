import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Users, UserPlus, Shield, UserCheck, UserX, Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react'
import { useStaffList, useCreateStaff, useToggleUserActive, useUpdateUserRole } from '@/hooks/useUsers'
import { useRBAC } from '@/hooks/useRBAC'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { createStaffSchema, type CreateStaffForm } from '@/lib/validation'
import type { Profile } from '@/types'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function UserManagementPage() {
  const { isPrivileged } = useRBAC()
  const { profile: currentProfile } = useAuth()
  const { data: staffList = [], isLoading } = useStaffList()
  const createStaff = useCreateStaff()
  const toggleActive = useToggleUserActive()
  const updateRole = useUpdateUserRole()

  const [createOpen, setCreateOpen] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<Profile | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffSchema),
  })
  const watchedPassword = watch('password') ?? ''

  // Guard: only owners and admins can access this page
  if (!isPrivileged && currentProfile !== null) {
    return <Navigate to="/dashboard" replace />
  }

  const onCreateStaff = async (data: CreateStaffForm) => {
    try {
      await createStaff.mutateAsync({ fullName: data.fullName, email: data.email, password: data.password })
      toast({ title: 'Staff account created', description: `${data.fullName} can now log in with their credentials.` })
      setCreateOpen(false)
      reset()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account'
      toast({ title: 'Failed to create account', description: msg, variant: 'destructive' })
    }
  }

  const handleToggleActive = async () => {
    if (!toggleTarget) return
    try {
      await toggleActive.mutateAsync({ userId: toggleTarget.id, isActive: !toggleTarget.is_active })
      toast({
        title: toggleTarget.is_active ? 'Account deactivated' : 'Account reactivated',
        description: `${toggleTarget.full_name}'s account has been ${toggleTarget.is_active ? 'deactivated' : 'reactivated'}.`,
      })
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update account', variant: 'destructive' })
    }
    setToggleTarget(null)
  }

  const handleRoleChange = async (userId: string, newRole: 'owner' | 'admin' | 'staff', name: string) => {
    if (userId === currentProfile?.id) {
      toast({ title: 'Cannot change your own role', variant: 'destructive' })
      return
    }
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
      toast({ title: 'Role updated', description: `${name} is now a ${newRole}.` })
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to update role', variant: 'destructive' })
    }
  }

  const ownerCount = staffList.filter(u => u.role === 'owner').length
  const staffCount = staffList.filter(u => u.role === 'staff').length
  const activeCount = staffList.filter(u => u.is_active).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage staff accounts and access roles</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Staff Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{staffList.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10"><UserCheck className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/10"><Shield className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{ownerCount} / {staffCount}</p>
                <p className="text-xs text-muted-foreground">Owners / Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Accounts</CardTitle>
          <CardDescription>Manage roles and active status for all system users</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map(u => {
                  const isSelf = u.id === currentProfile?.id
                  return (
                    <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{u.full_name}</p>
                          {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email ?? '—'}</TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge variant={u.role === 'staff' ? 'secondary' : 'default'}>
                            {u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin' : 'Staff'}
                          </Badge>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2">
                                <Badge variant={u.role === 'staff' ? 'secondary' : 'default'}>
                                  {u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin' : 'Staff'}
                                </Badge>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'owner', u.full_name)} disabled={u.role === 'owner'}>
                                Set as Owner
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'admin', u.full_name)} disabled={u.role === 'admin'}>
                                Set as Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'staff', u.full_name)} disabled={u.role === 'staff'}>
                                Set as Staff
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(u.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={u.is_active ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-success hover:text-success hover:bg-success/10'}
                              onClick={() => setToggleTarget(u)}
                              disabled={toggleActive.isPending}
                            >
                              {u.is_active ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</> : <><UserCheck className="h-3.5 w-3.5 mr-1" />Reactivate</>}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Staff Modal */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) reset() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Staff Account
            </DialogTitle>
            <DialogDescription>
              Create a new staff account. The new user will have Staff role by default and can log in immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateStaff)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Juan dela Cruz" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" placeholder="staff@miniconstruct.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              {watchedPassword && (
                <div className="space-y-1.5 p-3 bg-muted rounded-md">
                  {passwordRules.map(rule => {
                    const passed = rule.test(watchedPassword)
                    return (
                      <div key={rule.label} className="flex items-center gap-2 text-xs">
                        {passed ? <Check className="h-3.5 w-3.5 text-success shrink-0" /> : <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
                        <span className={passed ? 'text-success' : 'text-muted-foreground'}>{rule.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Confirm Password *</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-xs text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0 text-primary" />
              New accounts are automatically assigned the <strong className="text-foreground">Staff</strong> role. You can promote them to Owner after creation.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" disabled={createStaff.isPending} className="gap-2">
                {createStaff.isPending ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {createStaff.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation */}
      <AlertDialog open={!!toggleTarget} onOpenChange={() => setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active ? 'Deactivate Account' : 'Reactivate Account'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active
                ? `Deactivating ${toggleTarget?.full_name}'s account will prevent them from logging in. You can reactivate it at any time.`
                : `Reactivating ${toggleTarget?.full_name}'s account will allow them to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={toggleTarget?.is_active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-success text-success-foreground hover:bg-success/90'}
            >
              {toggleTarget?.is_active ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
