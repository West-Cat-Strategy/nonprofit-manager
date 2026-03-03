import { services } from '@container/services';
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
import type { AccountCatalogPort, AccountLifecyclePort } from '../types/ports';

export class AccountRepository implements AccountCatalogPort, AccountLifecyclePort {
  getAccounts(
    filters: AccountFilters = {},
    pagination: PaginationParams = {},
    scope?: DataScopeFilter
  ): Promise<PaginatedAccounts> {
    return services.account.getAccounts(filters, pagination, scope);
  }

  getAccountById(accountId: string): Promise<Account | null> {
    return services.account.getAccountById(accountId);
  }

  getAccountByIdWithScope(accountId: string, scope?: DataScopeFilter): Promise<Account | null> {
    return services.account.getAccountByIdWithScope(accountId, scope);
  }

  getAccountContacts(accountId: string): Promise<{ contacts: Contact[]; total: number }> {
    return services.account.getAccountContacts(accountId);
  }

  createAccount(payload: CreateAccountDTO, userId: string): Promise<Account> {
    return services.account.createAccount(payload, userId);
  }

  updateAccount(accountId: string, payload: UpdateAccountDTO, userId: string): Promise<Account | null> {
    return services.account.updateAccount(accountId, payload, userId);
  }

  deleteAccount(accountId: string, userId: string): Promise<boolean> {
    return services.account.deleteAccount(accountId, userId);
  }
}
