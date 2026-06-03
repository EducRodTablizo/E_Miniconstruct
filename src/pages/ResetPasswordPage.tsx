import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HardHat, Eye, EyeOff, KeyRound, Check, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const schema = z.object({
  password: z.string()
    .min(8, 'At least 8 characters required')
    .regex(/[A-Z]/, 'At least one uppercase letter required')
    .regex(/[a-z]/, 'At least one lowercase letter required')
    .regex(/[0-9]/, 'At least one number required')
    .regex(/[^A-Za-z0-9]/, 'At least one special character required'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

type PageState = 'loading' | 'ready' | 'success' | 'invalid'

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const watchedPassword = watch('password') ?? ''

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY event when user arrives via reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready')
      } else if (event === 'SIGNED_IN') {
        // Could happen if user is already logged in
        setPageState('ready')
      }
    })

    // Also check current session (handles page refresh after redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState('ready')
      } else {
        // Check URL hash for recovery token
        const hash = window.location.hash
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
          setPageState('ready')
        } else if (hash.includes('error=')) {
          setPageState('invalid')
        } else {
          // Give a moment for Supabase to process the hash
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              if (s) {
                setPageState('ready')
              } else {
                setPageState('invalid')
              }
            })
          }, 1500)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) {
        if (error.message.toLowerCase().includes('same password')) {
          toast({
            title: 'Same Password',
            description: 'New password must be different from your current password.',
            variant: 'destructive',
          })
        } else if (error.message.toLowerCase().includes('weak')) {
          toast({
            title: 'Weak Password',
            description: 'Please choose a stronger password.',
            variant: 'destructive',
          })
        } else if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
          toast({
            title: 'Link Expired',
            description: 'Your reset link has expired or is invalid. Please request a new one.',
            variant: 'destructive',
          })
          navigate('/forgot-password')
        } else {
          toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' })
        }
      } else {
        setPageState('success')
        await supabase.auth.signOut()
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Could not connect to the server. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
        </div>
      </div>
    )
  }

  // Invalid/expired link
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Invalid Reset Link</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request New Reset Link</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Return to Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Password Reset Successful!</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Your password has been reset successfully. You may now log in with your new password.
            </p>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/login">Sign In Now</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Ready — show the new password form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-elegant">
            <HardHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">MiniConstruct</h1>
            <p className="text-muted-foreground text-sm mt-1">Set New Password</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Create New Password
            </CardTitle>
            <CardDescription>
              Your identity has been verified. Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
                {/* Password strength checklist */}
                {watchedPassword && (
                  <div className="mt-2 space-y-1.5 p-3 bg-muted rounded-md">
                    {passwordRules.map(rule => {
                      const passed = rule.test(watchedPassword)
                      return (
                        <div key={rule.label} className="flex items-center gap-2 text-xs">
                          {passed
                            ? <Check className="h-3.5 w-3.5 text-success shrink-0" />
                            : <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          <span className={passed ? 'text-success' : 'text-muted-foreground'}>
                            {rule.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  : <KeyRound className="h-4 w-4" />}
                {isSubmitting ? 'Saving...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          MiniConstruct v1.0 &mdash; Secure Inventory Management
        </p>
      </div>
    </div>
  )
}
