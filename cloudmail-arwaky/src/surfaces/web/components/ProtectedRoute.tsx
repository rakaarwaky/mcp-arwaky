// surfaces/web/components/ProtectedRoute.tsx
// Auth guard — redirect to /login if no token

import { Navigate } from 'react-router';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}
