import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import StaffShellFeatureBoundary from '../../features/navigation/components/StaffShellFeatureBoundary';
import Layout from '../Layout';
import PageLoader from '../PageLoader';

const AuthenticatedShellRoute = () => {
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);

  if (authLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <StaffShellFeatureBoundary>
      <Layout>
        <Outlet />
      </Layout>
    </StaffShellFeatureBoundary>
  );
};

export default AuthenticatedShellRoute;
