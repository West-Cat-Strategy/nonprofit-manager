import { ContactService } from '@services';
import { Pool } from 'pg';
import { decrypt, encrypt } from '@utils/encryption';
import {
  syncContactMethodSummaries,
  syncStructuredContactMethodsFromSummary,
} from '@services/contactMethodSyncService';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@utils/encryption', () => ({
  encrypt: jest.fn((value: string) => `enc:${value}`),
  decrypt: jest.fn((value: string) => {
    if (!value.startsWith('enc:')) {
      throw new Error('Invalid encrypted payload');
    }
    return value.slice(4);
  }),
}));

jest.mock('@services/contactMethodSyncService', () => ({
  syncStructuredContactMethodsFromSummary: jest.fn().mockResolvedValue(undefined),
  syncContactMethodSummaries: jest.fn().mockResolvedValue(undefined),
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
        { contact_id: '1', first_name: 'John', last_name: 'Doe', total_count: 2 },
        { contact_id: '2', first_name: 'Jane', last_name: 'Smith', total_count: 2 },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockContacts });

      const result = await contactService.getContacts();

      expect(result.data).toEqual([
        expect.objectContaining({ contact_id: '1', first_name: 'John', last_name: 'Doe', phn: null }),
        expect.objectContaining({ contact_id: '2', first_name: 'Jane', last_name: 'Smith', phn: null }),
      ]);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', first_name: 'John', total_count: 1 }] });

      await contactService.getContacts({ search: 'John' });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain(
        "coalesce(nullif(c.first_name, ''), '') || CASE WHEN nullif(c.preferred_name, '') IS NOT NULL THEN ' ' || c.preferred_name ELSE '' END || CASE WHEN nullif(c.last_name, '') IS NOT NULL THEN ' ' || c.last_name ELSE '' END || CASE WHEN nullif(c.email, '') IS NOT NULL THEN ' ' || c.email ELSE '' END || CASE WHEN nullif(c.phone, '') IS NOT NULL THEN ' ' || c.phone ELSE '' END || CASE WHEN nullif(c.mobile_phone, '') IS NOT NULL THEN ' ' || c.mobile_phone ELSE '' END"
      );
      expect(queryCall[1]).toContain('%John%');
    });

    it('should apply account_id filter correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', account_id: 'acc-123', total_count: 1 }] });

      await contactService.getContacts({ account_id: 'acc-123' });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain('acc-123');
    });

    it('should apply is_active filter correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', is_active: true, total_count: 1 }] });

      await contactService.getContacts({ is_active: true });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[1]).toContain(true);
    });

    it('should apply role filter correctly (staff)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', first_name: 'John', total_count: 1 }] });

      await contactService.getContacts({ role: 'staff' });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('contact_role_assignments');
      expect(queryCall[0]).toContain('contact_roles');
      expect(queryCall[1]).toContainEqual(['Staff', 'Executive Director']);
    });

    it.each([
      ['client', ['Client']],
      ['donor', ['Donor']],
      ['support_person', ['Support Person']],
    ] as const)('should apply role filter correctly (%s)', async (role, expectedRoleNames) => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', first_name: 'John', total_count: 1 }] });

      await contactService.getContacts({ role });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('contact_role_assignments');
      expect(queryCall[0]).toContain('contact_roles');
      expect(queryCall[1]).toContainEqual(expectedRoleNames);
    });

    it('should handle custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ contact_id: '1', total_count: 100 }] });

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

  describe('lookupContacts', () => {
    it('should return lightweight contact rows and apply defaults', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            contact_id: '1',
            first_name: 'Alex',
            preferred_name: null,
            last_name: 'Rivera',
            email: 'alex@example.com',
            phone: '5551231234',
            mobile_phone: null,
            is_active: true,
            account_name: 'Account A',
          },
        ],
      });

      const result = await contactService.lookupContacts({ q: 'alex' });

      expect(result).toEqual([
        {
          contact_id: '1',
          first_name: 'Alex',
          preferred_name: null,
          last_name: 'Rivera',
          email: 'alex@example.com',
          phone: '5551231234',
          mobile_phone: null,
          is_active: true,
          account_name: 'Account A',
        },
      ]);
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain(
        "coalesce(nullif(c.first_name, ''), '') || CASE WHEN nullif(c.preferred_name, '') IS NOT NULL THEN ' ' || c.preferred_name ELSE '' END || CASE WHEN nullif(c.last_name, '') IS NOT NULL THEN ' ' || c.last_name ELSE '' END || CASE WHEN nullif(c.email, '') IS NOT NULL THEN ' ' || c.email ELSE '' END || CASE WHEN nullif(c.phone, '') IS NOT NULL THEN ' ' || c.phone ELSE '' END || CASE WHEN nullif(c.mobile_phone, '') IS NOT NULL THEN ' ' || c.mobile_phone ELSE '' END"
      );
      expect(mockQuery.mock.calls[0][1]).toContain('%alex%');
      expect(mockQuery.mock.calls[0][1]).toContain(true);
      expect(mockQuery.mock.calls[0][1]).toContain(8);
    });

    it('should short-circuit when search term is too short', async () => {
      const result = await contactService.lookupContacts({ q: 'a' });
      expect(result).toEqual([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should clamp limit to max 20', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await contactService.lookupContacts({ q: 'john', limit: 100 });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][1]).toContain(20);
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

      expect(result).toEqual(expect.objectContaining({ ...mockContact, phn: null }));
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return full PHN for staff role', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', phn_encrypted: 'enc:1234567890' }],
      });

      const result = await contactService.getContactById('123', 'staff');

      expect(decrypt).toHaveBeenCalledWith('enc:1234567890');
      expect(result).toEqual(expect.objectContaining({ phn: '1234567890' }));
    });

    it('should return masked PHN for non-staff role', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', phn_encrypted: 'enc:1234567890' }],
      });

      const result = await contactService.getContactById('123', 'volunteer');

      expect(result).toEqual(expect.objectContaining({ phn: '******7890' }));
    });

    it('should fail safe when PHN decrypt fails', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', phn_encrypted: 'invalid-value' }],
      });

      const result = await contactService.getContactById('123', 'admin');

      expect(result).toEqual(expect.objectContaining({ phn: null }));
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
      const mockInsertedContact = {
        contact_id: 'new-uuid',
      };
      const mockCreatedContact = {
        contact_id: 'new-uuid',
        first_name: 'John',
        last_name: 'Doe',
        birth_date: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockInsertedContact] })
        .mockResolvedValueOnce({ rows: [mockCreatedContact] });

      const result = await contactService.createContact(
        { first_name: 'John', last_name: 'Doe' },
        'user-123'
      );

      expect(result).toEqual(expect.objectContaining({ ...mockCreatedContact, phn: null }));
      expect(syncStructuredContactMethodsFromSummary).toHaveBeenCalledWith(
        'new-uuid',
        {
          email: null,
          phone: null,
          mobile_phone: null,
        },
        'user-123',
        mockPool
      );
      expect(syncContactMethodSummaries).toHaveBeenCalledWith('new-uuid', mockPool);
    });

    it('should create contact with all optional fields', async () => {
      const contactData = {
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1988-09-10T23:45:00.000Z',
        account_id: 'acc-123',
        email: 'john@example.com',
        phone: '555-1234',
        mobile_phone: '555-5678',
        job_title: 'Developer',
        preferred_contact_method: 'email',
        address_line1: '400 West Georgia Street',
        address_line2: 'Apt 4',
        city: 'Vancouver',
        state_province: 'BC',
        postal_code: 'V6B 1A1',
        country: 'Canada',
        notes: 'Test notes',
      };

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ contact_id: 'uuid' }],
        })
        .mockResolvedValueOnce({
          rows: [{ contact_id: 'uuid', ...contactData, birth_date: '1988-09-10T00:00:00.000Z' }],
        });

      const result = await contactService.createContact(contactData, 'user-123');

      expect(result.email).toBe('john@example.com');
      expect(result.job_title).toBe('Developer');
      expect(result.birth_date).toBe('1988-09-10');
      const insertValues = mockQuery.mock.calls[0][1] as unknown[];
      expect(insertValues).toContain('1988-09-10');
      expect(syncStructuredContactMethodsFromSummary).toHaveBeenCalledWith(
        'uuid',
        {
          email: 'john@example.com',
          phone: '555-1234',
          mobile_phone: '555-5678',
        },
        'user-123',
        mockPool
      );
    });

    it('should encrypt PHN on create and never persist plaintext PHN', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ contact_id: 'uuid' }],
        })
        .mockResolvedValueOnce({
          rows: [{ contact_id: 'uuid', first_name: 'John', last_name: 'Doe', phn_encrypted: 'enc:1234567890' }],
        });

      const result = await contactService.createContact(
        { first_name: 'John', last_name: 'Doe', phn: '123-456-7890' },
        'user-123',
        'staff'
      );

      expect(encrypt).toHaveBeenCalledWith('1234567890');
      const insertValues = mockQuery.mock.calls[0][1] as unknown[];
      expect(insertValues).toContain('enc:1234567890');
      expect(insertValues).not.toContain('1234567890');
      expect(result.phn).toBe('1234567890');
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

      expect(result).toEqual(expect.objectContaining({ ...mockUpdatedContact, phn: null }));
      expect(syncStructuredContactMethodsFromSummary).not.toHaveBeenCalled();
    });

    it('should return null when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await contactService.updateContact('nonexistent', { first_name: 'Test' }, 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(contactService.updateContact('123', {}, 'user-123')).rejects.toThrow('Failed to update contact');
    });

    it('should clear encrypted PHN when update uses empty string or null', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', phn_encrypted: null }],
      });

      const fromEmptyString = await contactService.updateContact(
        '123',
        { phn: '' },
        'user-123',
        'staff'
      );
      const emptyStringCall = mockQuery.mock.calls[0];
      expect(emptyStringCall[0]).toContain('phn_encrypted');
      expect(emptyStringCall[1]).toContain(null);
      expect(fromEmptyString).toEqual(expect.objectContaining({ phn: null }));

      mockQuery.mockClear();
      mockQuery.mockResolvedValue({
        rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', phn_encrypted: null }],
      });

      const fromNull = await contactService.updateContact('123', { phn: null }, 'user-123', 'staff');
      const nullCall = mockQuery.mock.calls[0];
      expect(nullCall[0]).toContain('phn_encrypted');
      expect(nullCall[1]).toContain(null);
      expect(fromNull).toEqual(expect.objectContaining({ phn: null }));
    });

    it('should update multiple fields at once', async () => {
      const updatedRow = {
        contact_id: '123',
        first_name: 'Johnny',
      };
      const reloadedContact = {
        contact_id: '123',
        first_name: 'Johnny',
        email: 'johnny@example.com',
        phone: '555-9999',
        birth_date: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [updatedRow] })
        .mockResolvedValueOnce({ rows: [reloadedContact] });

      const result = await contactService.updateContact(
        '123',
        { first_name: 'Johnny', email: 'johnny@example.com', phone: '555-9999' },
        'user-123'
      );

      expect(result).toEqual(expect.objectContaining({ ...reloadedContact, phn: null }));
      expect(syncStructuredContactMethodsFromSummary).toHaveBeenCalledWith(
        '123',
        {
          email: 'johnny@example.com',
          phone: '555-9999',
        },
        'user-123',
        mockPool
      );
      expect(syncContactMethodSummaries).toHaveBeenCalledWith('123', mockPool);
    });

    it('should normalize birth dates and clear summary contact methods on update', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ contact_id: '123', birth_date: '2000-01-02', email: null, phone: null }],
        })
        .mockResolvedValueOnce({
          rows: [{ contact_id: '123', first_name: 'John', last_name: 'Doe', birth_date: '2000-01-02' }],
        });

      const result = await contactService.updateContact(
        '123',
        { birth_date: '2000-01-02T19:30:00.000Z', email: '   ', phone: '' },
        'user-123'
      );

      const updateValues = mockQuery.mock.calls[0][1] as unknown[];
      expect(updateValues).toContain('2000-01-02');
      expect(updateValues).toContain(null);
      expect(syncStructuredContactMethodsFromSummary).toHaveBeenCalledWith(
        '123',
        {
          email: null,
          phone: null,
        },
        'user-123',
        mockPool
      );
      expect(result).toEqual(expect.objectContaining({ birth_date: '2000-01-02' }));
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
