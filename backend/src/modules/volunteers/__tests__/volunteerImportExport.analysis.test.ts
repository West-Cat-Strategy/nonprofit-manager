import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ParsedPeopleImportFile } from '@modules/shared/import/peopleImportParser';
import { lookupScopedAccounts } from '@modules/shared/import/scopedAccountLookup';
import type { Pool } from 'pg';
import { analyzeVolunteerImport } from '../usecases/internal/volunteerImportExport.analysis';

jest.mock('@modules/shared/import/scopedAccountLookup', () => ({
  lookupScopedAccounts: jest.fn(),
}));

const lookupScopedAccountsMock = lookupScopedAccounts as jest.MockedFunction<
  typeof lookupScopedAccounts
>;

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const CONTACT_ID = '22222222-2222-4222-8222-222222222222';
const EXISTING_EMAIL = 'existing@example.com';

const buildParsedFile = ({
  rows,
  mapping,
}: {
  rows: Array<Record<string, string | null>>;
  mapping: Record<string, string>;
}): Pick<ParsedPeopleImportFile, 'dataset' | 'rows' | 'mapping' | 'warnings'> => ({
  dataset: { meta: { hasHeader: true } } as ParsedPeopleImportFile['dataset'],
  rows,
  mapping,
  warnings: [],
});

describe('analyzeVolunteerImport', () => {
  let mockQuery: jest.Mock;
  let pool: Pick<Pool, 'query'>;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = { query: mockQuery } as Pick<Pool, 'query'>;
    lookupScopedAccountsMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('plans the mixed existing-contact/new-volunteer path without forcing an account rewrite', async () => {
    lookupScopedAccountsMock.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce({
      rows: [{ volunteer_id: null, contact_id: CONTACT_ID, email: EXISTING_EMAIL }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const analysis = await analyzeVolunteerImport(
      buildParsedFile({
        mapping: {
          email: 'email',
          first_name: 'first_name',
          last_name: 'last_name',
          skills: 'skills',
        },
        rows: [
          {
            email: EXISTING_EMAIL,
            first_name: 'Existing',
            last_name: 'Contact',
            skills: 'Driving',
          },
        ],
      }),
      ORGANIZATION_ID,
      undefined,
      pool
    );

    expect(analysis.rowErrors).toEqual([]);
    expect(analysis.toCreate).toBe(1);
    expect(analysis.toUpdate).toBe(0);
    expect(analysis.actions).toHaveLength(1);
    expect(analysis.actions[0]).toMatchObject({
      contactId: CONTACT_ID,
      volunteerId: undefined,
      contactAction: 'update',
      volunteerAction: 'create',
      resolvedAccountId: undefined,
    });
  });

  it('defaults mapped blank account references back to the active organization', async () => {
    lookupScopedAccountsMock.mockResolvedValueOnce([]);
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const analysis = await analyzeVolunteerImport(
      buildParsedFile({
        mapping: {
          account_number: 'account_number',
          first_name: 'first_name',
          last_name: 'last_name',
          email: 'email',
          skills: 'skills',
        },
        rows: [
          {
            account_number: null,
            first_name: 'New',
            last_name: 'Volunteer',
            email: 'new@example.com',
            skills: 'Support',
          },
        ],
      }),
      ORGANIZATION_ID,
      undefined,
      pool
    );

    expect(analysis.rowErrors).toEqual([]);
    expect(analysis.actions).toHaveLength(1);
    expect(analysis.actions[0]).toMatchObject({
      contactAction: 'create',
      volunteerAction: 'create',
      resolvedAccountId: ORGANIZATION_ID,
    });
  });
});
