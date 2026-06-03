import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRBAC } from '@/hooks/useRBAC'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import InventoryPage from '@/pages/InventoryPage'
import TransactionsPage from '@/pages/TransactionsPage'
import ReturnsPage from '@/pages/ReturnsPage'
import ForecastPage from '@/pages/ForecastPage'
import AuditLogsPage from '@/pages/AuditLogsPage'
import UserManagementPage from '@/pages/UserManagementPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
})

const LoadingScreen = ({ message = 'Loading MiniConstruct...' }: { message?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  </div>
)

/** Requires authentication — redirects to /login if not logged in */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout>{children}</AppLayout>
}

/** Requires owner role — redirects staff to /dashboard with a warning */
function OwnerOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile } = useAuth()
  const { isOwner } = useRBAC()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  // Profile still loading — wait
  if (profile === null) return <LoadingScreen message="Verifying permissions..." />

  if (!isOwner) return <Navigate to="/dashboard" replace />
  return <AppLayout>{children}</AppLayout>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={loading ? <LoadingScreen /> : user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes — all authenticated users */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
        <Route path="/forecast" element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />

        {/* Owner-only routes */}
        <Route path="/users" element={<OwnerOnlyRoute><UserManagementPage /></OwnerOnlyRoute>} />
        <Route path="/audit-logs" element={<OwnerOnlyRoute><AuditLogsPage /></OwnerOnlyRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
