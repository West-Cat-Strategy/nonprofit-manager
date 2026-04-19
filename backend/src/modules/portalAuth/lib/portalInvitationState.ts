import type { SafeGuardResult } from '@services/authGuardService';
import * as portalAuthService from '@services/portalAuthService';

type PortalInvitationRecord = {
  id: string;
  email: string;
  contact_id: string | null;
  created_by: string | null;
  expires_at: Date | string;
  accepted_at: Date | string | null;
};

export const getValidPortalInvitation = async (
  token: string
): Promise<SafeGuardResult<{ invitation: PortalInvitationRecord }>> => {
  const invitation = (await portalAuthService.getPortalInvitationByToken(
    token
  )) as PortalInvitationRecord | null;

  if (!invitation) {
    return {
      ok: false,
      error: {
        code: 'not_found',
        message: 'Invitation not found',
        statusCode: 404,
      },
    };
  }

  if (invitation.accepted_at) {
    return {
      ok: false,
      error: {
        code: 'bad_request',
        message: 'Invitation already accepted',
        statusCode: 400,
      },
    };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return {
      ok: false,
      error: {
        code: 'bad_request',
        message: 'Invitation expired',
        statusCode: 400,
      },
    };
  }

  return {
    ok: true,
    data: { invitation },
  };
};
