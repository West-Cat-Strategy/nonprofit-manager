import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { portalFetchMe } from '../store/slices/portalAuthSlice';
import PortalLayout from './PortalLayout';

interface PortalProtectedRouteProps {
  children: React.ReactNode;
}

export default function PortalProtectedRoute({ children }: PortalProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.portalAuth);

  useEffect(() => {
    if (token && !user) {
      dispatch(portalFetchMe());
    }
  }, [token, user, dispatch]);

  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return <PortalLayout>{children}</PortalLayout>;
}
