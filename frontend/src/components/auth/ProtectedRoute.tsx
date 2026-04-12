import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { matchRouteCatalogEntry } from '../../routes/routeCatalog';
import { resolveWorkspaceModuleForRouteId } from '../../features/workspaceModules/catalog';
import { useWorkspaceModuleAccess } from '../../features/workspaceModules/useWorkspaceModuleAccess';

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: ReactNode;
}

const RouteContentFallback = () => (
  <div className="p-6 text-sm text-app-text-muted">Loading page...</div>
);

const WorkspaceModuleUnavailable = ({ moduleLabel }: { moduleLabel: string }) => (
  <div className="m-6 rounded-lg border border-app-border bg-app-surface p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-app-text-heading">Module unavailable</h2>
    <p className="mt-2 text-sm text-app-text-muted">
      {moduleLabel} is disabled for this workspace. Contact an organization admin to enable it
      again.
    </p>
  </div>
);

const ProtectedRouteWrapper = ({
  children,
  isAuthenticated,
  isLoading,
  moduleLabel,
}: ProtectedRouteProps & {
  isAuthenticated: boolean;
  isLoading: boolean;
  moduleLabel: string | null;
}) => {
  if (isLoading) {
    return <RouteContentFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (moduleLabel) {
    return <WorkspaceModuleUnavailable moduleLabel={moduleLabel} />;
  }
  return (
    <Suspense fallback={<RouteContentFallback />}>{children}</Suspense>
  );
};

// Neo-Brutalist routes now also use the global Layout for consistent navigation
const NeoBrutalistRouteWrapper = ({
  children,
  isAuthenticated,
  isLoading,
  moduleLabel,
}: ProtectedRouteProps & {
  isAuthenticated: boolean;
  isLoading: boolean;
  moduleLabel: string | null;
}) => {
  if (isLoading) {
    return <RouteContentFallback />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (moduleLabel) {
    return <WorkspaceModuleUnavailable moduleLabel={moduleLabel} />;
  }
  return (
    <Suspense fallback={<RouteContentFallback />}>{children}</Suspense>
  );
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const workspaceModules = useWorkspaceModuleAccess();
  const entry = matchRouteCatalogEntry(`${location.pathname}${location.search}`);
  const moduleKey = entry ? resolveWorkspaceModuleForRouteId(entry.id) : null;
  const moduleLabel =
    moduleKey && workspaceModules[moduleKey] === false ? entry?.title ?? 'This module' : null;

  return (
    <ProtectedRouteWrapper
      isAuthenticated={isAuthenticated}
      isLoading={authLoading}
      moduleLabel={moduleLabel}
    >
      {children}
    </ProtectedRouteWrapper>
  );
};

export const NeoBrutalistRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, authLoading } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const workspaceModules = useWorkspaceModuleAccess();
  const entry = matchRouteCatalogEntry(`${location.pathname}${location.search}`);
  const moduleKey = entry ? resolveWorkspaceModuleForRouteId(entry.id) : null;
  const moduleLabel =
    moduleKey && workspaceModules[moduleKey] === false ? entry?.title ?? 'This module' : null;

  return (
    <NeoBrutalistRouteWrapper
      isAuthenticated={isAuthenticated}
      isLoading={authLoading}
      moduleLabel={moduleLabel}
    >
      {children}
    </NeoBrutalistRouteWrapper>
  );
};
