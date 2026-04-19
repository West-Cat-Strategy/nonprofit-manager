import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Pool } from 'pg';
import { decrypt } from '@utils/encryption';
import { ContactImportExportUseCase } from '../usecases/contactImportExport.usecase';

jest.mock('@utils/encryption', () => ({
  encrypt: jest.fn((value: string) => `enc:${value}`),
  decrypt: jest.fn(),
}));

const decryptMock = decrypt as jest.MockedFunction<typeof decrypt>;

const buildExportRow = (overrides: Record<string, unknown> = {}) => ({
  contact_id: 'contact-1',
  account_id: 'account-1',
  account_number: 'ACC-1',
  account_name: 'Test Org',
  first_name: 'Jane',
  preferred_name: null,
  last_name: 'Doe',
  middle_name: null,
  salutation: null,
  suffix: null,
  birth_date: '1990-01-01',
  gender: null,
  pronouns: null,
  phn_encrypted: 'enc:1234567890',
  email: 'jane@example.com',
  phone: null,
  mobile_phone: null,
  job_title: null,
  department: null,
  preferred_contact_method: null,
  do_not_email: false,
  do_not_phone: false,
  do_not_text: false,
  do_not_voicemail: false,
  address_line1: null,
  address_line2: null,
  city: null,
  state_province: null,
  postal_code: null,
  country: null,
  no_fixed_address: false,
  notes: null,
  tags: [],
  roles: [],
  is_active: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('ContactImportExportUseCase exportContacts', () => {
  let mockQuery: jest.Mock;
  let useCase: ContactImportExportUseCase;

  beforeEach(() => {
    mockQuery = jest.fn();
    useCase = new ContactImportExportUseCase({ query: mockQuery } as unknown as Pool);
    decryptMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('omits the PHN column from default exports to avoid destructive blank round-trips', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [buildExportRow()],
    });

    const file = await useCase.exportContacts({ format: 'csv' }, 'account-1');
    const csv = file.buffer.toString('utf8');
    const [header] = csv.split('\n');

    expect(header).not.toContain('phn');
    expect(decryptMock).not.toHaveBeenCalled();
  });

  it('includes decrypted PHN when a privileged export explicitly requests the column', async () => {
    decryptMock.mockReturnValueOnce('1234567890');
    mockQuery.mockResolvedValueOnce({
      rows: [
        buildExportRow({
          first_name: 'Privileged',
          email: 'privileged@example.com',
        }),
      ],
    });

    const file = await useCase.exportContacts(
      { format: 'csv', columns: ['first_name', 'phn'] },
      'account-1',
      undefined,
      'staff'
    );
    const csv = file.buffer.toString('utf8');
    const [header, dataRow] = csv.split('\n');

    expect(header).toContain('phn');
    expect(dataRow).toContain('1234567890');
    expect(decryptMock).toHaveBeenCalledWith('enc:1234567890');
  });

  it('ignores explicit PHN requests for non-privileged exports', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [buildExportRow()],
    });

    const file = await useCase.exportContacts(
      { format: 'csv', columns: ['first_name', 'phn'] },
      'account-1',
      undefined,
      'volunteer'
    );
    const csv = file.buffer.toString('utf8');
    const [header] = csv.split('\n');

    expect(header).not.toContain('phn');
    expect(decryptMock).not.toHaveBeenCalled();
  });
});
