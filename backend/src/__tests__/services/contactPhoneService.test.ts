// Mock database pool and logger before imports
const mockQuery = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('@config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/contactMethodSyncService', () => ({
  syncContactMethodSummaries: jest.fn().mockResolvedValue(undefined),
}));

import {
  CONTACT_PHONE_DUPLICATE_ERROR_CODE,
  getContactPhones,
  getContactPhoneById,
  createContactPhone,
  updateContactPhone,
  deleteContactPhone,
  getPrimaryPhone,
} from '../../modules/contacts/repositories/contactPhonesRepository';
import { syncContactMethodSummaries } from '@services/contactMethodSyncService';

const makePhoneRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'phone-uuid',
  contact_id: 'contact-1',
  phone_number: '555-123-4567',
  label: 'other',
  is_primary: false,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

describe('getContactPhones', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns all phone numbers for a contact', async () => {
    const rows = [makePhoneRow(), makePhoneRow({ id: 'phone-2', is_primary: true })];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getContactPhones('contact-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('phone-uuid');
  });

  it('passes the contactId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getContactPhones('contact-abc');
    expect(mockQuery.mock.calls[0][1]).toEqual(['contact-abc']);
  });

  it('returns an empty array when there are no phones', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getContactPhones('contact-no-phones');
    expect(result).toHaveLength(0);
  });

  it('throws a user-friendly error on query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(getContactPhones('contact-1')).rejects.toThrow(
      'Failed to retrieve contact phone numbers'
    );
  });
});

describe('getContactPhoneById', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the phone when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow()] });

    const result = await getContactPhoneById('phone-uuid');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('phone-uuid');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getContactPhoneById('nonexistent');
    expect(result).toBeNull();
  });

  it('scopes the query to the phone ID', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getContactPhoneById('phone-xyz');
    expect(mockQuery.mock.calls[0][1]).toEqual(['phone-xyz']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout'));

    await expect(getContactPhoneById('phone-1')).rejects.toThrow(
      'Failed to retrieve contact phone number'
    );
  });
});

describe('createContactPhone', () => {
  beforeEach(() => mockQuery.mockReset());

  it('inserts a phone and returns the created row', async () => {
    const row = makePhoneRow({ phone_number: '555-111-2222' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await createContactPhone(
      'contact-1',
      { phone_number: '555-111-2222' },
      'user-1'
    );

    expect(result.phone_number).toBe('555-111-2222');
    expect(syncContactMethodSummaries).toHaveBeenCalledWith('contact-1');
  });

  it('defaults label to "other" when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow()] });

    await createContactPhone('contact-1', { phone_number: '555-111-2222' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[2]).toBe('other');
  });

  it('defaults is_primary to false when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow()] });

    await createContactPhone('contact-1', { phone_number: '555-111-2222' }, 'user-1');

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[3]).toBe(false);
  });

  it('throws a stable duplicate error on PG code 23505', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(duplicateError);

    await expect(
      createContactPhone('contact-1', { phone_number: '555-111-2222' }, 'user-1')
    ).rejects.toMatchObject({
      message: 'This phone number already exists for this contact',
      code: CONTACT_PHONE_DUPLICATE_ERROR_CODE,
    });
  });

  it('throws a generic error on other failures', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Constraint violation'));

    await expect(
      createContactPhone('contact-1', { phone_number: '555-111-2222' }, 'user-1')
    ).rejects.toThrow('Failed to create contact phone number');
  });
});

describe('updateContactPhone', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the updated row on success', async () => {
    const row = makePhoneRow({ phone_number: '555-999-0000' });
    mockQuery.mockResolvedValueOnce({ rows: [row] });

    const result = await updateContactPhone(
      'phone-uuid',
      { phone_number: '555-999-0000' },
      'user-1'
    );

    expect(result).not.toBeNull();
    expect(result!.phone_number).toBe('555-999-0000');
    expect(syncContactMethodSummaries).toHaveBeenCalledWith('contact-1');
  });

  it('returns null when no row matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await updateContactPhone('missing', { phone_number: '555-999-0000' }, 'user-1');
    expect(result).toBeNull();
  });

  it('builds SET clause only for provided fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow()] });

    await updateContactPhone('phone-uuid', { is_primary: true }, 'user-1');

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toMatch(/is_primary/);
    expect(sql).not.toMatch(/phone_number = /);
    expect(sql).not.toMatch(/label = /);
  });

  it('always appends modified_by to the SET clause', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow()] });

    await updateContactPhone('phone-uuid', { label: 'home' }, 'editor-user');

    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/modified_by/);
    expect(params).toContain('editor-user');
  });

  it('throws when no fields are provided to update', async () => {
    await expect(updateContactPhone('phone-uuid', {}, 'user-1')).rejects.toThrow(
      'Failed to update contact phone number'
    );
  });

  it('throws a stable duplicate error on PG code 23505', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockQuery.mockRejectedValueOnce(duplicateError);

    await expect(
      updateContactPhone('phone-uuid', { phone_number: '555-111-2222' }, 'user-1')
    ).rejects.toMatchObject({
      message: 'This phone number already exists for this contact',
      code: CONTACT_PHONE_DUPLICATE_ERROR_CODE,
    });
  });

  it('throws a generic error on other failures', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Constraint violation'));

    await expect(
      updateContactPhone('phone-uuid', { phone_number: '555-111-2222' }, 'user-1')
    ).rejects.toThrow('Failed to update contact phone number');
  });
});

describe('deleteContactPhone', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns true when the phone was deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'phone-uuid', contact_id: 'contact-1' }] });

    const result = await deleteContactPhone('phone-uuid');
    expect(result).toBe(true);
    expect(syncContactMethodSummaries).toHaveBeenCalledWith('contact-1');
  });

  it('returns false when no phone matched', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await deleteContactPhone('missing');
    expect(result).toBe(false);
  });

  it('passes the phoneId as the query parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'phone-123', contact_id: 'contact-1' }] });

    await deleteContactPhone('phone-123');
    expect(mockQuery.mock.calls[0][1]).toEqual(['phone-123']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('FK constraint'));

    await expect(deleteContactPhone('phone-1')).rejects.toThrow(
      'Failed to delete contact phone number'
    );
  });
});

describe('getPrimaryPhone', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns the primary phone when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makePhoneRow({ is_primary: true })] });

    const result = await getPrimaryPhone('contact-1');
    expect(result).not.toBeNull();
    expect(result!.is_primary).toBe(true);
  });

  it('returns null when no primary phone exists', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getPrimaryPhone('contact-no-primary');
    expect(result).toBeNull();
  });

  it('filters by contactId and is_primary=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getPrimaryPhone('contact-abc');

    const sql = mockQuery.mock.calls[0][0] as string;
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(sql).toMatch(/is_primary = true/);
    expect(params).toEqual(['contact-abc']);
  });

  it('throws a user-friendly error on failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(getPrimaryPhone('contact-1')).rejects.toThrow('Failed to retrieve primary phone');
  });
});
