import api from '../../../services/api';
import type {
  Account,
  AccountMutationInput,
  AccountsCatalogPort,
  AccountsListPayload,
  AccountsListQuery,
  AccountsMutationPort,
} from '../types/contracts';

export class AccountsApiClient implements AccountsCatalogPort, AccountsMutationPort {
  async listAccounts(query: AccountsListQuery = {}): Promise<AccountsListPayload> {
    const response = await api.get<AccountsListPayload>('/v2/accounts', { params: query });
    return response.data;
  }

  async getAccountById(accountId: string): Promise<Account> {
    const response = await api.get<Account>(`/v2/accounts/${accountId}`);
    return response.data;
  }

  async createAccount(payload: AccountMutationInput): Promise<Account> {
    const response = await api.post<Account>('/v2/accounts', payload);
    return response.data;
  }

  async updateAccount(accountId: string, payload: AccountMutationInput): Promise<Account> {
    const response = await api.put<Account>(`/v2/accounts/${accountId}`, payload);
    return response.data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await api.delete(`/v2/accounts/${accountId}`);
  }
}

export const accountsApiClient = new AccountsApiClient();
