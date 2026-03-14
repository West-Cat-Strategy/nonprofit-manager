import type { PortalUser } from '../state';
import { getPortalBootstrapSnapshot } from '../../../services/bootstrap/portalBootstrap';

export const primePortalSession = async (fallbackUser: PortalUser): Promise<PortalUser> => {
  const snapshot = await getPortalBootstrapSnapshot({
    forceRefresh: true,
    fallbackUser,
  });

  return snapshot.user ?? fallbackUser;
};
