import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { matchRouteCatalogEntry } from '../../../routes/routeCatalog';
import TeamMessengerDock from '../../teamChat/components/TeamMessengerDock';
import { TeamMessengerProvider } from '../../teamChat/messenger/TeamMessengerContext';

interface StaffShellFeatureBoundaryProps {
  children: ReactNode;
}

const teamMessengerRouteIds = new Set(['team-chat']);

export default function StaffShellFeatureBoundary({
  children,
}: StaffShellFeatureBoundaryProps) {
  const location = useLocation();
  const currentRoute = matchRouteCatalogEntry(`${location.pathname}${location.search}`);
  const teamMessengerActive = currentRoute ? teamMessengerRouteIds.has(currentRoute.id) : false;

  if (!teamMessengerActive) {
    return <>{children}</>;
  }

  return (
    <TeamMessengerProvider>
      {children}
      <TeamMessengerDock />
    </TeamMessengerProvider>
  );
}
