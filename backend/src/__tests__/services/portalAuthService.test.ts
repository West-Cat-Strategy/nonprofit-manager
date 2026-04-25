import pool from '@config/database';
import {
  createPortalSignupRequest,
  createPortalUserFromInvitation,
  getPortalInvitationByToken,
  getPortalLoginUserByEmail,
  resolvePortalSignupContact,
  updatePortalUserLastLogin,
} from '@services/portalAuthService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

describe('portalAuthService', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns a resolved contact when the signup bridge finds a single normalized-email match', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ contact_id: 'contact-1', resolution_status: 'resolved' }],
    }).mockResolvedValueOnce({ rows: [{ id: 'resolution-1' }] });

    const result = await resolvePortalSignupContact({
      email: 'client@example.com',
      firstName: 'Client',
      lastName: 'One',
    });

    expect(result).toEqual({
      contactId: 'contact-1',
      resolutionStatus: 'resolved',
    });
    expect(mockQuery).toHaveBeenCalledWith(
      `SELECT contact_id, resolution_status
     FROM public.portal_resolve_signup_request($1, $2, $3, $4)`,
      ['Client', 'One', 'client@example.com', null]
    );
  });

  it('returns a resolved contact when the signup bridge creates a new contact for a no-match email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ contact_id: 'contact-2', resolution_status: 'resolved' }],
    }).mockResolvedValueOnce({ rows: [{ id: 'resolution-2' }] });

    const result = await resolvePortalSignupContact({
      email: 'newclient@example.com',
      firstName: 'New',
      lastName: 'Client',
      phone: '5551234567',
    });

    expect(result).toEqual({
      contactId: 'contact-2',
      resolutionStatus: 'resolved',
    });
    expect(mockQuery).toHaveBeenCalledWith(
      `SELECT contact_id, resolution_status
     FROM public.portal_resolve_signup_request($1, $2, $3, $4)`,
      ['New', 'Client', 'newclient@example.com', '5551234567']
    );
  });

  it('returns an unresolved signup result when multiple contacts share the email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ contact_id: null, resolution_status: 'needs_contact_resolution' }],
    }).mockResolvedValueOnce({ rows: [{ id: 'resolution-3' }] });

    await expect(
      resolvePortalSignupContact({
        email: 'duplicate@example.com',
        firstName: 'Duplicate',
        lastName: 'Case',
      })
    ).resolves.toEqual({
      contactId: null,
      resolutionStatus: 'needs_contact_resolution',
    });
  });

  it('does not fail signup resolution when intake audit logging fails', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ contact_id: 'contact-1', resolution_status: 'resolved' }],
      })
      .mockRejectedValueOnce(new Error('audit insert failed'));

    await expect(
      resolvePortalSignupContact({
        email: 'client@example.com',
        firstName: 'Client',
        lastName: 'One',
      })
    ).resolves.toEqual({
      contactId: 'contact-1',
      resolutionStatus: 'resolved',
    });
  });

  it('creates pending signup request and returns id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'request-1' }] });

    const requestId = await createPortalSignupRequest({
      contactId: 'contact-1',
      email: 'client@example.com',
      passwordHash: 'hash',
      firstName: 'Client',
      lastName: 'One',
      phone: '5551234567',
      resolutionStatus: 'resolved',
    });

    expect(requestId).toBe('request-1');
    expect(mockQuery).toHaveBeenCalledWith(
      `INSERT INTO portal_signup_requests (
       contact_id,
       email,
       password_hash,
       first_name,
       last_name,
       phone,
       status,
       resolution_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
      ['contact-1', 'client@example.com', 'hash', 'Client', 'One', '5551234567', 'pending', 'resolved']
    );
  });

  it('returns null when invitation token does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getPortalInvitationByToken('missing')).resolves.toBeNull();
  });

  it('returns login user when found', async () => {
    const row = {
      id: 'portal-1',
      email: 'client@example.com',
      password_hash: 'hash',
      contact_id: 'contact-1',
      status: 'active',
      is_verified: true,
    };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    await expect(getPortalLoginUserByEmail('client@example.com')).resolves.toEqual(row);
  });

  it('updates last login timestamp without return value', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updatePortalUserLastLogin('portal-1')).resolves.toBeUndefined();
  });

  it('creates portal user from invitation', async () => {
    const row = { id: 'portal-2', email: 'client@example.com', contact_id: 'contact-2' };
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    await expect(
      createPortalUserFromInvitation({
        contactId: 'contact-2',
        email: 'client@example.com',
        passwordHash: 'hash',
        verifiedBy: 'admin-1',
      })
    ).resolves.toEqual(row);
  });
});
