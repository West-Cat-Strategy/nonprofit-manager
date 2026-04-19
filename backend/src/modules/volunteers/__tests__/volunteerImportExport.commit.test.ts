import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Pool, PoolClient } from 'pg';
import type { VolunteerImportAnalysisResult } from '../usecases/volunteerImportExport.types';
import { commitVolunteerImport } from '../usecases/internal/volunteerImportExport.commit';
import {
  insertImportedVolunteer,
  updateImportedVolunteer,
} from '../usecases/internal/volunteerImportExport.volunteerPersistence';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const CONTACT_ID = '22222222-2222-4222-8222-222222222222';
const VOLUNTEER_ID = '33333333-3333-4333-8333-333333333333';
const NEW_VOLUNTEER_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';

const buildAnalysis = (
  overrides: Partial<VolunteerImportAnalysisResult['actions'][number]> = {}
): VolunteerImportAnalysisResult => ({
  actions: [
    {
      rowNumber: 2,
      volunteerId: VOLUNTEER_ID,
      contactId: CONTACT_ID,
      contactAction: 'update',
      volunteerAction: 'update',
      contactPayload: { first_name: 'Jane' },
      volunteerPayload: { skills: ['Support'] },
      resolvedAccountId: undefined,
      ...overrides,
    },
  ],
  toCreate: overrides.volunteerAction === 'create' ? 1 : 0,
  toUpdate: overrides.volunteerAction === 'create' ? 0 : 1,
  totalRows: 1,
  rowErrors: [],
  warnings: [],
});

describe('commitVolunteerImport', () => {
  let clientQuery: jest.Mock;
  let release: jest.Mock;
  let connect: jest.Mock;
  let pool: Pick<Pool, 'connect'>;

  beforeEach(() => {
    clientQuery = jest.fn().mockResolvedValue({ rows: [] });
    release = jest.fn();
    connect = jest.fn().mockResolvedValue({
      query: clientQuery,
      release,
    } as unknown as PoolClient);
    pool = { connect } as Pick<Pool, 'connect'>;
  });

  it('rejects commit plans that still have row errors before opening a transaction', async () => {
    const rowErrors = [{ row_number: 2, messages: ['Broken row'] }];

    await expect(
      commitVolunteerImport({
        pool,
        analysis: { ...buildAnalysis(), rowErrors },
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      details: { row_errors: rowErrors },
    });

    expect(connect).not.toHaveBeenCalled();
  });

  it('skips destructive role sync when roles were not mapped on contact updates', async () => {
    const updateContact = jest.fn().mockResolvedValue(undefined);
    const syncRoles = jest.fn().mockResolvedValue(undefined);
    const updateVolunteer = jest.fn().mockResolvedValue(undefined);

    const result = await commitVolunteerImport({
      pool,
      analysis: buildAnalysis(),
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      updateContact,
      syncRoles,
      updateVolunteer,
    });

    expect(syncRoles).not.toHaveBeenCalled();
    expect(updateContact).toHaveBeenCalledWith(
      expect.anything(),
      CONTACT_ID,
      expect.objectContaining({ first_name: 'Jane' }),
      undefined,
      USER_ID
    );
    expect(updateVolunteer).toHaveBeenCalledWith(
      expect.anything(),
      VOLUNTEER_ID,
      expect.objectContaining({ skills: ['Support'] }),
      USER_ID
    );
    expect(clientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(clientQuery).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(release).toHaveBeenCalled();
    expect(result).toEqual({
      created: 0,
      updated: 1,
      total_processed: 1,
      affected_ids: [VOLUNTEER_ID],
    });
  });

  it('preserves the existing-contact/new-volunteer commit path', async () => {
    const insertContact = jest.fn().mockResolvedValue('should-not-run');
    const updateContact = jest.fn().mockResolvedValue(undefined);
    const insertVolunteer = jest.fn().mockResolvedValue(NEW_VOLUNTEER_ID);

    const result = await commitVolunteerImport({
      pool,
      analysis: buildAnalysis({
        volunteerId: undefined,
        volunteerAction: 'create',
      }),
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      insertContact,
      updateContact,
      insertVolunteer,
    });

    expect(insertContact).not.toHaveBeenCalled();
    expect(updateContact).toHaveBeenCalledWith(
      expect.anything(),
      CONTACT_ID,
      expect.objectContaining({ first_name: 'Jane' }),
      undefined,
      USER_ID
    );
    expect(insertVolunteer).toHaveBeenCalledWith(
      expect.anything(),
      CONTACT_ID,
      expect.objectContaining({ skills: ['Support'] }),
      USER_ID
    );
    expect(result).toEqual({
      created: 1,
      updated: 0,
      total_processed: 1,
      affected_ids: [NEW_VOLUNTEER_ID],
    });
  });
});

describe('volunteer import volunteer persistence', () => {
  let clientQuery: jest.Mock;
  let client: Pick<PoolClient, 'query'>;

  beforeEach(() => {
    clientQuery = jest.fn();
    client = { query: clientQuery } as Pick<PoolClient, 'query'>;
  });

  it('dual-writes availability status and notes during volunteer inserts', async () => {
    clientQuery.mockResolvedValueOnce({
      rows: [{ volunteer_id: VOLUNTEER_ID }],
    });

    await insertImportedVolunteer(
      client as PoolClient,
      CONTACT_ID,
      {
        availability_status: 'limited',
        availability_notes: 'Weekends only',
      },
      USER_ID
    );

    const [sql, params] = clientQuery.mock.calls[0];

    expect(sql).toContain('volunteer_status');
    expect(sql).toContain('availability_status');
    expect(sql).toContain('availability_notes');
    expect(params[1]).toBe('limited');
    expect(params[3]).toBe('Weekends only');
    expect(params[9]).toBe('limited');
    expect(params[10]).toBe('Weekends only');
  });

  it('dual-writes availability status and notes during volunteer updates', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [] });

    await updateImportedVolunteer(
      client as PoolClient,
      VOLUNTEER_ID,
      {
        availability_status: 'unavailable',
        availability_notes: 'On leave',
      },
      USER_ID
    );

    const [sql, params] = clientQuery.mock.calls[0];

    expect(sql).toContain('volunteer_status = $1');
    expect(sql).toContain('availability_status = $2');
    expect(sql).toContain('availability = $3');
    expect(sql).toContain('availability_notes = $4');
    expect(params[0]).toBe('unavailable');
    expect(params[1]).toBe('unavailable');
    expect(params[2]).toBe('On leave');
    expect(params[3]).toBe('On leave');
    expect(params[params.length - 1]).toBe(VOLUNTEER_ID);
  });
});
