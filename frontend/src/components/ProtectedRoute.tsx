import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContextValue'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ role }: { role?: 'user' | 'admin' }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface-bg text-surface-fg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Loading getPlaced...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
