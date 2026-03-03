import pool from '@config/database';
import {
  createPortalSignupRequest,
  createPortalUserFromInvitation,
  getOrCreateContactForSignup,
  getPortalInvitationByToken,
  getPortalLoginUserByEmail,
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

  it('returns existing contact when email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-1' }] });

    const result = await getOrCreateContactForSignup({
      email: 'client@example.com',
      firstName: 'Client',
      lastName: 'One',
    });

    expect(result).toBe('contact-1');
  });

  it('creates contact when email is not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'contact-2' }] });

    const result = await getOrCreateContactForSignup({
      email: 'newclient@example.com',
      firstName: 'New',
      lastName: 'Client',
      phone: '5551234567',
    });

    expect(result).toBe('contact-2');
  });

  it('creates pending signup request and returns id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'request-1' }] });

    const requestId = await createPortalSignupRequest({
      contactId: 'contact-1',
      email: 'client@example.com',
      passwordHash: 'hash',
    });

    expect(requestId).toBe('request-1');
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
