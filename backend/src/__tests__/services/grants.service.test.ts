import { Pool, type PoolClient } from 'pg';
import { deleteCachedPattern, getCached, setCached } from '@config/redis';
import { GrantsService } from '@modules/grants/services/grants.service';

jest.mock('@config/redis', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(true),
  deleteCachedPattern: jest.fn().mockResolvedValue(1),
}));

const mockGetCached = getCached as jest.MockedFunction<typeof getCached>;
const mockSetCached = setCached as jest.MockedFunction<typeof setCached>;
const mockDeleteCachedPattern = deleteCachedPattern as jest.MockedFunction<
  typeof deleteCachedPattern
>;

const now = new Date('2026-04-16T00:00:00.000Z');

const makeApplicationRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'application-1',
  organization_id: 'org-1',
  application_number: 'APP-2026-0001',
  title: 'Community Grant',
  funder_id: 'funder-1',
  funder_name: 'Alpha Funder',
  program_id: null,
  program_name: null,
  recipient_organization_id: null,
  recipient_name: null,
  funded_program_id: null,
  funded_program_name: null,
  grant_id: null,
  status: 'draft',
  requested_amount: '2500',
  approved_amount: null,
  currency: 'CAD',
  submitted_at: null,
  reviewed_at: null,
  decision_at: null,
  due_at: now,
  outcome_reason: null,
  notes: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: now,
  updated_at: now,
  ...overrides,
});

const makeGrantRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'grant-1',
  organization_id: 'org-1',
  grant_number: 'GRT-2026-0001',
  title: 'Community Grant',
  application_id: null,
  funder_id: 'funder-1',
  funder_name: 'Alpha Funder',
  program_id: null,
  program_name: null,
  recipient_organization_id: null,
  recipient_name: null,
  funded_program_id: null,
  funded_program_name: null,
  status: 'active',
  amount: '5000',
  committed_amount: '5000',
  disbursed_amount: '0',
  currency: 'CAD',
  fiscal_year: '2026',
  jurisdiction: 'federal',
  award_date: now,
  start_date: null,
  end_date: null,
  expiry_date: null,
  reporting_frequency: null,
  next_report_due_at: null,
  closeout_due_at: null,
  notes: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: now,
  updated_at: now,
  outstanding_amount: '5000',
  report_count: '0',
  disbursement_count: '0',
  ...overrides,
});

const makeDisbursementRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'disbursement-1',
  organization_id: 'org-1',
  grant_id: 'grant-1',
  grant_number: 'GRT-2026-0001',
  grant_title: 'Community Grant',
  tranche_label: 'Initial',
  scheduled_date: now,
  paid_at: null,
  amount: '1000',
  currency: 'CAD',
  status: 'scheduled',
  method: 'eft',
  notes: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: now,
  updated_at: now,
  ...overrides,
});

const makeReportRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'report-1',
  organization_id: 'org-1',
  grant_id: 'grant-1',
  grant_number: 'GRT-2026-0001',
  grant_title: 'Community Grant',
  report_type: 'progress',
  period_start: null,
  period_end: null,
  due_at: now,
  submitted_at: null,
  status: 'due',
  summary: null,
  outstanding_items: null,
  notes: null,
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: now,
  updated_at: now,
  ...overrides,
});

const makeDocumentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'document-1',
  organization_id: 'org-1',
  grant_id: 'grant-1',
  application_id: null,
  report_id: null,
  document_type: 'supporting_material',
  file_name: 'attachment.pdf',
  file_url: 'https://example.com/attachment.pdf',
  mime_type: 'application/pdf',
  file_size: '2048',
  notes: null,
  uploaded_by: 'user-1',
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: now,
  updated_at: now,
  ...overrides,
});

const makeActivityRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'activity-1',
  organization_id: 'org-1',
  grant_id: 'grant-1',
  entity_type: 'award',
  entity_id: 'grant-1',
  action: 'created',
  notes: 'Created grant GRT-2026-0001',
  metadata: { grant_id: 'grant-1' },
  created_by: 'user-1',
  created_at: now,
  grant_number: 'GRT-2026-0001',
  grant_title: 'Community Grant',
  ...overrides,
});

const makeCalendarRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'calendar-1',
  grant_id: 'grant-1',
  grant_number: 'GRT-2026-0001',
  grant_title: 'Community Grant',
  item_type: 'report',
  status: 'due',
  due_at: now,
  amount: null,
  recipient_name: 'Neighborhood Mutual Aid',
  program_name: 'Capital Program',
  ...overrides,
});

