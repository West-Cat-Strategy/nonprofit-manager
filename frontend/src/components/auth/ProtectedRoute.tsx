import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: ReactNode;
}

const RouteContentFallback = () => (
  <div className="p-6 text-sm text-app-text-muted">Loading page...</div>
);

const ProtectedRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Suspense fallback={<RouteContentFallback />}>{children}</Suspense>
  );
};

// Neo-Brutalist routes now also use the global Layout for consistent navigation
const NeoBrutalistRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Suspense fallback={<RouteContentFallback />}>{children}</Suspense>
  );
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <ProtectedRouteWrapper isAuthenticated={isAuthenticated}>{children}</ProtectedRouteWrapper>;
};

export const NeoBrutalistRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <NeoBrutalistRouteWrapper isAuthenticated={isAuthenticated}>{children}</NeoBrutalistRouteWrapper>;
};
