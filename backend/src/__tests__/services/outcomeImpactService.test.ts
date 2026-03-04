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

import { OutcomeImpactService } from '../../services/outcomeImpactService';

describe('OutcomeImpactService', () => {
  let service: OutcomeImpactService;

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnect.mockReset();
    service = new OutcomeImpactService({
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
            interaction_id: 'interaction-1',
            case_id: 'case-1',
            account_id: 'account-1',
            visible_to_client: true,
            created_at: '2026-02-19T00:00:00.000Z',
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
            interaction_id: 'interaction-1',
            outcome_definition_id: 'outcome-1',
            impact: true,
            attribution: 'DIRECT',
            intensity: 3,
            evidence_note: 'Evidence',
            created_by_user_id: 'user-1',
            created_at: '2026-02-19T00:00:00.000Z',
            updated_at: '2026-02-19T00:00:00.000Z',
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

    const result = await service.saveInteractionOutcomes(
      'case-1',
      'interaction-1',
      {
        mode: 'replace',
        impacts: [
          {
            outcomeDefinitionId: 'outcome-1',
            attribution: 'DIRECT',
            intensity: 3,
            evidenceNote: 'Evidence',
          },
        ],
      },
      'user-1'
    );

    expect(result).toHaveLength(1);
    expect(clientQuery).toHaveBeenCalledWith('BEGIN');

    expect(
      clientQuery.mock.calls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('DELETE FROM interaction_outcome_impacts')
      )
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('INSERT INTO case_outcomes')
      )
    ).toBe(true);
    expect(
      clientQuery.mock.calls.some(
        (call) => typeof call[0] === 'string' && call[0].includes('DELETE FROM case_outcomes')
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
            interaction_id: 'interaction-1',
            case_id: 'case-1',
            account_id: 'account-1',
            visible_to_client: false,
            created_at: '2026-02-19T00:00:00.000Z',
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
      .mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });

    await service.saveInteractionOutcomes(
      'case-1',
      'interaction-1',
      {
        mode: 'merge',
        impacts: [{ outcomeDefinitionId: 'outcome-1' }],
      },
      'user-1'
    );

    const deleteInteractionCalls = clientQuery.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('DELETE FROM interaction_outcome_impacts')
    );
    const deleteSyncedCaseOutcomeCalls = clientQuery.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('DELETE FROM case_outcomes') &&
        call[0].includes("entry_source = 'interaction_sync'")
    );

    expect(deleteInteractionCalls).toHaveLength(0);
    expect(deleteSyncedCaseOutcomeCalls).toHaveLength(0);
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('throws when interaction does not belong to case', async () => {
    const clientQuery = jest.fn();
    const release = jest.fn();

    clientQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    mockConnect.mockResolvedValue({ query: clientQuery, release });

    await expect(
      service.saveInteractionOutcomes(
        'case-1',
        'interaction-missing',
        { impacts: [{ outcomeDefinitionId: 'outcome-1' }] },
        'user-1'
      )
    ).rejects.toThrow('Interaction not found for case');

    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalled();
  });
});
