export type OpportunityStatus = 'open' | 'won' | 'lost';

export interface OpportunityStage {
  id: string;
  organization_id: string;
  name: string;
  stage_order: number;
  probability?: number | null;
  is_closed: boolean;
  is_won: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  stage_id: string;
  stage_name?: string;
  stage_order?: number;
  account_id?: string | null;
  account_name?: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
  donation_id?: string | null;
  amount?: string | null;
  currency: string;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  status: OpportunityStatus;
  loss_reason?: string | null;
  source?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunitySummary {
  total: number;
  open: number;
  won: number;
  lost: number;
  weighted_amount: number;
  stage_totals: Array<{
    stage_id: string;
    stage_name: string;
    count: number;
    amount: number;
  }>;
}

export interface OpportunityFilters {
  stage_id?: string;
  status?: OpportunityStatus;
  assigned_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateOpportunityDTO {
  name: string;
  description?: string;
  stage_id?: string;
  account_id?: string;
  contact_id?: string;
  donation_id?: string;
  amount?: number;
  currency?: string;
  expected_close_date?: string;
  status?: OpportunityStatus;
  loss_reason?: string;
  source?: string;
  assigned_to?: string;
}

export interface UpdateOpportunityDTO {
  name?: string;
  description?: string | null;
  stage_id?: string;
  account_id?: string | null;
  contact_id?: string | null;
  donation_id?: string | null;
  amount?: number | null;
  currency?: string;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  status?: OpportunityStatus;
  loss_reason?: string | null;
  source?: string | null;
  assigned_to?: string | null;
}

export interface CreateOpportunityStageDTO {
  name: string;
  stage_order?: number;
  probability?: number;
  is_closed?: boolean;
  is_won?: boolean;
  is_active?: boolean;
}
