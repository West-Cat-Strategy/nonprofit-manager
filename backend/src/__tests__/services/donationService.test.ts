import { Pool } from 'pg';
import { DonationService } from '../../services/donationService';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create mock pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

describe('DonationService', () => {
  let donationService: DonationService;

  beforeEach(() => {
    donationService = new DonationService(mockPool);
    jest.clearAllMocks();
  });

  describe('getDonations', () => {
    it('should return paginated donations with default pagination', async () => {
      const mockDonations = [
        { donation_id: '1', amount: '100.00', payment_method: 'credit_card' },
        { donation_id: '2', amount: '200.00', payment_method: 'check' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '2', total_amount: '300.00', average_amount: '150.00' }] })
        .mockResolvedValueOnce({ rows: mockDonations });

      const result = await donationService.getDonations();

      expect(result.data).toEqual(mockDonations);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.summary!.total_amount).toBe(300);
    });

    it('should apply account_id filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', total_amount: '100.00', average_amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ donation_id: '1', account_id: 'acc-123' }] });

      await donationService.getDonations({ account_id: 'acc-123' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const summaryCall = mockQuery.mock.calls[0];
      expect(summaryCall[1]).toContain('acc-123');
    });

    it('should apply payment_method filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', total_amount: '100.00', average_amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ donation_id: '1', payment_method: 'credit_card' }] });

      await donationService.getDonations({ payment_method: 'credit_card' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should apply amount range filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', total_amount: '500.00', average_amount: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ donation_id: '1', amount: '500.00' }] });

      await donationService.getDonations({ min_amount: 100, max_amount: 1000 });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const summaryCall = mockQuery.mock.calls[0];
      expect(summaryCall[1]).toContain(100);
      expect(summaryCall[1]).toContain(1000);
    });

    it('should apply date range filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '5', total_amount: '1000.00', average_amount: '200.00' }] })
        .mockResolvedValueOnce({ rows: [] });

      await donationService.getDonations({ start_date: '2024-01-01', end_date: '2024-12-31' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const summaryCall = mockQuery.mock.calls[0];
      expect(summaryCall[1]).toContain('2024-01-01');
      expect(summaryCall[1]).toContain('2024-12-31');
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '1', total_amount: '100.00', average_amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ donation_id: '1', campaign_name: 'Summer Campaign' }] });

      await donationService.getDonations({ search: 'Summer' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const summaryCall = mockQuery.mock.calls[0];
      expect(summaryCall[1]).toContain('%Summer%');
    });

    it('should handle custom pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '50', total_amount: '5000.00', average_amount: '100.00' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await donationService.getDonations({}, { page: 3, limit: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_pages).toBe(5);
    });
  });

  describe('getDonationById', () => {
    it('should return donation when found', async () => {
      const mockDonation = {
        donation_id: '123',
        amount: '500.00',
        payment_method: 'credit_card',
        account_name: 'Test Org',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockDonation] });

      const result = await donationService.getDonationById('123');

      expect(result).toEqual(mockDonation);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when donation not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await donationService.getDonationById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createDonation', () => {
    it('should create donation with account_id', async () => {
      const mockCreatedDonation = {
        donation_id: 'new-uuid',
        donation_number: 'DON-260201-00001',
        amount: '100.00',
        payment_status: 'pending',
      };

      // Mock for generateDonationNumber
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      // Mock for INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedDonation] });

      const result = await donationService.createDonation(
        {
          account_id: 'acc-123',
          amount: 100,
          donation_date: '2024-03-15',
        },
        'user-123'
      );

      expect(result).toEqual(mockCreatedDonation);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should create donation with contact_id', async () => {
      const mockCreatedDonation = {
        donation_id: 'new-uuid',
        donation_number: 'DON-260201-00001',
        amount: '50.00',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedDonation] });

      const result = await donationService.createDonation(
        {
          contact_id: 'contact-123',
          amount: 50,
          donation_date: '2024-03-15',
        },
        'user-123'
      );

      expect(result).toEqual(mockCreatedDonation);
    });

    it('should throw error if neither account_id nor contact_id provided', async () => {
      await expect(
        donationService.createDonation(
          {
            amount: 100,
            donation_date: '2024-03-15',
          },
          'user-123'
        )
      ).rejects.toThrow('Either account_id or contact_id must be provided');
    });

    it('should create recurring donation', async () => {
      const mockCreatedDonation = {
        donation_id: 'new-uuid',
        is_recurring: true,
        recurring_frequency: 'monthly',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedDonation] });

      const result = await donationService.createDonation(
        {
          account_id: 'acc-123',
          amount: 50,
          donation_date: '2024-03-15',
          is_recurring: true,
          recurring_frequency: 'monthly',
        },
        'user-123'
      );

      expect(result.is_recurring).toBe(true);
      expect(result.recurring_frequency).toBe('monthly');
    });

    it('should create donation with campaign and designation', async () => {
      const mockCreatedDonation = {
        donation_id: 'new-uuid',
        campaign_name: 'Summer 2024',
        designation: 'Building Fund',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedDonation] });

      const result = await donationService.createDonation(
        {
          account_id: 'acc-123',
          amount: 1000,
          donation_date: '2024-06-01',
          campaign_name: 'Summer 2024',
          designation: 'Building Fund',
        },
        'user-123'
      );

      expect(result.campaign_name).toBe('Summer 2024');
      expect(result.designation).toBe('Building Fund');
    });
  });

  describe('updateDonation', () => {
    it('should update donation successfully', async () => {
      const mockUpdatedDonation = {
        donation_id: '123',
        amount: '150.00',
        payment_status: 'completed',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedDonation] });

      const result = await donationService.updateDonation(
        '123',
        { amount: 150, payment_status: 'completed' },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedDonation);
    });

    it('should throw error when no fields to update', async () => {
      await expect(donationService.updateDonation('123', {}, 'user-123')).rejects.toThrow('No fields to update');
    });
  });

  describe('deleteDonation', () => {
    it('should delete donation successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await donationService.deleteDonation('123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['123']);
    });

    it('should return false when donation not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await donationService.deleteDonation('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('markReceiptSent', () => {
    it('should mark receipt as sent', async () => {
      const mockUpdatedDonation = {
        donation_id: '123',
        receipt_sent: true,
        receipt_sent_date: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedDonation] });

      const result = await donationService.markReceiptSent('123', 'user-123');

      expect(result.receipt_sent).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('receipt_sent = true'), ['user-123', '123']);
    });
  });

  describe('getDonationSummary', () => {
    it('should return donation summary with all statistics', async () => {
      // Mock summary query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_amount: '5000.00',
          total_count: '50',
          average_donation: '100.00',
          recurring_count: '10',
          recurring_amount: '500.00',
        }],
      });
      // Mock payment method query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { payment_method: 'credit_card', count: '30', amount: '3000.00' },
          { payment_method: 'check', count: '20', amount: '2000.00' },
        ],
      });
      // Mock campaign query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { campaign_name: 'Summer 2024', count: '25', amount: '2500.00' },
          { campaign_name: null, count: '25', amount: '2500.00' },
        ],
      });

      const result = await donationService.getDonationSummary();

      expect(result.total_amount).toBe(5000);
      expect(result.total_count).toBe(50);
      expect(result.average_donation).toBe(100);
      expect(result.recurring_count).toBe(10);
      expect(result.by_payment_method).toHaveProperty('credit_card');
      expect(result.by_payment_method.credit_card.count).toBe(30);
      expect(result.by_campaign).toHaveProperty('Summer 2024');
      expect(result.by_campaign.unrestricted.count).toBe(25);
    });

    it('should apply date filters to summary', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ total_amount: '1000.00', total_count: '10', average_donation: '100.00', recurring_count: '2', recurring_amount: '200.00' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await donationService.getDonationSummary({ start_date: '2024-01-01', end_date: '2024-12-31' });

      expect(mockQuery).toHaveBeenCalledTimes(3);
      const summaryCall = mockQuery.mock.calls[0];
      expect(summaryCall[1]).toContain('2024-01-01');
      expect(summaryCall[1]).toContain('2024-12-31');
    });
  });
});
