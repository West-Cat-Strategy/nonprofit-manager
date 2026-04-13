import * as repo from '../repositories/pendingRegistrationRepository';

export async function listPendingRegistrations(
  status?: repo.PendingStatus
): Promise<repo.PendingRegistrationRow[]> {
  return repo.getPendingRegistrations(status);
}
