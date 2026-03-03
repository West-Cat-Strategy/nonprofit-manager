import type {
  Account,
  AccountFilters,
  PaginatedAccounts,
  PaginationParams,
} from '@app-types/account';
import type { Contact } from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';
import type { AccountCatalogPort } from '../types/ports';

export class AccountCatalogUseCase {
  constructor(private readonly repository: AccountCatalogPort) {}

  list(
    filters: AccountFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedAccounts> {
    return this.repository.getAccounts(filters, pagination, scope);
  }

  getById(accountId: string): Promise<Account | null> {
    return this.repository.getAccountById(accountId);
  }

  getByIdWithScope(accountId: string, scope?: DataScopeFilter): Promise<Account | null> {
    return this.repository.getAccountByIdWithScope(accountId, scope);
  }

  listContacts(accountId: string): Promise<{ contacts: Contact[]; total: number }> {
    return this.repository.getAccountContacts(accountId);
  }
}
