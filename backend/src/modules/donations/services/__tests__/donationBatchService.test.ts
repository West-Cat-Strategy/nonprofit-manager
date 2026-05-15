import type { Pool } from 'pg';
import { DonationBatchService } from '../donationBatchService';

jest.mock('@services/activityEventService', () => ({
  activityEventService: {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@config/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

const mockQuery = jest.fn();
const pool = {
  query: mockQuery,
} as unknown as Pool;

const batchRow = {
  id: 'batch-1',
  organization_id: 'org-1',
  name: 'May 14 donation batch',
  date_from: '2026-05-14',
  date_to: '2026-05-14',
  expected_count: '2',
  expected_amount: '125.00',
  currency: 'CAD',
  status: 'open',
  notes: null,
  closed_at: null,
  reviewed_at: null,
  approved_at: null,
  posted_at: null,
  reopened_at: null,
  created_at: '2026-05-14T10:00:00.000Z',
  updated_at: '2026-05-14T10:00:00.000Z',
  created_by: 'user-1',
  modified_by: 'user-1',
};

describe('DonationBatchService', () => {
  let service: DonationBatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationBatchService(pool);
  });

  it('returns control totals, restricted-fund summary, exceptions, and audit events', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [batchRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            donation_id: 'donation-1',
            donation_number: 'DON-260514-00001',
            amount: '75.00',
            currency: 'CAD',
            payment_status: 'completed',
            account_id: 'org-1',
            contact_id: null,
            designation_id: 'designation-1',
            designation_label: 'Building Fund',
            designation_code: 'building',
            restriction_type: 'temporarily_restricted',
          },
          {
            donation_id: 'donation-2',
            donation_number: 'DON-260514-00002',
            amount: '50.00',
            currency: 'CAD',
            payment_status: 'completed',
            account_id: 'org-1',
            contact_id: null,
            designation_id: null,
            designation_label: 'Unrestricted',
            designation_code: null,
            restriction_type: 'unrestricted',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-1',
            batch_id: 'batch-1',
            event_type: 'created',
            from_status: null,
            to_status: 'open',
            actor_user_id: 'user-1',
            metadata: {},
            created_at: '2026-05-14T10:00:00.000Z',
          },
        ],
      });

    const batches = await service.listBatches('org-1');

    expect(batches).toHaveLength(1);
    expect(batches[0].control_summary).toMatchObject({
      expected_count: 2,
      actual_count: 2,
      expected_amount: 125,
      actual_amount: 125,
      difference_amount: 0,
    });
    expect(batches[0].restricted_fund_summary).toEqual([
      {
        restriction_type: 'temporarily_restricted',
        designation_id: 'designation-1',
        designation_label: 'Building Fund',
        designation_code: 'building',
        count: 1,
        amount: 75,
      },
      {
        restriction_type: 'unrestricted',
        designation_id: null,
        designation_label: 'Unrestricted',
        designation_code: null,
        count: 1,
        amount: 50,
      },
    ]);
    expect(batches[0].exception_preview).toEqual([]);
    expect(batches[0].audit_events[0].event_type).toBe('created');
  });

  it('blocks approval when control exceptions remain', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...batchRow, status: 'under_review' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            donation_id: 'donation-1',
            donation_number: 'DON-260514-00001',
            amount: '75.00',
            currency: 'CAD',
            payment_status: 'pending',
            account_id: 'org-1',
            contact_id: null,
            designation_id: null,
            designation_label: 'Unrestricted',
            designation_code: null,
            restriction_type: 'unrestricted',
          },
        ],
      });

    await expect(service.approve('batch-1', 'org-1', 'user-1')).rejects.toThrow(
      'Donation batch cannot be approved while blocking exceptions remain'
    );
  });

  it('creates a batch and records its first audit event', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [batchRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-1',
            batch_id: 'batch-1',
            event_type: 'created',
            from_status: null,
            to_status: 'open',
            actor_user_id: 'user-1',
            metadata: { expectedCount: 2 },
            created_at: '2026-05-14T10:00:00.000Z',
          },
        ],
      });

    const batch = await service.createBatch(
      {
        name: 'May 14 donation batch',
        date_from: '2026-05-14',
        date_to: '2026-05-14',
        expected_count: 2,
        expected_amount: 125,
        currency: 'CAD',
      },
      'user-1',
      'org-1'
    );

    expect(batch.batch_id).toBe('batch-1');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO donation_batches');
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO donation_batch_audit_events');
  });
});
