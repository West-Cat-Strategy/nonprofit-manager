import type {
  Account,
  AccountFilters,
  CreateAccountDTO,
  PaginatedAccounts,
  PaginationParams,
  UpdateAccountDTO,
} from '@app-types/account';
import type { Contact } from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';

export interface AccountCatalogPort {
  getAccounts(
    filters?: AccountFilters,
    pagination?: PaginationParams,
    scope?: DataScopeFilter
  ): Promise<PaginatedAccounts>;
  getAccountById(accountId: string): Promise<Account | null>;
  getAccountByIdWithScope(accountId: string, scope?: DataScopeFilter): Promise<Account | null>;
  getAccountContacts(accountId: string): Promise<{ contacts: Contact[]; total: number }>;
}

export interface AccountLifecyclePort {
  createAccount(payload: CreateAccountDTO, userId: string): Promise<Account>;
  updateAccount(accountId: string, payload: UpdateAccountDTO, userId: string): Promise<Account | null>;
  deleteAccount(accountId: string, userId: string): Promise<boolean>;
}
