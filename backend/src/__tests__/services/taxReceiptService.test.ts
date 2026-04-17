import { Pool, type PoolClient } from 'pg';
import { TaxReceiptService } from '@modules/donations/services/taxReceiptService';
import { findOrganizationSettings } from '@modules/admin/lib/organizationSettingsStore';
import { sendMail } from '@services/emailService';

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn(),
}));

jest.mock('@modules/admin/lib/organizationSettingsStore', () => ({
  findOrganizationSettings: jest.fn(),
}));

const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: mockConnect,
} as unknown as Pool;

const mockedSendMail = sendMail as jest.MockedFunction<typeof sendMail>;
const mockedFindOrganizationSettings =
  findOrganizationSettings as jest.MockedFunction<typeof findOrganizationSettings>;

const makeDonationRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  donation_id: 'donation-1',
  donation_number: 'DON-260315-00001',
  amount: '50.00',
  currency: 'CAD',
  donation_date: '2026-03-15',
  payment_method: 'credit_card',
  payment_status: 'completed',
  account_id: 'account-1',
  contact_id: null,
  campaign_name: 'Spring Drive',
  designation: 'General Fund',
  ...overrides,
});

const makeReceiptRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'receipt-1',
  organization_id: 'org-1',
  receipt_number: 'TR-2026-00001',
  sequence_year: 2026,
  sequence_number: 1,
  kind: 'single_official',
  payee_type: 'account',
  payee_id: 'account-1',
  payee_name: 'Neighborhood Mutual Aid',
  payee_email: 'donor@example.com',
  delivery_mode: 'download',
  email_delivery_status: 'not_requested',
  email_sent_at: null,
  email_error: null,
  issue_date: '2026-03-15',
  period_start: null,
  period_end: null,
  include_previously_receipted: false,
  is_official: true,
  total_amount: '50.00',
  currency: 'CAD',
  created_by: 'user-1',
  modified_by: 'user-1',
  created_at: new Date('2026-03-15T00:00:00.000Z'),
  updated_at: new Date('2026-03-15T00:00:00.000Z'),
  ...overrides,
});

const makeAccountPayeeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  account_id: 'account-1',
  account_name: 'Neighborhood Mutual Aid',
  email: 'donor@example.com',
  phone: '555-0100',
  address_line1: '123 Main St',
  address_line2: '',
  city: 'Vancouver',
  state_province: 'BC',
  postal_code: 'V6B 1A1',
  country: 'Canada',
  ...overrides,
});

const makeOrganizationSettings = () =>
  ({
    config: {
      currency: 'CAD',
      taxReceipt: {
        legalName: 'Neighborhood Mutual Aid',
        charitableRegistrationNumber: '123456789RR0001',
        receiptingAddress: {
          line1: '123 Main St',
          line2: '',
          city: 'Vancouver',
          province: 'BC',
          postalCode: 'V6B 1A1',
          country: 'Canada',
        },
        receiptIssueLocation: 'Vancouver, BC',
        authorizedSignerName: 'Alex Treasurer',
        authorizedSignerTitle: 'Treasurer',
        contactEmail: 'receipts@example.com',
        contactPhone: '555-0101',
      },
    },
  }) as Awaited<ReturnType<typeof findOrganizationSettings>>;

const makeClient = (): jest.Mocked<Pick<PoolClient, 'query' | 'release'>> =>
  ({
    query: jest.fn(),
    release: jest.fn(),
  }) as jest.Mocked<Pick<PoolClient, 'query' | 'release'>>;