const makeClient = (): jest.Mocked<Pick<PoolClient, 'query' | 'release'>> =>
  ({
    query: jest.fn(),
    release: jest.fn(),
  }) as jest.Mocked<Pick<PoolClient, 'query' | 'release'>>;

const createSummaryQueryImplementation = () => (query: string) => {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  if (normalizedQuery.includes('SELECT COUNT(*)::text AS count FROM grant_funders')) {
    return Promise.resolve({ rows: [{ count: '2' }] });
  }

  if (normalizedQuery.includes('SELECT COUNT(*)::text AS count FROM grant_programs')) {
    return Promise.resolve({ rows: [{ count: '3' }] });
  }

  if (normalizedQuery.includes('SELECT COUNT(*)::text AS count FROM recipient_organizations')) {
    return Promise.resolve({ rows: [{ count: '4' }] });
  }

  if (normalizedQuery.includes('SELECT COUNT(*)::text AS count FROM funded_programs')) {
    return Promise.resolve({ rows: [{ count: '5' }] });
  }

  if (normalizedQuery.includes('COUNT(*)::text AS total_count') && normalizedQuery.includes('FROM grant_applications')) {
    return Promise.resolve({
      rows: [
        {
          draft_count: '1',
          submitted_count: '2',
          reviewed_count: '0',
          approved_count: '3',
          declined_count: '1',
          total_count: '7',
        },
      ],
    });
  }

  if (normalizedQuery.includes('COUNT(*)::text AS total_awards')) {
    return Promise.resolve({
      rows: [
        {
          total_awards: '6',
          active_awards: '4',
          total_awarded_amount: '10000',
          committed_amount: '8000',
          total_disbursed_amount: '4500',
          outstanding_amount: '5500',
        },
      ],
    });
  }

  if (normalizedQuery.includes('GROUP BY status')) {
    return Promise.resolve({
      rows: [{ status: 'active', count: '4', amount: '8000' }],
    });
  }

  if (normalizedQuery.includes('GROUP BY jurisdiction')) {
    return Promise.resolve({
      rows: [{ status: 'federal', count: '6', amount: '10000' }],
    });
  }

  if (normalizedQuery.includes('FROM grant_activity_logs log')) {
    return Promise.resolve({
      rows: [makeActivityRow()],
    });
  }

  if (normalizedQuery.includes(') AS items')) {
    return Promise.resolve({
      rows: [makeCalendarRow()],
    });
  }

  if (normalizedQuery.includes('due_at < CURRENT_DATE')) {
    return Promise.resolve({ rows: [{ count: '2' }] });
  }

  if (normalizedQuery.includes('due_at BETWEEN CURRENT_DATE')) {
    return Promise.resolve({ rows: [{ count: '3' }] });
  }

  if (normalizedQuery.includes('COALESCE(scheduled_date, paid_at) BETWEEN CURRENT_DATE')) {
    return Promise.resolve({ rows: [{ count: '1' }] });
  }

  return Promise.resolve({ rows: [] });
};

