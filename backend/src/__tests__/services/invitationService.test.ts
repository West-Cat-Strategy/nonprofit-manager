// Mock dependencies before imports
const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  createInvitation,
  getInvitations,
  getInvitationById,
  getInvitationByToken,
  validateInvitation,
  markInvitationAccepted,
  revokeInvitation,
} from '../../services/invitationService';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeInvitationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  email: 'new@example.com',
  role: 'staff',
  token: 'secure-token-abc',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  accepted_at: null,
  accepted_by: null,
  is_revoked: false,
  revoked_at: null,
  revoked_by: null,
  message: null,
  created_at: new Date('2024-01-01'),
  created_by: 'admin-user',
  created_by_name: 'Admin User',
  ...overrides,
});

// ─── createInvitation ────────────────────────────────────────────────────────

describe('createInvitation', () => {
  beforeEach(() => mockQuery.mockReset());

  it('creates an invitation when no existing user or pending invite', async () => {
    const row = makeInvitationRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [] })        // no existing user
      .mockResolvedValueOnce({ rows: [] })        // no pending invitation
      .mockResolvedValueOnce({ rows: [row] });    // INSERT

    const result = await createInvitation(
      { email: 'new@example.com', role: 'staff' },
      'admin-user'
    );

    expect(result.email).toBe('new@example.com');
    expect(result.role).toBe('staff');
    expect(result.isRevoked).toBe(false);
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('lowercases the email before inserting', async () => {
    const row = makeInvitationRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

    await createInvitation({ email: 'New@Example.COM', role: 'staff' }, 'admin');

    const insertParams = mockQuery.mock.calls[2][1] as unknown[];
    expect(insertParams[0]).toBe('new@example.com');
  });

  it('uses custom expiresInDays when provided', async () => {
    const row = makeInvitationRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });

    await createInvitation({ email: 'test@example.com', role: 'viewer', expiresInDays: 30 }, 'admin');

    // The expires_at is passed as the 4th param to the INSERT
    const insertParams = mockQuery.mock.calls[2][1] as Date[];
    const expiresAt = insertParams[3];
    const expectedMin = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
    const expectedMax = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
    expect(expiresAt.getTime()).toBeLessThan(expectedMax.getTime());
  });

  it('throws when a user with that email already exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

    await expect(
      createInvitation({ email: 'existing@example.com', role: 'staff' }, 'admin')
    ).rejects.toThrow('A user with this email already exists');
  });

  it('throws when a pending invitation already exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'pending-inv' }] });

    await expect(
      createInvitation({ email: 'pending@example.com', role: 'staff' }, 'admin')
    ).rejects.toThrow('A pending invitation already exists for this email');
  });
});

// ─── getInvitations ──────────────────────────────────────────────────────────

describe('getInvitations', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns mapped invitations', async () => {
    const rows = [makeInvitationRow(), makeInvitationRow({ id: 'inv-2', email: 'other@example.com' })];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getInvitations({});
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('inv-1');
    expect(result[1].email).toBe('other@example.com');
  });

  it('adds WHERE conditions when options restrict results', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getInvitations({ includeExpired: false, includeAccepted: false, includeRevoked: false });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/WHERE/);
    expect(sql).toMatch(/is_revoked/);
    expect(sql).toMatch(/accepted_at IS NULL/);
  });

  it('omits WHERE clause when all include flags are true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getInvitations({ includeExpired: true, includeAccepted: true, includeRevoked: true });

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toMatch(/WHERE/);
  });
});

// ─── getInvitationById ───────────────────────────────────────────────────────

describe('getInvitationById', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the invitation when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeInvitationRow()] });
    const result = await getInvitationById('inv-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('inv-1');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getInvitationById('nonexistent');
    expect(result).toBeNull();
  });
});

// ─── getInvitationByToken ─────────────────────────────────────────────────────

describe('getInvitationByToken', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the invitation for a matching token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeInvitationRow()] });
    const result = await getInvitationByToken('secure-token-abc');
    expect(result!.token).toBe('secure-token-abc');
  });

  it('returns null for an unknown token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await getInvitationByToken('bad-token')).toBeNull();
  });
});

// ─── validateInvitation ──────────────────────────────────────────────────────

describe('validateInvitation', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns valid=true for a fresh, unaccepted invitation', async () => {
    const row = makeInvitationRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })   // getInvitationByToken
      .mockResolvedValueOnce({ rows: [] });      // no existing user

    const result = await validateInvitation('secure-token-abc');
    expect(result.valid).toBe(true);
    expect(result.invitation).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('returns valid=false when token is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await validateInvitation('bad-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invitation not found');
  });

  it('returns valid=false when invitation is revoked', async () => {
    const row = makeInvitationRow({ is_revoked: true });
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await validateInvitation('token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/revoked/i);
  });

  it('returns valid=false when invitation is already accepted', async () => {
    const row = makeInvitationRow({ accepted_at: new Date('2024-01-05') });
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await validateInvitation('token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already been used/i);
  });

  it('returns valid=false when invitation is expired', async () => {
    const row = makeInvitationRow({
      expires_at: new Date(Date.now() - 60 * 1000), // 1 minute ago
    });
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await validateInvitation('token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it('returns valid=false when a user already exists with the invitation email', async () => {
    const row = makeInvitationRow();
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

    const result = await validateInvitation('secure-token-abc');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already exists/i);
  });
});

// ─── markInvitationAccepted ──────────────────────────────────────────────────

describe('markInvitationAccepted', () => {
  beforeEach(() => mockQuery.mockReset());

  it('executes an UPDATE setting accepted_at and accepted_by', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await markInvitationAccepted('inv-1', 'new-user-id');

    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/accepted_at = NOW\(\)/);
    expect(params).toContain('new-user-id');
    expect(params).toContain('inv-1');
  });
});

// ─── revokeInvitation ────────────────────────────────────────────────────────

describe('revokeInvitation', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the revoked invitation on success', async () => {
    const row = makeInvitationRow({ is_revoked: true, revoked_by: 'admin', revoked_at: new Date() });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await revokeInvitation('inv-1', 'admin');
    expect(result).not.toBeNull();
    expect(result!.isRevoked).toBe(true);
  });

  it('returns null when invitation cannot be revoked (already accepted or already revoked)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await revokeInvitation('inv-already-accepted', 'admin');
    expect(result).toBeNull();
  });
});
