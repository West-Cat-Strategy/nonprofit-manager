import type { PortalUser } from '../state';
import {
  getPortalBootstrapSnapshot,
  setPortalBootstrapSnapshot,
} from '../../../services/bootstrap/portalBootstrap';

export const primePortalSession = async (fallbackUser: PortalUser): Promise<PortalUser> => {
  let snapshot = await getPortalBootstrapSnapshot({
    forceRefresh: true,
  });

  if (!snapshot.user) {
    snapshot = setPortalBootstrapSnapshot(fallbackUser);
  }

  return snapshot.user ?? fallbackUser;
};
