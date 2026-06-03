import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HardHat, Eye, EyeOff, LogIn, UserPlus, Check, X, Mail } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/useToast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least 1 number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'At least 1 special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const strongPassword = z.string()
  .min(8, 'At least 8 characters required')
  .regex(/[A-Z]/, 'At least one uppercase letter required')
  .regex(/[a-z]/, 'At least one lowercase letter required')
  .regex(/[0-9]/, 'At least one number required')
  .regex(/[^A-Za-z0-9]/, 'At least one special character required')

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'), // Requirement 7: Built-in validation rule
  password: z.string().min(1, 'Password is required'),
})

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'), // Requirement 7: Built-in validation rule
  password: strongPassword,
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type LoginForm = z.infer<typeof loginSchema>
type SignupForm = z.infer<typeof signupSchema>

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  return (
    <div className="mt-2 space-y-1.5 p-3 bg-muted rounded-md">
      {passwordRules.map(rule => {
        const passed = rule.test(password)
        return (
          <div key={rule.label} className="flex items-center gap-2 text-xs">
            {passed
              ? <Check className="h-3.5 w-3.5 text-success shrink-0" />
              : <X className="h-3.5 w-3.5 text-destructive shrink-0" />}
            <span className={passed ? 'text-success' : 'text-muted-foreground'}>{rule.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false) // Requirement 2: Control states for signup modal
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })
  const watchedPassword = signupForm.watch('password') ?? ''

  // Requirements 3 & 4: Catch the callback parameter hash upon landing back onto page
  useEffect(() => {
    const handleAuthRedirect = async () => {
      const hash = window.location.hash
      
      // Supabase appends access token confirmations or error messages to the window location string
      if (hash.includes('access_token=') || hash.includes('type=signup')) {
        // Run a state clean-out or refresh session validation check
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.confirmed_at) {
          toast({ 
            title: 'Success!', 
            description: 'Account created successfully. You may now log in.',
            variant: 'default'
          })
          // Clean hash tracking elements from the address bar cleanly
          window.history.replaceState(null, '', window.location.pathname)
        }
      } else if (hash.includes('error_description=')) {
        // Capture systemic mapping issues (e.g. broken or expired links)
        const params = new URLSearchParams(hash.replace('#', '?'))
        const errorMsg = params.get('error_description') || 'Verification token invalid or expired.'
        toast({ title: 'Verification Failed', description: errorMsg, variant: 'destructive' })
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    handleAuthRedirect()
  }, [])

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true)
    const { error } = await signIn(data.email, data.password)
    setIsLoading(false)
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Welcome back!', description: 'Logged in successfully.' })
      navigate('/dashboard')
    }
  }

  const onSignup = async (data: SignupForm) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName },
        emailRedirectTo: `${window.location.origin}/`, // Requirement 3: Tells Supabase where to redirect back
      },
    })
    setIsLoading(false)
    
    if (error) {
      // Requirement 6: Check database uniqueness collision messages or status returns
      if (error.message.toLowerCase().includes('already exists') || error.status === 422) {
        toast({ 
          title: 'Registration Failed', 
          description: 'An account with this email address already exists.', 
          variant: 'destructive' 
        })
      } else {
        toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' })
      }
    } else {
      // Requirement 2: Open the success layout modal upon complete dispatch
      setIsModalOpen(true)
      signupForm.reset()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-elegant">
            <HardHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">MiniConstruct</h1>
            <p className="text-muted-foreground text-sm mt-1">Construction Materials Inventory System</p>
          </div>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1 gap-2">
              <LogIn className="h-4 w-4" /> Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1 gap-2">
              <UserPlus className="h-4 w-4" /> Create Account
            </TabsTrigger>
          </TabsList>

          {/* LOGIN */}
          <TabsContent value="login">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access the system</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email Address</Label>
                    <Input id="login-email" type="email" placeholder="admin@miniconstruct.com" {...loginForm.register('email')} />
                    {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...loginForm.register('password')}
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading} size="lg">
                    {isLoading ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <LogIn className="h-4 w-4" />}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SIGNUP */}
          <TabsContent value="signup">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Set up your administrator account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input id="full-name" placeholder="Juan dela Cruz" {...signupForm.register('fullName')} />
                    {signupForm.formState.errors.fullName && <p className="text-xs text-destructive">{signupForm.formState.errors.fullName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email Address</Label>
                    <Input id="signup-email" type="email" placeholder="admin@miniconstruct.com" {...signupForm.register('email')} />
                    {signupForm.formState.errors.email && <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        {...signupForm.register('password')}
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>}
                    <PasswordStrength password={watchedPassword} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        {...signupForm.register('confirmPassword')}
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={isLoading} size="lg">
                    {isLoading ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground">
          MiniConstruct v1.0 &mdash; Secure Inventory Management
        </p>
      </div>

      {/* Requirement 2: Context Informational Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center justify-center text-center pt-4">
            <div className="p-3 bg-primary/10 text-primary rounded-full mb-2">
              <Mail className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl">Verify your email address</DialogTitle>
            <DialogDescription className="text-center pt-2">
              A verification email has been sent to your email address. Please check your inbox and click the verification link to activate your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pb-2">
            <Button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8">
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}