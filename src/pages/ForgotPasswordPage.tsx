import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HardHat, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        // Supabase returns generic errors — map to user-friendly messages
        if (error.message.toLowerCase().includes('rate limit')) {
          toast({
            title: 'Too Many Requests',
            description: 'Please wait a few minutes before requesting another reset link.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Request Failed',
            description: error.message,
            variant: 'destructive',
          })
        }
      } else {
        // Always show success (security best practice: don't reveal if email exists)
        setSentEmail(data.email)
        setShowConfirmModal(true)
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Could not connect to the server. Please check your internet connection.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
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
            <p className="text-muted-foreground text-sm mt-1">Password Recovery</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Forgot Password?
            </CardTitle>
            <CardDescription>
              Enter your registered email address and we will send you a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@miniconstruct.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isLoading}
              >
                {isLoading
                  ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  : <Send className="h-4 w-4" />}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          MiniConstruct v1.0 &mdash; Secure Inventory Management
        </p>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col items-center text-center pt-4">
            <div className="p-4 bg-success/10 rounded-full mb-3">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <DialogTitle className="text-xl">Reset Link Sent!</DialogTitle>
            <DialogDescription className="text-center pt-2 space-y-2">
              <span className="block">
                A password reset verification has been sent to your email address:
              </span>
              <span className="block font-semibold text-foreground">{sentEmail}</span>
              <span className="block mt-2">
                Please check your inbox and click the secure verification link to reset your password.
                The link will expire after a short time.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pb-2 px-2">
            <Button
              onClick={() => setShowConfirmModal(false)}
              className="w-full"
            >
              Got it
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <Link to="/login">Return to Sign In</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
