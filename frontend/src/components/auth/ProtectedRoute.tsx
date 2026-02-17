import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import Layout from '../Layout';

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

// Neo-Brutalist routes don't use the old Layout (they have their own sidebar layout)
const NeoBrutalistRouteWrapper = ({ children, isAuthenticated }: ProtectedRouteProps & { isAuthenticated: boolean }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <ProtectedRouteWrapper isAuthenticated={isAuthenticated}>{children}</ProtectedRouteWrapper>;
};

export const NeoBrutalistRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return <NeoBrutalistRouteWrapper isAuthenticated={isAuthenticated}>{children}</NeoBrutalistRouteWrapper>;
};
