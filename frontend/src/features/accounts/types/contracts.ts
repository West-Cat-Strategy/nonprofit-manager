export interface Account {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: 'organization' | 'individual';
  category: 'donor' | 'volunteer' | 'partner' | 'vendor' | 'beneficiary' | 'other';
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountsListQuery {
  page?: number;
  limit?: number;
  search?: string;
  account_type?: string;
  category?: string;
  is_active?: boolean;
}

export interface AccountsListPayload {
  data: Account[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export type AccountMutationInput = Partial<Account>;

export interface AccountsCatalogPort {
  listAccounts(query?: AccountsListQuery): Promise<AccountsListPayload>;
  getAccountById(accountId: string): Promise<Account>;
}

export interface AccountsMutationPort {
  createAccount(payload: AccountMutationInput): Promise<Account>;
  updateAccount(accountId: string, payload: AccountMutationInput): Promise<Account>;
  deleteAccount(accountId: string): Promise<void>;
}
