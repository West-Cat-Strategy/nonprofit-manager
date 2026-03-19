import { Pool } from 'pg';

const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { ContactNoteOutcomeImpactService } from '@modules/contacts/services/contactNoteOutcomeImpactService';

describe('ContactNoteOutcomeImpactService', () => {
  let service: InstanceType<typeof ContactNoteOutcomeImpactService>;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    service = new ContactNoteOutcomeImpactService({
      query: mockQuery,
      connect: mockConnect,
    } as unknown as Pool);
  });

  it('saves impacts in replace mode and syncs case outcomes', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();

    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            interaction_id: 'note-1',
            case_id: 'case-1',
            account_id: 'account-1',
            is_portal_visible: true,
            created_at: '2026-03-14T00:00:00.000Z',
            created_by: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'outcome-1',
            key: 'maintained_employment',
            name: 'Maintained employment',
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'impact-1',
            interaction_id: 'note-1',
            outcome_definition_id: 'outcome-1',
            impact: true,
            attribution: 'DIRECT',
            intensity: null,
            evidence_note: null,
            created_by_user_id: 'user-1',
            created_at: '2026-03-14T00:00:00.000Z',
            updated_at: '2026-03-14T00:00:00.000Z',
            outcome_definition: {
              id: 'outcome-1',
              key: 'maintained_employment',
              name: 'Maintained employment',
            },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });

    const result = await service.saveContactNoteOutcomes(
      'note-1',
      {
        mode: 'replace',
        impacts: [{ outcomeDefinitionId: 'outcome-1' }],
      },
      'user-1'
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.outcome_definition_id).toBe('outcome-1');
    expect(clientQuery).toHaveBeenCalledWith('BEGIN');
    expect(
      clientQuery.mock.calls.some(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('INSERT INTO contact_note_outcome_impacts')
      )
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('DELETE FROM contact_note_outcome_impacts')
      )
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO case_outcomes')
      )
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('DELETE FROM case_outcomes') &&
          call[0].includes("source_entity_type = 'contact_note'")
      )
    ).toBe(true);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
  });

  it('saves impacts in merge mode without replace deletions', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();

    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            interaction_id: 'note-1',
            case_id: 'case-1',
            account_id: 'account-1',
            is_portal_visible: false,
            created_at: '2026-03-14T00:00:00.000Z',
            created_by: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'outcome-1',
            key: 'maintained_employment',
            name: 'Maintained employment',
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });

    await service.saveContactNoteOutcomes(
      'note-1',
      {
        mode: 'merge',
        impacts: [{ outcomeDefinitionId: 'outcome-1' }],
      },
      'user-1'
    );

    const deleteImpactCalls = clientQuery.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' && call[0].includes('DELETE FROM contact_note_outcome_impacts')
    );
    const deleteSyncedOutcomeCalls = clientQuery.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('DELETE FROM case_outcomes') &&
        call[0].includes("source_entity_type = 'contact_note'")
    );

    expect(deleteImpactCalls).toHaveLength(0);
    expect(deleteSyncedOutcomeCalls).toHaveLength(0);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects outcome tagging for contact notes without a case link', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();

    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            interaction_id: 'note-1',
            case_id: null,
            account_id: null,
            is_portal_visible: false,
            created_at: '2026-03-14T00:00:00.000Z',
            created_by: 'user-1',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });

    await expect(
      service.saveContactNoteOutcomes(
        'note-1',
        {
          impacts: [{ outcomeDefinitionId: 'outcome-1' }],
        },
        'user-1'
      )
    ).rejects.toThrow('A case-linked contact note is required for outcome tagging');

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalled();
  });
});