describe('TaxReceiptService', () => {
  let service: TaxReceiptService;

  beforeEach(() => {
    service = new TaxReceiptService(mockPool);
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockConnect.mockReset();
    mockedFindOrganizationSettings.mockResolvedValue(makeOrganizationSettings());
  });

  it('rejects single receipt issuance for non-completed donations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeDonationRow({
          payment_status: 'pending',
        }),
      ],
    });

    await expect(
      service.issueSingleReceipt({
        organizationId: 'org-1',
        userId: 'user-1',
        donationId: 'donation-1',
        request: {},
      })
    ).rejects.toThrow('Only completed donations can receive official tax receipts');
  });

  it('rejects single receipt issuance for non-cash-equivalent donations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeDonationRow({
          payment_method: 'stock',
        }),
      ],
    });

    await expect(
      service.issueSingleReceipt({
        organizationId: 'org-1',
        userId: 'user-1',
        donationId: 'donation-1',
        request: {},
      })
    ).rejects.toThrow('Official tax receipts are only available for cash-equivalent donations');
  });

  it('reuses an existing official receipt and emails the stored PDF when requested', async () => {
    mockedSendMail.mockResolvedValue(true);

    mockQuery
      .mockResolvedValueOnce({
        rows: [makeDonationRow()],
      })
      .mockResolvedValueOnce({
        rows: [makeReceiptRow()],
      })
      .mockResolvedValueOnce({
        rows: [
          makeReceiptRow({
            pdf_content: Buffer.from('pdf-content'),
          }),
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const result = await service.issueSingleReceipt({
      organizationId: 'org-1',
      userId: 'user-1',
      donationId: 'donation-1',
      request: {
        deliveryMode: 'email',
        email: 'override@example.com',
      },
    });

    expect(result.reusedExistingReceipt).toBe(true);
    expect(result.receipt.receipt_number).toBe('TR-2026-00001');
    expect(result.delivery.status).toBe('sent');
    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'override@example.com',
        attachments: [
          expect.objectContaining({
            filename: 'TR-2026-00001.pdf',
            contentType: 'application/pdf',
          }),
        ],
      })
    );
  });

  it('batches annual official receipt item inserts into a single UNNEST query', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client as unknown as PoolClient);
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeReceiptRow({
          kind: 'annual_official',
          issue_date: '2026-12-31',
          period_start: '2026-01-01',
          period_end: '2026-12-31',
          total_amount: '125.00',
          pdf_content: Buffer.from('annual-pdf'),
        }),
      ],
    });

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [makeAccountPayeeRow()] })
      .mockResolvedValueOnce({
        rows: [
          makeDonationRow(),
          makeDonationRow({
            donation_id: 'donation-2',
            donation_number: 'DON-260316-00002',
            amount: '75.00',
            donation_date: '2026-03-16',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ next_sequence: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          makeReceiptRow({
            kind: 'annual_official',
            issue_date: '2026-12-31',
            period_start: '2026-01-01',
            period_end: '2026-12-31',
            total_amount: '125.00',
          }),
        ],
      })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.issueAnnualReceipt({
      organizationId: 'org-1',
      userId: 'user-1',
      request: {
        payeeType: 'account',
        payeeId: 'account-1',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });

    const batchedInsertCall = client.query.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO tax_receipt_items') &&
        sql.includes('UNNEST')
    );

    expect(batchedInsertCall).toBeDefined();
    expect(batchedInsertCall?.[1]).toEqual([
      'receipt-1',
      ['donation-1', 'donation-2'],
      ['50.00', '75.00'],
      ['2026-03-15', '2026-03-16'],
      true,
    ]);
    expect(
      client.query.mock.calls.some(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE donations')
      )
    ).toBe(true);
    expect(result.coveredDonationIds).toEqual(['donation-1', 'donation-2']);
    expect(result.receipt.kind).toBe('annual_official');
  });

  it('stores annual summary reprints without official coverage and skips donation updates', async () => {
    const client = makeClient();
    mockConnect.mockResolvedValue(client as unknown as PoolClient);
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeReceiptRow({
          kind: 'annual_summary_reprint',
          issue_date: '2026-12-31',
          period_start: '2026-01-01',
          period_end: '2026-12-31',
          include_previously_receipted: true,
          is_official: false,
          total_amount: '125.00',
          pdf_content: Buffer.from('summary-pdf'),
        }),
      ],
    });

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [makeAccountPayeeRow()] })
      .mockResolvedValueOnce({
        rows: [
          makeDonationRow(),
          makeDonationRow({
            donation_id: 'donation-2',
            donation_number: 'DON-260316-00002',
            amount: '75.00',
            donation_date: '2026-03-16',
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ next_sequence: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          makeReceiptRow({
            kind: 'annual_summary_reprint',
            issue_date: '2026-12-31',
            period_start: '2026-01-01',
            period_end: '2026-12-31',
            include_previously_receipted: true,
            is_official: false,
            total_amount: '125.00',
          }),
        ],
      })
      .mockResolvedValueOnce({ rowCount: 2, rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.issueAnnualReceipt({
      organizationId: 'org-1',
      userId: 'user-1',
      request: {
        payeeType: 'account',
        payeeId: 'account-1',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        includeAlreadyReceipted: true,
      },
    });

    const batchedInsertCall = client.query.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('INSERT INTO tax_receipt_items') &&
        sql.includes('UNNEST')
    );

    expect(batchedInsertCall?.[1]).toEqual([
      'receipt-1',
      ['donation-1', 'donation-2'],
      ['50.00', '75.00'],
      ['2026-03-15', '2026-03-16'],
      false,
    ]);
    expect(
      client.query.mock.calls.some(
        ([sql]) => typeof sql === 'string' && sql.includes('UPDATE donations')
      )
    ).toBe(false);
    expect(result.coveredDonationIds).toEqual([]);
    expect(result.receipt.kind).toBe('annual_summary_reprint');
  });

  it('rolls back receipt creation when the batched item insert fails', async () => {
    const client = makeClient();
    const insertError = new Error('batched insert failed');

    mockConnect.mockResolvedValue(client as unknown as PoolClient);
    mockQuery
      .mockResolvedValueOnce({ rows: [makeDonationRow()] })
      .mockResolvedValueOnce({ rows: [] });

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [makeAccountPayeeRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ next_sequence: 1 }] })
      .mockResolvedValueOnce({
        rows: [makeReceiptRow()],
      })
      .mockRejectedValueOnce(insertError)
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      service.issueSingleReceipt({
        organizationId: 'org-1',
        userId: 'user-1',
        donationId: 'donation-1',
        request: {
          payeeType: 'account',
        },
      })
    ).rejects.toThrow('batched insert failed');

    expect(
      client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')
    ).toBe(true);
    expect(
      client.query.mock.calls.some(([sql]) => sql === 'COMMIT')
    ).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });
});
