import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
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
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default AuthenticatedShellRoute;
