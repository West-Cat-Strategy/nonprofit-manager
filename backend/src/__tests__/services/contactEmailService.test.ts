// Mock database pool and logger before imports
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
  getContactEmails,
  getContactEmailById,
  createContactEmail,
  updateContactEmail,
  deleteContactEmail,
  getPrimaryEmail,
} from '../../services/contactEmailService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEmailRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'email-uuid',
  contact_id: 'contact-1',
  email_address: 'jane@example.com',
  label: 'personal',
  is_primary: false,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

// ─── getContactEmails ─────────────────────────────────────────────────────────

describe('getContactEmails', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns all email addresses for a contact', async () => {
    const rows = [makeEmailRow(), makeEmailRow({ id: 'email-2', is_primary: true })];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getContactEmails('contact-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('email-uuid');
  });

  it('passes the contactId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getContactEmails('contact-abc');
    expect(mockQuery.mock.calls[0][1]).toEqual(['contact-abc']);
  });

  it('returns an empty array when there are no emails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getContactEmails('contact-no-emails');
    expect(result).toHaveLength(0);
  });

  it('throws a user-friendly error on query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(getContactEmails('contact-1')).rejects.toThrow(
      'Failed to retrieve contact email addresses'
    );
  });
});

// ─── getContactEmailById ──────────────────────────────────────────────────────

describe('getContactEmailById', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the email when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    const result = await getContactEmailById('email-uuid');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('email-uuid');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getContactEmailById('nonexistent');
    expect(result).toBeNull();
  });

  it('scopes the query to the email ID', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getContactEmailById('email-xyz');
    expect(mockQuery.mock.calls[0][1]).toEqual(['email-xyz']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout'));

    await expect(getContactEmailById('email-1')).rejects.toThrow(
      'Failed to retrieve contact email address'
    );
  });
});

// ─── createContactEmail ───────────────────────────────────────────────────────

describe('createContactEmail', () => {
  beforeEach(() => mockQuery.mockReset());

  it('inserts an email and returns the created row', async () => {
    const row = makeEmailRow({ email_address: 'work@example.com' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await createContactEmail(
      'contact-1',
      { email_address: 'work@example.com' },
      'user-1'
    );

    expect(result.email_address).toBe('work@example.com');
  });

  it('passes contactId as first param and userId as fifth param', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    await createContactEmail('contact-abc', { email_address: 'test@example.com' }, 'user-xyz');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe('contact-abc');  // contactId
    expect(params[4]).toBe('user-xyz');      // userId (used twice as $5)
  });

  it('defaults label to "personal" when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    await createContactEmail('contact-1', { email_address: 'test@example.com' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe('personal');  // label
  });

  it('defaults is_primary to false when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    await createContactEmail('contact-1', { email_address: 'test@example.com' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[3]).toBe(false);  // is_primary
  });

  it('throws a duplicate error when email already exists (PG code 23505)', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(duplicateError);

    await expect(
      createContactEmail('contact-1', { email_address: 'existing@example.com' }, 'user-1')
    ).rejects.toThrow('This email address already exists for this contact');
  });

  it('throws a generic error on other failures', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Constraint violation'));

    await expect(
      createContactEmail('contact-1', { email_address: 'test@example.com' }, 'user-1')
    ).rejects.toThrow('Failed to create contact email address');
  });
});

// ─── updateContactEmail ───────────────────────────────────────────────────────

describe('updateContactEmail', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the updated row on success', async () => {
    const row = makeEmailRow({ email_address: 'new@example.com' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await updateContactEmail(
      'email-uuid',
      { email_address: 'new@example.com' },
      'user-1'
    );

    expect(result).not.toBeNull();
    expect(result!.email_address).toBe('new@example.com');
  });

  it('returns null when no row matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await updateContactEmail('nonexistent', { email_address: 'x@y.com' }, 'user-1');
    expect(result).toBeNull();
  });

  it('builds SET clause only for provided fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    await updateContactEmail('email-uuid', { is_primary: true }, 'user-1');

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/is_primary/);
    expect(sql).not.toMatch(/email_address = /);  // table name also contains "email_address"
    expect(sql).not.toMatch(/label = /);
  });

  it('always appends modified_by to the SET clause', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeEmailRow()] });

    await updateContactEmail('email-uuid', { label: 'work' }, 'editor-user');

    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/modified_by/);
    expect(params).toContain('editor-user');
  });

  it('throws when no fields are provided to update', async () => {
    await expect(updateContactEmail('email-uuid', {}, 'user-1')).rejects.toThrow(
      'Failed to update contact email address'
    );
  });

  it('throws a duplicate error on PG code 23505', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(duplicateError);

    await expect(
      updateContactEmail('email-uuid', { email_address: 'taken@example.com' }, 'user-1')
    ).rejects.toThrow('This email address already exists for this contact');
  });
});

// ─── deleteContactEmail ───────────────────────────────────────────────────────

describe('deleteContactEmail', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns true when the email was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'email-uuid' }] });

    const result = await deleteContactEmail('email-uuid');
    expect(result).toBe(true);
  });

  it('returns false when no email matched', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await deleteContactEmail('nonexistent');
    expect(result).toBe(false);
  });

  it('passes the emailId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'email-123' }] });

    await deleteContactEmail('email-123');
    expect(mockQuery.mock.calls[0][1]).toEqual(['email-123']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('FK constraint'));

    await expect(deleteContactEmail('email-1')).rejects.toThrow(
      'Failed to delete contact email address'
    );
  });
});

// ─── getPrimaryEmail ──────────────────────────────────────────────────────────

describe('getPrimaryEmail', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the primary email when found', async () => {
    const row = makeEmailRow({ is_primary: true });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await getPrimaryEmail('contact-1');
    expect(result).not.toBeNull();
    expect(result!.is_primary).toBe(true);
  });

  it('returns null when no primary email exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getPrimaryEmail('contact-no-primary');
    expect(result).toBeNull();
  });

  it('filters by contactId and is_primary=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getPrimaryEmail('contact-abc');

    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/is_primary = true/);
    expect(params).toEqual(['contact-abc']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(getPrimaryEmail('contact-1')).rejects.toThrow('Failed to retrieve primary email');
  });
});
