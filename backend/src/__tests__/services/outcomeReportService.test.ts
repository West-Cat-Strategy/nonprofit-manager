import { Pool } from 'pg';

const mockQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

import { OutcomeReportService } from '../../services/outcomeReportService';

describe('OutcomeReportService', () => {
  let service: OutcomeReportService;

  beforeEach(() => {
    mockQuery.mockReset();
    service = new OutcomeReportService({ query: mockQuery } as unknown as Pool);
  });

  it('returns totals and timeseries with reportable filter by default', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            outcome_definition_id: 'outcome-1',
            key: 'maintained_employment',
            name: 'Maintained employment',
            count_impacts: 4,
            unique_clients_impacted: 2,
            sort_order: 10,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            bucket_start: '2026-01-01',
            outcome_definition_id: 'outcome-1',
            count_impacts: 2,
            sort_order: 10,
          },
        ],
      });

    const result = await service.getOutcomesReport(
      {
        from: '2026-01-01',
        to: '2026-01-31',
        bucket: 'week',
      },
      false
    );

    expect(result.totalsByOutcome[0]).toEqual({
      outcomeDefinitionId: 'outcome-1',
      key: 'maintained_employment',
      name: 'Maintained employment',
      countImpacts: 4,
      uniqueClientsImpacted: 2,
    });
    expect(result.timeseries[0]).toEqual({
      bucketStart: '2026-01-01',
      outcomeDefinitionId: 'outcome-1',
      countImpacts: 2,
    });

    const totalsSql = mockQuery.mock.calls[0][0] as string;
    const timeseriesSql = mockQuery.mock.calls[1][0] as string;
    expect(totalsSql).toContain('od.is_reportable = true');
    expect(timeseriesSql).toContain("date_trunc('week'");
  });

  it('supports includeNonReportable for admins and applies optional filters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await service.getOutcomesReport(
      {
        from: '2026-01-01',
        to: '2026-01-31',
        bucket: 'month',
        includeNonReportable: true,
        staffId: 'user-1',
        interactionType: 'meeting',
      },
      true
    );

    const totalsSql = mockQuery.mock.calls[0][0] as string;
    const totalsValues = mockQuery.mock.calls[0][1] as unknown[];
    const timeseriesSql = mockQuery.mock.calls[1][0] as string;

    expect(totalsSql).not.toContain('od.is_reportable = true');
    expect(totalsSql).toContain('cn.created_by = $3');
    expect(totalsSql).toContain('cn.note_type = $4');
    expect(timeseriesSql).toContain("date_trunc('month'");
    expect(totalsValues).toEqual(['2026-01-01', '2026-01-31', 'user-1', 'meeting']);
  });
});