describe('GrantsService', () => {
  let mockQuery: jest.Mock;
  let mockConnect: jest.Mock;
  let service: GrantsService;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockConnect = jest.fn();
    service = new GrantsService({
      query: mockQuery,
      connect: mockConnect,
    } as unknown as Pool);

    mockGetCached.mockResolvedValue(null);
    mockSetCached.mockResolvedValue(true);
    mockDeleteCachedPattern.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds and caches a summary on cache miss', async () => {
    mockQuery.mockImplementation(createSummaryQueryImplementation());

    const summary = await service.getSummary('org-1', {
      jurisdiction: 'federal',
      fiscal_year: '2026',
    });

    expect(mockGetCached).toHaveBeenCalledWith('grants:summary:v1:org-1:federal:2026');
    expect(summary.total_funders).toBe(2);
    expect(summary.total_awards).toBe(6);
    expect(summary.overdue_reports).toBe(2);
    expect(summary.upcoming_reports).toBe(3);
    expect(summary.upcoming_disbursements).toBe(1);
    expect(summary.recent_activity).toHaveLength(1);
    expect(summary.upcoming_items).toHaveLength(1);
    expect(mockSetCached).toHaveBeenCalledWith(
      'grants:summary:v1:org-1:federal:2026',
      summary,
      60
    );
  });

  it('returns a cached summary without querying the database', async () => {
    const cachedSummary = {
      total_funders: 1,
      total_programs: 1,
      total_recipients: 1,
      total_funded_programs: 1,
      total_applications: 1,
      draft_applications: 1,
      submitted_applications: 0,
      approved_applications: 0,
      declined_applications: 0,
      total_awards: 1,
      active_awards: 1,
      total_awarded_amount: 5000,
      committed_amount: 5000,
      total_disbursed_amount: 1000,
      outstanding_amount: 4000,
      overdue_reports: 0,
      upcoming_reports: 0,
      upcoming_disbursements: 0,
      by_status: [],
      by_jurisdiction: [],
      recent_activity: [],
      upcoming_items: [],
    };

    mockGetCached.mockResolvedValueOnce(cachedSummary);

    await expect(
      service.getSummary('org-1', {
        jurisdiction: 'federal',
      })
    ).resolves.toBe(cachedSummary);

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSetCached).not.toHaveBeenCalled();
  });

  it('uses filter-specific cache keys', async () => {
    mockQuery.mockImplementation(createSummaryQueryImplementation());

    await service.getSummary('org-1', { jurisdiction: 'federal' });
    await service.getSummary('org-1', { fiscal_year: '2026' });

    expect(mockGetCached).toHaveBeenNthCalledWith(1, 'grants:summary:v1:org-1:federal:all');
    expect(mockGetCached).toHaveBeenNthCalledWith(2, 'grants:summary:v1:org-1:all:2026');
  });

  it('falls back to uncached summary reads when Redis errors', async () => {
    mockGetCached.mockRejectedValueOnce(new Error('redis unavailable'));
    mockSetCached.mockRejectedValueOnce(new Error('redis unavailable'));
    mockQuery.mockImplementation(createSummaryQueryImplementation());

    const summary = await service.getSummary('org-1');

    expect(summary.total_awards).toBe(6);
    expect(summary.by_status).toEqual([
      {
        status: 'active',
        count: 4,
        amount: 8000,
      },
    ]);
    expect(mockSetCached).toHaveBeenCalledWith(
      'grants:summary:v1:org-1:all:all',
      summary,
      60
    );
  });

  it('invalidates summary cache after portfolio mutations', async () => {
    const portfolioService = (service as unknown as { portfolioService: Record<string, jest.Mock> })
      .portfolioService;
    const createFunderSpy = jest
      .spyOn(portfolioService, 'createFunder')
      .mockResolvedValue({ id: 'funder-1' } as never);

    await service.createFunder('org-1', 'user-1', {
      name: 'Alpha Funder',
      jurisdiction: 'federal',
    } as never);

    expect(createFunderSpy).toHaveBeenCalled();
    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after application status changes', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          makeApplicationRow({
            status: 'submitted',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.updateApplicationStatus('org-1', 'application-1', 'user-1', 'submitted', {});

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after award flows', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client as unknown as PoolClient);

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [makeApplicationRow()],
      })
      .mockResolvedValueOnce({
        rows: [makeGrantRow()],
      })
      .mockResolvedValueOnce({
        rows: [
          makeApplicationRow({
            grant_id: 'grant-1',
            status: 'approved',
            approved_amount: '5000',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await service.awardApplication('org-1', 'application-1', 'user-1', {
      amount: 5000,
      jurisdiction: 'federal',
      funder_id: 'funder-1',
    } as never);

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after grant mutations', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          makeGrantRow({
            title: 'Updated Grant',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.updateGrant('org-1', 'grant-1', 'user-1', {
      title: 'Updated Grant',
    } as never);

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after disbursement mutations', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client as unknown as PoolClient);

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [makeDisbursementRow()],
      })
      .mockResolvedValueOnce({
        rows: [{ amount: '5000' }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_disbursed: '1000' }],
      })
      .mockResolvedValueOnce({
        rows: [{ due_at: null }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await service.createDisbursement('org-1', 'user-1', {
      grant_id: 'grant-1',
      amount: 1000,
      status: 'scheduled',
    } as never);

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after report mutations', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client as unknown as PoolClient);

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [makeReportRow()],
      })
      .mockResolvedValueOnce({
        rows: [{ amount: '5000' }],
      })
      .mockResolvedValueOnce({
        rows: [{ total_disbursed: '1000' }],
      })
      .mockResolvedValueOnce({
        rows: [{ due_at: null }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await service.createReport('org-1', 'user-1', {
      grant_id: 'grant-1',
      due_at: '2026-05-01',
      status: 'due',
    } as never);

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });

  it('invalidates summary cache after document mutations', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [makeDocumentRow()],
      })
      .mockResolvedValueOnce({ rows: [] });

    await service.createDocument('org-1', 'user-1', {
      grant_id: 'grant-1',
      document_type: 'supporting_material',
      file_name: 'attachment.pdf',
      file_url: 'https://example.com/attachment.pdf',
      mime_type: 'application/pdf',
      file_size: 2048,
    } as never);

    expect(mockDeleteCachedPattern).toHaveBeenCalledWith('grants:summary:v1:org-1:*');
  });
});
