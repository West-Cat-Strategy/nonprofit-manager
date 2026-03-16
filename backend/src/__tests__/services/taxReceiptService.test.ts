import { Pool } from 'pg';
import { TaxReceiptService } from '@modules/donations/services/taxReceiptService';
import { sendMail } from '@services/emailService';

jest.mock('@services/emailService', () => ({
  sendMail: jest.fn(),
}));

const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: mockConnect,
} as unknown as Pool;

const mockedSendMail = sendMail as jest.MockedFunction<typeof sendMail>;

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

describe('TaxReceiptService', () => {
  let service: TaxReceiptService;

  beforeEach(() => {
    service = new TaxReceiptService(mockPool);
    jest.clearAllMocks();
    mockConnect.mockReset();
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
});
