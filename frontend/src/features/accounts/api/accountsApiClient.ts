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
    const response = await api.get<AccountsListPayload>('/accounts', { params: query });
    return response.data;
  }

  async getAccountById(accountId: string): Promise<Account> {
    const response = await api.get<Account>(`/accounts/${accountId}`);
    return response.data;
  }

  async createAccount(payload: AccountMutationInput): Promise<Account> {
    const response = await api.post<Account>('/accounts', payload);
    return response.data;
  }

  async updateAccount(accountId: string, payload: AccountMutationInput): Promise<Account> {
    const response = await api.put<Account>(`/accounts/${accountId}`, payload);
    return response.data;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await api.delete(`/accounts/${accountId}`);
  }
}

export const accountsApiClient = new AccountsApiClient();
