import type {
  CreateCampaignRequest as MailchimpCreateCampaignRequest,
  EmailBuilderContent,
  MailchimpCampaign,
  MailchimpList,
  MailchimpCampaignPreview,
  MailchimpStatus,
} from './mailchimp';

export type CommunicationProvider = 'local_email' | 'mailchimp';

export type CommunicationCampaignRunStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'canceled';

export type CommunicationRecipientStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'suppressed'
  | 'canceled';

export interface CommunicationProviderStatus {
  configured?: boolean;
  provider?: CommunicationProvider;
  localEmail: {
    configured: boolean;
    provider?: CommunicationProvider;
    ready?: boolean;
    fromAddress?: string | null;
    fromName?: string | null;
    lastTestedAt?: Date | null;
    lastTestSuccess?: boolean | null;
  };
  mailchimp: MailchimpStatus;
  providers?: Partial<Record<CommunicationProvider, {
    provider: CommunicationProvider;
    configured: boolean;
    ready?: boolean;
    accountName?: string;
    audienceCount?: number;
    fromAddress?: string | null;
    fromName?: string | null;
  }>>;
  defaultProvider: CommunicationProvider;
}

export type CommunicationProviderAudience = MailchimpList & {
  provider: CommunicationProvider;
  description?: string;
  isDefault?: boolean;
};

export interface CommunicationsSelectedContactsAudienceFilters {
  source: 'communications_selected_contacts';
  contactIds: string[];
  provider?: CommunicationProvider;
  listId?: string;
}

export interface CommunicationAudience {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  sourceCount: number;
  scopeAccountIds: string[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface CreateCommunicationAudienceRequest {
  name: string;
  description?: string;
  filters: CommunicationsSelectedContactsAudienceFilters;
  scopeAccountIds?: string[];
}

export interface CommunicationAudiencePreviewRequest {
  contactIds?: string[];
  includeAudienceId?: string;
  exclusionAudienceIds?: string[];
  priorRunSuppressionIds?: string[];
}

export interface CommunicationAudiencePreview {
  requestedContactCount: number;
  eligibleContactCount: number;
  missingEmailCount: number;
  doNotEmailCount: number;
  suppressedCount: number;
  targetContactIds: string[];
  suppressedContactIds: string[];
}

export interface CommunicationCampaignRun {
  id: string;
  provider: CommunicationProvider;
  providerCampaignId?: string | null;
  title: string;
  listId?: string | null;
  includeAudienceId?: string | null;
  exclusionAudienceIds: string[];
  suppressionSnapshot: unknown[];
  testRecipients: string[];
  audienceSnapshot: Record<string, unknown>;
  contentSnapshot: Record<string, unknown>;
  requestedSendTime?: Date | null;
  status: CommunicationCampaignRunStatus;
  counts: Record<string, unknown>;
  scopeAccountIds: string[];
  failureMessage?: string | null;
  requestedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CommunicationCampaignStatus = MailchimpCampaign['status'] | CommunicationCampaignRunStatus;

export interface CommunicationCampaign {
  id: string;
  provider: CommunicationProvider;
  campaignRunId?: string;
  providerCampaignId?: string | null;
  type: MailchimpCampaign['type'];
  status: CommunicationCampaignStatus;
  title: string;
  subject?: string;
  listId: string;
  createdAt: Date;
  sendTime?: Date | null;
  emailsSent?: number;
  reportSummary?: MailchimpCampaign['reportSummary'];
}

export interface CommunicationCampaignRecipient {
  id: string;
  campaignRunId: string;
  contactId?: string | null;
  email: string;
  status: CommunicationRecipientStatus;
  contactName?: string | null;
  failureMessage?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationCampaignRecipientList {
  runId: string;
  status?: CommunicationRecipientStatus;
  limit: number;
  recipients: CommunicationCampaignRecipient[];
}

export interface CreateCommunicationCampaignRequest {
  provider?: CommunicationProvider;
  listId?: string;
  title: string;
  subject: string;
  previewText?: string;
  fromName: string;
  replyTo: string;
  htmlContent?: string;
  plainTextContent?: string;
  builderContent?: EmailBuilderContent;
  segmentId?: number;
  sendTime?: Date;
  includeAudienceId?: string;
  exclusionAudienceIds?: string[];
  priorRunSuppressionIds?: string[];
  suppressionSnapshot?: unknown[];
  testRecipients?: string[];
  audienceSnapshot?: Record<string, unknown>;
  contactIds?: string[];
  requestedBy?: string;
  scopeAccountIds?: string[];
}

export interface CommunicationCampaignActionResult {
  run: CommunicationCampaignRun;
  action:
    | 'sent'
    | 'queued'
    | 'processed_batch'
    | 'refreshed'
    | 'canceled'
    | 'rescheduled'
    | 'unsupported';
  message: string;
}

export interface CommunicationCampaignRescheduleRequest {
  sendTime: Date;
}

export interface CommunicationCampaignTestSendRequest
  extends Omit<CreateCommunicationCampaignRequest, 'testRecipients'> {
  testRecipients: string[];
}

export interface CommunicationCampaignTestSendResponse {
  delivered: boolean;
  recipients: string[];
  providerCampaignId?: string | null;
  message: string;
}

export type CommunicationCampaignPreview = MailchimpCampaignPreview;
export type MailchimpCompatibleCampaignRequest = MailchimpCreateCampaignRequest;
