import type { Pool } from 'pg';
import { OpportunityService } from '@modules/opportunities/services/opportunity.service';

const buildStageRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'stage-1',
  organization_id: 'org-1',
  name: 'Prospecting',
  stage_order: 0,
  probability: 10,
  is_closed: false,
  is_won: false,
  is_active: true,
  created_by: 'user-1',
  created_at: '2026-03-03T00:00:00.000Z',
  updated_at: '2026-03-03T00:00:00.000Z',
  ...overrides,
});

const buildOpportunityRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'opp-1',
  organization_id: 'org-1',
  name: 'Major Donor Q2',
  description: 'Opportunity',
  stage_id: 'stage-1',
  stage_name: 'Prospecting',
  stage_order: 0,
  account_id: null,
  account_name: null,
  contact_id: null,
  contact_name: null,
  donation_id: null,
  amount: '1000.00',
  currency: 'USD',
  expected_close_date: null,
  actual_close_date: null,
  status: 'open',
  loss_reason: null,
  source: 'pipeline',
  assigned_to: null,
  assigned_to_name: null,
  created_by: 'user-1',
  created_at: '2026-03-03T00:00:00.000Z',
  updated_at: '2026-03-03T00:00:00.000Z',
  ...overrides,
});

describe('OpportunityService', () => {
  const query = jest.fn();
  const connect = jest.fn();
  const db = { query, connect } as unknown as Pool;
  let service: OpportunityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpportunityService(db);
  });

  it('ensureDefaultStages skips insert when stages already exist', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: '2' }] });

    await service.ensureDefaultStages('org-1', 'user-1');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('COUNT(*)::text');
  });

  it('ensureDefaultStages seeds stages with a single UNNEST insert query', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rowCount: 5, rows: [] });

    await service.ensureDefaultStages('org-1', 'user-1');

    expect(query).toHaveBeenCalledTimes(2);
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('FROM UNNEST');
    expect(sql).toContain('WITH ORDINALITY');
    const typedParams = params as unknown[];
    expect(typedParams[0]).toBe('org-1');
    expect(typedParams[1]).toBe('user-1');
    expect((typedParams[2] as unknown[]).length).toBe(5);
    expect((typedParams[3] as unknown[]).length).toBe(5);
    expect((typedParams[4] as unknown[]).length).toBe(5);
  });

  it('reorderStages rejects payloads that do not include every stage exactly once', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'stage-1' }, { id: 'stage-2' }, { id: 'stage-3' }],
    });

    await expect(
      service.reorderStages('org-1', 'user-1', {
        stage_ids: ['stage-1', 'stage-2'],
      })
    ).rejects.toThrow('Stage reorder payload must include all stages exactly once');
  });

  it('reorderStages applies ordering with a set-based UNNEST update inside a transaction', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'stage-1' }, { id: 'stage-2' }],
    });

    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 2 }) // UPDATE ... FROM UNNEST
      .mockResolvedValueOnce({
        rows: [
          buildStageRow({ id: 'stage-2', stage_order: 0, name: 'Qualified' }),
          buildStageRow({ id: 'stage-1', stage_order: 1, name: 'Prospecting' }),
        ],
      }) // SELECT ordered
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

    const release = jest.fn();
    connect.mockResolvedValueOnce({ query: clientQuery, release });

    const result = await service.reorderStages('org-1', 'user-1', {
      stage_ids: ['stage-2', 'stage-1'],
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('stage-2');
    expect(clientQuery.mock.calls[1][0]).toContain('FROM UNNEST');
    expect(clientQuery.mock.calls[1][0]).toContain('ordinality - 1 AS stage_order');
    expect(clientQuery.mock.calls[1][1]).toEqual(['org-1', 'user-1', ['stage-2', 'stage-1']]);
    expect(release).toHaveBeenCalled();
  });

  it('listOpportunities builds pagination and filtered query response', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({
        rows: [
          buildOpportunityRow({ id: 'opp-1', stage_order: 0 }),
          buildOpportunityRow({ id: 'opp-2', stage_order: 1, name: 'Sponsorship Renewal' }),
        ],
      });

    const result = await service.listOpportunities('org-1', {
      stage_id: 'stage-1',
      status: 'open',
      assigned_to: 'user-1',
      search: 'donor',
      page: 2,
      limit: 2,
    });

    expect(result.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      pages: 2,
    });
    expect(result.data).toHaveLength(2);
    expect(query.mock.calls[1][0]).toContain('ORDER BY st.stage_order ASC, o.updated_at DESC');
  });

  it('createOpportunity uses default stage and records stage history', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'stage-1' }] }) // getDefaultStageId
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ id: 'opp-1' })] }) // insert
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // stage history
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ id: 'opp-1' })] }); // fetch created

    const result = await service.createOpportunity('org-1', 'user-1', {
      name: 'Opportunity A',
      amount: 1000,
    });

    expect(result.id).toBe('opp-1');
    expect(query.mock.calls[0][0]).toContain('FROM opportunity_stages');
    expect(query.mock.calls[2][0]).toContain('INSERT INTO opportunity_stage_history');
  });

  it('updateOpportunity writes stage history when stage_id changes', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'stage-2' }] }) // assert stage in org
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ id: 'opp-1', stage_id: 'stage-1' })] }) // current
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ id: 'opp-1', stage_id: 'stage-2' })] }) // update
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // stage history
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ id: 'opp-1', stage_id: 'stage-2' })] }); // return updated

    const result = await service.updateOpportunity('org-1', 'opp-1', 'user-1', {
      stage_id: 'stage-2',
      status: 'won',
    });

    expect(result?.stage_id).toBe('stage-2');
    expect(query.mock.calls[3][0]).toContain('INSERT INTO opportunity_stage_history');
  });

  it('moveOpportunityStage returns current record when stage remains unchanged', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'stage-1' }] }) // assert stage in org
      .mockResolvedValueOnce({ rows: [buildOpportunityRow({ stage_id: 'stage-1' })] }); // current

    const result = await service.moveOpportunityStage('org-1', 'opp-1', 'user-1', {
      stage_id: 'stage-1',
      notes: 'No-op',
    });

    expect(result?.stage_id).toBe('stage-1');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('getSummary parses numeric aggregates and stage totals', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ total: '10', open: '6', won: '3', lost: '1', weighted_amount: '9123.45' }],
      })
      .mockResolvedValueOnce({
        rows: [{ stage_id: 'stage-1', stage_name: 'Prospecting', count: '2', amount: '500.25' }],
      });

    const summary = await service.getSummary('org-1');

    expect(summary).toEqual({
      total: 10,
      open: 6,
      won: 3,
      lost: 1,
      weighted_amount: 9123.45,
      stage_totals: [{ stage_id: 'stage-1', stage_name: 'Prospecting', count: 2, amount: 500.25 }],
    });
  });
});
