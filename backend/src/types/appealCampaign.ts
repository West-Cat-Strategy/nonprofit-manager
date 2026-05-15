export type AppealCampaignKind = 'appeal' | 'campaign';
export type AppealCampaignStatus = 'draft' | 'active' | 'completed' | 'archived';
export type AppealCampaignProvider = 'local_email' | 'mailchimp' | 'mautic';

export interface AppealCampaignProviderLink {
  id: string;
  appealCampaignId: string;
  organizationId: string;
  provider: AppealCampaignProvider;
  providerCampaignId: string | null;
  providerAudienceId: string | null;
  label: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppealCampaign {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  description: string | null;
  kind: AppealCampaignKind;
  status: AppealCampaignStatus;
  startDate: string | null;
  endDate: string | null;
  compatibilityLabels: string[];
  metadata: Record<string, unknown>;
  createdBy: string | null;
  modifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
  providerLinks?: AppealCampaignProviderLink[];
}

export interface AppealCampaignProviderLinkInput {
  provider: AppealCampaignProvider;
  providerCampaignId?: string | null;
  providerAudienceId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateAppealCampaignInput {
  code?: string;
  name: string;
  description?: string | null;
  kind?: AppealCampaignKind;
  status?: AppealCampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
  compatibilityLabels?: string[];
  providerLinks?: AppealCampaignProviderLinkInput[];
  metadata?: Record<string, unknown>;
}

export interface UpdateAppealCampaignInput {
  code?: string;
  name?: string;
  description?: string | null;
  kind?: AppealCampaignKind;
  status?: AppealCampaignStatus;
  startDate?: string | null;
  endDate?: string | null;
  compatibilityLabels?: string[];
  providerLinks?: AppealCampaignProviderLinkInput[];
  metadata?: Record<string, unknown>;
}
