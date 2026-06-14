import pool from '@config/database';
import crypto from 'crypto';
import {
  createPortalSignupRequest,
  createPortalUserFromInvitation,
  findPendingSignupRequestIdByEmail,
  findPortalUserIdByEmail,
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
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            contact_id: 'contact-1',
            account_id: 'account-1',
            resolution_status: 'resolved',
            ambiguity_state: 'single_match',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'resolution-1' }] });

    const result = await resolvePortalSignupContact({
      email: 'client@example.com',
      firstName: 'Client',
      lastName: 'One',
    });

    expect(result).toEqual({
      contactId: 'contact-1',
      accountId: 'account-1',
      resolutionStatus: 'resolved',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      `SELECT *
     FROM public.portal_resolve_signup_request($1, $2, $3, $4)`,
      ['Client', 'One', 'client@example.com', null]
    );
    expect(mockQuery.mock.calls[1][1][11]).toBe('single_match');
  });

  it('records a distinct ambiguity state when the signup bridge creates a single-tenant no-match contact', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            contact_id: 'contact-new',
            account_id: 'account-1',
            resolution_status: 'needs_contact_resolution',
            ambiguity_state: 'single_tenant_no_match_created',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'resolution-2' }] });

    const result = await resolvePortalSignupContact({
      email: 'newclient@example.com',
      firstName: 'New',
      lastName: 'Client',
      phone: '5551234567',
    });

    expect(result).toEqual({
      contactId: 'contact-new',
      accountId: 'account-1',
      resolutionStatus: 'needs_contact_resolution',
    });
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      `SELECT *
     FROM public.portal_resolve_signup_request($1, $2, $3, $4)`,
      ['New', 'Client', 'newclient@example.com', '5551234567']
    );
    expect(mockQuery.mock.calls[1][1][11]).toBe('single_tenant_no_match_created');
  });

  it('returns an unresolved signup result when multiple contacts share the email', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            contact_id: null,
            account_id: 'account-1',
            resolution_status: 'needs_contact_resolution',
            ambiguity_state: 'multiple_matches',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'resolution-3' }] });

    await expect(
      resolvePortalSignupContact({
        email: 'duplicate@example.com',
        firstName: 'Duplicate',
        lastName: 'Case',
      })
    ).resolves.toEqual({
      contactId: null,
      accountId: 'account-1',
      resolutionStatus: 'needs_contact_resolution',
    });
    expect(mockQuery.mock.calls[1][1][11]).toBe('multiple_matches');
  });

  it('records exact no-match ambiguity when the signup bridge cannot infer an account', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            contact_id: null,
            account_id: null,
            resolution_status: 'needs_contact_resolution',
            ambiguity_state: 'no_match',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'resolution-4' }] });

    await expect(
      resolvePortalSignupContact({
        email: 'unknown@example.com',
        firstName: 'Unknown',
        lastName: 'Client',
      })
    ).resolves.toEqual({
      contactId: null,
      accountId: null,
      resolutionStatus: 'needs_contact_resolution',
    });
    expect(mockQuery.mock.calls[1][1][11]).toBe('no_match');
  });

  it('does not fail signup resolution when intake audit logging fails', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            contact_id: 'contact-1',
            account_id: 'account-1',
            resolution_status: 'resolved',
            ambiguity_state: 'single_match',
          },
        ],
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
      accountId: 'account-1',
      resolutionStatus: 'resolved',
    });
  });

  it('creates pending signup request and returns id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'request-1' }] });

    const requestId = await createPortalSignupRequest({
      contactId: 'contact-1',
      accountId: 'account-1',
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
       account_id,
       email,
       password_hash,
       first_name,
       last_name,
       phone,
       status,
       resolution_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
      [
        'contact-1',
        'account-1',
        'client@example.com',
        'hash',
        'Client',
        'One',
        '5551234567',
        'pending',
        'resolved',
      ]
    );
  });

  it('returns null when invitation token does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getPortalInvitationByToken('missing')).resolves.toBeNull();

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pi.token_hash = $1'), [
      crypto.createHash('sha256').update('missing').digest('hex'),
      'missing',
    ]);
  });

  it('looks up active portal users and pending signup requests case-insensitively', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'portal-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'signup-1' }] });

    await expect(findPortalUserIdByEmail('Client@Example.com')).resolves.toBe('portal-1');
    await expect(findPendingSignupRequestIdByEmail('Client@Example.com')).resolves.toBe('signup-1');

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'SELECT id FROM portal_users WHERE lower(email) = lower($1) LIMIT 1',
      ['Client@Example.com']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'SELECT id FROM portal_signup_requests WHERE lower(email) = lower($1) AND status = $2 LIMIT 1',
      ['Client@Example.com', 'pending']
    );
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
        accountId: 'account-1',
        contactId: 'contact-2',
        email: 'client@example.com',
        passwordHash: 'hash',
        verifiedBy: 'admin-1',
      })
    ).resolves.toEqual(row);
  });
});
