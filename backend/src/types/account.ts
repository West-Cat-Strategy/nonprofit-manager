/**
 * Account Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Account entity
 */

export enum AccountType {
  ORGANIZATION = 'organization',
  INDIVIDUAL = 'individual',
}

export enum AccountCategory {
  DONOR = 'donor',
  VOLUNTEER = 'volunteer',
  PARTNER = 'partner',
  VENDOR = 'vendor',
  BENEFICIARY = 'beneficiary',
  OTHER = 'other',
}

export interface Account {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: AccountType;
  category: AccountCategory;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;

  // Address fields
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;

  // Tax and financial
  tax_id: string | null;

  // Lifecycle tracking
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  modified_by: string;
}

export interface CreateAccountDTO {
  account_name: string;
  account_type: AccountType;
  category: AccountCategory;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
}

export interface UpdateAccountDTO {
  account_name?: string;
  account_type?: AccountType;
  category?: AccountCategory;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  tax_id?: string;
  is_active?: boolean;
}

export interface AccountFilters {
  search?: string;
  account_type?: AccountType;
  category?: AccountCategory;
  is_active?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedAccounts {
  data: Account[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
