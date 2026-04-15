import * as repo from '../repositories/pendingRegistrationRepository';

export interface PendingRegistrationItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: repo.PendingStatus;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  hasStagedPasskeys: boolean;
}

export async function listPendingRegistrations(
  status?: repo.PendingStatus
): Promise<PendingRegistrationItem[]> {
  const rows = await repo.getPendingRegistrations(status);
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    hasStagedPasskeys: Boolean(row.has_staged_passkeys),
  }));
}
