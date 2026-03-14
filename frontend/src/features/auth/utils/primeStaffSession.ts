import type { User } from '../state';
import {
  getStaffBootstrapSnapshot,
  setStaffBootstrapSnapshot,
} from '../../../services/bootstrap/staffBootstrap';

const waitForBootstrapRetry = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 50);
  });

export const primeStaffSession = async (input: {
  user: User;
  organizationId?: string | null;
}): Promise<{ user: User; organizationId: string | null }> => {
  let snapshot = await getStaffBootstrapSnapshot({
    forceRefresh: true,
  });

  if (!snapshot.user) {
    await waitForBootstrapRetry();
    snapshot = await getStaffBootstrapSnapshot({
      forceRefresh: true,
    });
  }

  if (!snapshot.user) {
    snapshot = setStaffBootstrapSnapshot({
      user: input.user,
      organizationId: input.organizationId ?? null,
    });
  }

  return {
    user: snapshot.user ?? input.user,
    organizationId: snapshot.organizationId ?? input.organizationId ?? null,
  };
};
