import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import InventoryPage from '@/pages/InventoryPage'
import TransactionsPage from '@/pages/TransactionsPage'
import ReturnsPage from '@/pages/ReturnsPage'
import ForecastPage from '@/pages/ForecastPage'
import AuditLogsPage from '@/pages/AuditLogsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading MiniConstruct...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <AppLayout>{children}</AppLayout>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            loading ? (
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : user ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
        <Route path="/forecast" element={<ProtectedRoute><ForecastPage /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />
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

