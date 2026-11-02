import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="dost-app flex min-h-screen items-center justify-center">
        <div className="dost-app-bg" aria-hidden />
        <div className="surface-card relative z-10 flex flex-col items-center gap-4 px-10 py-8">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-[var(--dost-pale)] border-t-[var(--dost-primary)]" />
          <p className="font-display text-sm font-semibold text-[var(--dost-primary-dark)]">
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
