import { AccountService } from '../../services/accountService';
import { AccountType, AccountCategory } from '../../types/account';
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

describe('AccountService', () => {
  let accountService: AccountService;
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;
    accountService = new AccountService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccounts', () => {
    it('should return paginated accounts with default pagination', async () => {
      const mockAccounts = [
        { account_id: '1', account_name: 'Test Org', account_type: 'organization' },
        { account_id: '2', account_name: 'John Doe', account_type: 'individual' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count query
        .mockResolvedValueOnce({ rows: mockAccounts }); // data query

      const result = await accountService.getAccounts();

      expect(result.data).toEqual(mockAccounts);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total_pages).toBe(1);
    });

    it('should apply search filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ account_id: '1', account_name: 'Test Org' }] });

      await accountService.getAccounts({ search: 'Test' });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('%Test%');
    });

    it('should apply account_type filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ account_id: '1', account_type: 'organization' }] });

      await accountService.getAccounts({ account_type: AccountType.ORGANIZATION });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('organization');
    });

    it('should apply is_active filter correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ account_id: '1', is_active: true }] });

      await accountService.getAccounts({ is_active: true });

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain(true);
    });

    it('should handle custom pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await accountService.getAccounts({}, { page: 3, limit: 10 });

      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_pages).toBe(5);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(accountService.getAccounts()).rejects.toThrow('Failed to retrieve accounts');
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      const mockAccount = {
        account_id: '123',
        account_name: 'Test Organization',
        account_type: 'organization',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockAccount] });

      const result = await accountService.getAccountById('123');

      expect(result).toEqual(mockAccount);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when account not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await accountService.getAccountById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(accountService.getAccountById('123')).rejects.toThrow('Failed to retrieve account');
    });
  });

  describe('createAccount', () => {
    it('should create account with generated account number', async () => {
      const mockCreatedAccount = {
        account_id: 'new-uuid',
        account_number: 'ACC-10002',
        account_name: 'New Organization',
        account_type: 'organization',
      };

      // Mock for generateAccountNumber
      mockQuery.mockResolvedValueOnce({ rows: [{ account_number: 'ACC-10001' }] });
      // Mock for INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedAccount] });

      const result = await accountService.createAccount(
        { account_name: 'New Organization', account_type: AccountType.ORGANIZATION, category: AccountCategory.DONOR },
        'user-123'
      );

      expect(result).toEqual(mockCreatedAccount);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should generate first account number when no accounts exist', async () => {
      const mockCreatedAccount = {
        account_id: 'new-uuid',
        account_number: 'ACC-10001',
        account_name: 'First Organization',
        account_type: 'organization',
      };

      // No existing accounts
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock for INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedAccount] });

      const result = await accountService.createAccount(
        { account_name: 'First Organization', account_type: AccountType.ORGANIZATION, category: AccountCategory.DONOR },
        'user-123'
      );

      expect(result.account_number).toBe('ACC-10001');
    });

    it('should create account with all optional fields', async () => {
      const accountData = {
        account_name: 'Full Organization',
        account_type: AccountType.ORGANIZATION,
        category: AccountCategory.PARTNER,
        email: 'org@example.com',
        phone: '555-1234',
        website: 'https://example.com',
        description: 'Test description',
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'Test City',
        state_province: 'TS',
        postal_code: '12345',
        country: 'USA',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ account_number: 'ACC-10001' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ account_id: 'uuid', ...accountData, account_number: 'ACC-10002' }],
      });

      const result = await accountService.createAccount(accountData, 'user-123');

      expect(result.email).toBe('org@example.com');
      expect(result.city).toBe('Test City');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ account_number: 'ACC-10001' }] });
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        accountService.createAccount({ account_name: 'Test', account_type: AccountType.ORGANIZATION, category: AccountCategory.DONOR }, 'user-123')
      ).rejects.toThrow('Failed to create account');
    });
  });

  describe('updateAccount', () => {
    it('should update account successfully', async () => {
      const mockUpdatedAccount = {
        account_id: '123',
        account_name: 'Updated Name',
        account_type: 'organization',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedAccount] });

      const result = await accountService.updateAccount('123', { account_name: 'Updated Name' }, 'user-123');

      expect(result).toEqual(mockUpdatedAccount);
    });

    it('should return null when account not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await accountService.updateAccount('nonexistent', { account_name: 'Test' }, 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(accountService.updateAccount('123', {}, 'user-123')).rejects.toThrow('Failed to update account');
    });

    it('should update multiple fields at once', async () => {
      const mockUpdatedAccount = {
        account_id: '123',
        account_name: 'New Name',
        email: 'new@example.com',
        phone: '555-9999',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedAccount] });

      const result = await accountService.updateAccount(
        '123',
        { account_name: 'New Name', email: 'new@example.com', phone: '555-9999' },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedAccount);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        accountService.updateAccount('123', { account_name: 'Test' }, 'user-123')
      ).rejects.toThrow('Failed to update account');
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '123' }] });

      const result = await accountService.deleteAccount('123', 'user-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        ['user-123', '123']
      );
    });

    it('should return false when account not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await accountService.deleteAccount('nonexistent', 'user-123');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(accountService.deleteAccount('123', 'user-123')).rejects.toThrow('Failed to delete account');
    });
  });

  describe('getAccountContacts', () => {
    it('should return contacts for account', async () => {
      const mockContacts = [
        { id: 'c1', first_name: 'John', last_name: 'Doe' },
        { id: 'c2', first_name: 'Jane', last_name: 'Smith' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockContacts });

      const result = await accountService.getAccountContacts('123');

      expect(result).toEqual(mockContacts);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('account_id'), ['123']);
    });

    it('should return empty array when no contacts found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await accountService.getAccountContacts('123');

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(accountService.getAccountContacts('123')).rejects.toThrow('Failed to retrieve account contacts');
    });
  });
});
