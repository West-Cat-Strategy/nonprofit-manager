import { normalizeRoleSlug } from '../../auth/state/roleNormalization';
import type { StaffInvitation } from '../types';
import { getInvitationRoleDisplayLabel } from '../utils';

interface PendingInvitationsPanelProps {
  invitations: StaffInvitation[];
  roleLabels: Record<string, string>;
  onResendInvitation: (invitation: StaffInvitation) => void;
  onRevokeInvitation: (invitationId: string) => void;
}

export default function PendingInvitationsPanel({
  invitations,
  roleLabels,
  onResendInvitation,
  onRevokeInvitation,
}: PendingInvitationsPanelProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-sm">
      <div className="border-b border-app-border bg-app-surface-muted px-6 py-4">
        <h2 className="text-lg font-semibold text-app-text-heading">Pending Invitations</h2>
        <p className="mt-1 text-sm text-app-text-muted">
          Users who have been invited but haven&apos;t created their account yet.
        </p>
      </div>
      <div className="divide-y divide-app-border">
        {invitations.map((invitation) => {
          const normalizedRole = normalizeRoleSlug(invitation.role);

          return (
            <div
              key={invitation.id}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-app-text">{invitation.email}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      normalizedRole === 'admin'
                        ? 'bg-app-accent-soft text-app-accent-text'
                        : 'bg-app-surface-muted text-app-text'
                    }`}
                  >
                    {getInvitationRoleDisplayLabel(invitation.role, roleLabels)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-app-text-muted">
                  Invited {new Date(invitation.createdAt).toLocaleDateString('en-CA')}
                  {invitation.createdByName && ` by ${invitation.createdByName}`} &middot; Expires{' '}
                  {new Date(invitation.expiresAt).toLocaleDateString('en-CA')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onResendInvitation(invitation)}
                  className="px-3 py-1.5 text-sm font-medium text-app-accent hover:text-app-accent-hover"
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => onRevokeInvitation(invitation.id)}
                  className="px-3 py-1.5 text-sm font-medium text-app-accent hover:text-app-accent-text"
                >
                  Revoke
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
