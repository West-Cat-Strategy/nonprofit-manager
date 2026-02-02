import { ContactService } from '../../services/contactService';
import { Pool } from 'pg';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ContactService', () => {
  let contactService: ContactService;
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;
    contactService = new ContactService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContacts', () => {
    it('should return paginated contacts with default pagination', async () => {
      const mockContacts = [
        { contact_id: '1', first_name: 'John', last_name: 'Doe' },
        { contact_id: '2', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockContacts });

      const result = await contactService.getContacts();

      expect(result.data).toEqual(mockContacts);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ contact_id: '1', first_name: 'John' }] });

      await contactService.getContacts({ search: 'John' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('%John%');
    });

    it('should apply account_id filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ contact_id: '1', account_id: 'acc-123' }] });

      await contactService.getContacts({ account_id: 'acc-123' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('acc-123');
    });

    it('should apply is_active filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ contact_id: '1', is_active: true }] });

      await contactService.getContacts({ is_active: true });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain(true);
    });

    it('should handle custom pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await contactService.getContacts({}, { page: 5, limit: 10 });

      expect(result.pagination.page).toBe(5);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_pages).toBe(10);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(contactService.getContacts()).rejects.toThrow('Failed to retrieve contacts');
    });
  });

  describe('getContactById', () => {
    it('should return contact when found', async () => {
      const mockContact = {
        contact_id: '123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        account_name: 'Test Org',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockContact] });

      const result = await contactService.getContactById('123');

      expect(result).toEqual(mockContact);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await contactService.getContactById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(contactService.getContactById('123')).rejects.toThrow('Failed to retrieve contact');
    });
  });

  describe('createContact', () => {
    it('should create contact with required fields only', async () => {
      const mockCreatedContact = {
        contact_id: 'new-uuid',
        first_name: 'John',
        last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedContact] });

      const result = await contactService.createContact(
        { first_name: 'John', last_name: 'Doe' },
        'user-123'
      );

      expect(result).toEqual(mockCreatedContact);
    });

    it('should create contact with all optional fields', async () => {
      const contactData = {
        first_name: 'John',
        last_name: 'Doe',
        account_id: 'acc-123',
        email: 'john@example.com',
        phone: '555-1234',
        mobile_phone: '555-5678',
        job_title: 'Developer',
        preferred_contact_method: 'email',
        address_line1: '123 Main St',
        address_line2: 'Apt 4',
        city: 'Test City',
        state_province: 'TS',
        postal_code: '12345',
        country: 'USA',
        notes: 'Test notes',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ contact_id: 'uuid', ...contactData }],
      });

      const result = await contactService.createContact(contactData, 'user-123');

      expect(result.email).toBe('john@example.com');
      expect(result.job_title).toBe('Developer');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        contactService.createContact({ first_name: 'John', last_name: 'Doe' }, 'user-123')
      ).rejects.toThrow('Failed to create contact');
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const mockUpdatedContact = {
        contact_id: '123',
        first_name: 'Johnny',
        last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedContact] });

      const result = await contactService.updateContact('123', { first_name: 'Johnny' }, 'user-123');

      expect(result).toEqual(mockUpdatedContact);
    });

    it('should return null when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await contactService.updateContact('nonexistent', { first_name: 'Test' }, 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(contactService.updateContact('123', {}, 'user-123')).rejects.toThrow('Failed to update contact');
    });

    it('should update multiple fields at once', async () => {
      const mockUpdatedContact = {
        contact_id: '123',
        first_name: 'Johnny',
        email: 'johnny@example.com',
        phone: '555-9999',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedContact] });

      const result = await contactService.updateContact(
        '123',
        { first_name: 'Johnny', email: 'johnny@example.com', phone: '555-9999' },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedContact);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        contactService.updateContact('123', { first_name: 'Test' }, 'user-123')
      ).rejects.toThrow('Failed to update contact');
    });
  });

  describe('deleteContact', () => {
    it('should soft delete contact successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '123' }] });

      const result = await contactService.deleteContact('123', 'user-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        ['user-123', '123']
      );
    });

    it('should return false when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await contactService.deleteContact('nonexistent', 'user-123');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(contactService.deleteContact('123', 'user-123')).rejects.toThrow('Failed to delete contact');
    });
  });
});
