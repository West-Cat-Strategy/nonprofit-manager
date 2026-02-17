import type { Organization } from '../../types/schema';
import api from '../api';

interface AccountApiResponse {
  account_id: string;
  account_name: string;
  account_type: string;
  category: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  description?: string;
}

interface AccountsResponse {
  data: AccountApiResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

const CATEGORY_TO_TYPE: Record<string, Organization['type']> = {
  partner: 'partner',
  vendor: 'partner',
  donor: 'grantor',
  beneficiary: 'government',
  other: 'partner',
  volunteer: 'partner',
};

function adaptAccount(account: AccountApiResponse): Organization {
  return {
    id: account.account_id,
    name: account.account_name,
    type: CATEGORY_TO_TYPE[account.category] || 'partner',
    status: account.is_active ? 'active' : 'pending',
    contact: account.email || account.phone || '',
  };
}

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get<AccountsResponse>('/accounts', {
    params: { account_type: 'organization', limit: '100' },
  });
  const accounts = response.data.data || [];
  return accounts.map(adaptAccount);
};
