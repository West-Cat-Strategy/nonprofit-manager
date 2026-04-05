import type { Pool } from 'pg';
import type { CaseProvenance } from '@app-types/case';
import { getCaseByIdQuery, getCaseSummaryQuery, getCasesQuery } from '../catalogQueries';

const importedProvenance: CaseProvenance = {
  system: 'imported',
  cluster_id: 'cluster-1',
  primary_label: 'Imported Case',
  record_type: 'case_note',
  source_tables: ['contact_log', 'case_note'],
  source_files: ['westcat.csv'],
  source_role_breakdown: [
    {
      source_role: 'primary_case',
      source_tables: ['contact_log'],
      source_row_count: 1,
      source_row_ids: ['contact_log:1'],
    },
  ],
  participant_ids: ['contact-1'],
  source_row_ids: ['contact_log:1'],
  source_row_count: 1,
  source_table_count: 2,
  source_file_count: 1,
  source_type_breakdown: ['contact_log', 'case_note'],
  link_confidence: 0.88,
  confidence_label: 'medium',
  is_low_confidence: false,
};

describe('catalogQueries', () => {
  it('returns canonical case list rows with provenance and imported-only filtering', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          total_count: '1',
          id: 'case-1',
          case_number: 'CASE-001',
          case_type_id: 'type-primary',
          case_type_ids: ['type-primary', 'type-secondary'],
          case_type_names: ['Housing', 'Legal'],
          case_outcome_values: ['successful', 'referred'],
          custom_data: { import_provenance: importedProvenance },
        },
      ],
    });
    const db = { query } as unknown as Pool;

    const result = await getCasesQuery(db, {
      organizationId: 'org-1',
      imported_only: true,
      quick_filter: 'urgent',
    });

    expect(result.total).toBe(1);
    expect(result.cases[0]).toMatchObject({
      id: 'case-1',
      case_type_ids: ['type-primary', 'type-secondary'],
      case_type_names: ['Housing', 'Legal'],
      case_outcome_values: ['successful', 'referred'],
      provenance: importedProvenance,
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("COALESCE(c.custom_data ? 'import_provenance', false)");
    expect(sql).toContain("c.priority IN ('urgent', 'critical')");
    expect(params).toContain('org-1');
  });

  it('returns canonical case detail rows with provenance', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'case-1',
          case_number: 'CASE-001',
          case_type_id: 'type-primary',
          case_type_ids: ['type-primary'],
          case_type_names: ['Housing'],
          case_outcome_values: ['successful'],
          custom_data: { import_provenance: importedProvenance },
        },
      ],
    });
    const db = { query } as unknown as Pool;

    const result = await getCaseByIdQuery(db, 'case-1', 'org-1');

    expect(result).toMatchObject({
      id: 'case-1',
      case_type_ids: ['type-primary'],
      case_type_names: ['Housing'],
      case_outcome_values: ['successful'],
      provenance: importedProvenance,
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('case_type_ids');
    expect(sql).toContain('case_outcome_values');
    expect(params).toEqual(['case-1', 'org-1']);
  });

  it('merges type and outcome summary counts from the normalized query shape', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            total_cases: '2',
            open_cases: '1',
            closed_cases: '1',
            priority_low: '0',
            priority_medium: '1',
            priority_high: '0',
            priority_urgent: '1',
            status_intake: '1',
            status_active: '0',
            status_review: '1',
            status_closed: '1',
            status_cancelled: '0',
            due_this_week: '1',
            overdue: '0',
            unassigned: '1',
            avg_duration: '3.2',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { case_type_name: 'Housing', count: '2' },
          { case_type_name: 'Legal', count: '1' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { case_outcome_value: 'successful', count: '1' },
          { case_outcome_value: 'referred', count: '2' },
        ],
      });
    const db = { query } as unknown as Pool;

    const result = await getCaseSummaryQuery(db, 'org-1');

    expect(result).toMatchObject({
      total_cases: 2,
      open_cases: 1,
      closed_cases: 1,
      by_priority: {
        low: 0,
        medium: 1,
        high: 0,
        urgent: 1,
      },
      by_status_type: {
        intake: 1,
        active: 0,
        review: 1,
        closed: 1,
        cancelled: 0,
      },
      by_case_type: {
        Housing: 2,
        Legal: 1,
      },
      by_case_outcome: {
        successful: 1,
        referred: 2,
      },
      average_case_duration_days: 3,
      cases_due_this_week: 1,
      overdue_cases: 0,
      unassigned_cases: 1,
    });

    expect(query).toHaveBeenCalledTimes(3);
    expect((query.mock.calls[1][0] as string)).toContain('case_type_name');
    expect((query.mock.calls[2][0] as string)).toContain('case_outcome_value');
  });
});
