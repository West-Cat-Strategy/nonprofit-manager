/**
 * Account Service
 * Handles business logic and database operations for accounts
 */
import { Pool } from 'pg';
import { Account, CreateAccountDTO, UpdateAccountDTO, AccountFilters, PaginationParams, PaginatedAccounts } from '../types/account';
import { Contact } from '../types/contact';
import type { DataScopeFilter } from '../types/dataScope';
export declare class AccountService {
    private pool;
    constructor(pool: Pool);
    /**
     * Generate unique account number
     */
    private generateAccountNumber;
    /**
     * Get all accounts with filtering and pagination
     */
    getAccounts(filters?: AccountFilters, pagination?: PaginationParams, scope?: DataScopeFilter): Promise<PaginatedAccounts>;
    /**
     * Get account by ID
     */
    getAccountById(accountId: string): Promise<Account | null>;
    getAccountByIdWithScope(accountId: string, scope?: DataScopeFilter): Promise<Account | null>;
    /**
     * Create new account
     */
    createAccount(data: CreateAccountDTO, userId: string): Promise<Account>;
    /**
     * Update account
     */
    updateAccount(accountId: string, data: UpdateAccountDTO, userId: string): Promise<Account | null>;
    /**
     * Soft delete account
     */
    deleteAccount(accountId: string, userId: string): Promise<boolean>;
    /**
     * Get contacts for an account
     */
    getAccountContacts(accountId: string): Promise<Contact[]>;
}
//# sourceMappingURL=accountService.d.ts.map