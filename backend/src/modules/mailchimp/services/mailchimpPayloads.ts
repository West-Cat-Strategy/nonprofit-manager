import crypto from 'crypto';
import type {
  AddMemberRequest,
  CreateCampaignRequest,
  CreateSegmentRequest,
  MailchimpMergeFields,
  SyncResult,
  UpdateTagsRequest,
} from '@app-types/mailchimp';

export interface MailchimpContactRow {
  contact_id: string;
  account_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null;
  do_not_email?: boolean | null;
}

type MailchimpTagUpdate = {
  name: string;
  status: 'active' | 'inactive';
};

export type MailchimpCampaignCreatePayload = {
  type: 'regular';
  recipients: {
    list_id: string;
    segment_opts?: {
      saved_segment_id: number;
    };
  };
  settings: {
    subject_line: string;
    preview_text?: string;
    title: string;
    from_name: string;
    reply_to: string;
  };
};

export function getSubscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

export function isMailchimpNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { status?: number }).status === 404
  );
}

export function buildMemberUpsertPayload(request: AddMemberRequest) {
  return {
    email_address: request.email,
    status_if_new: request.status || 'subscribed',
    merge_fields: request.mergeFields || {},
  };
}

export function buildActiveTagUpdates(tags: string[]): MailchimpTagUpdate[] {
  return tags.map((name) => ({ name, status: 'active' as const }));
}

export function buildTagUpdates(
  request: Pick<UpdateTagsRequest, 'tagsToAdd' | 'tagsToRemove'>
): MailchimpTagUpdate[] {
  const tags: MailchimpTagUpdate[] = [];

  if (request.tagsToAdd) {
    tags.push(...request.tagsToAdd.map((name) => ({ name, status: 'active' as const })));
  }

  if (request.tagsToRemove) {
    tags.push(...request.tagsToRemove.map((name) => ({ name, status: 'inactive' as const })));
  }

  return tags;
}

export function buildContactMergeFields(contact: MailchimpContactRow): MailchimpMergeFields {
  return {
    FNAME: contact.first_name || '',
    LNAME: contact.last_name || '',
    PHONE: contact.phone || '',
    ADDRESS: {
      addr1: contact.address_line1 || '',
      addr2: contact.address_line2 || '',
      city: contact.city || '',
      state: contact.state_province || '',
      zip: contact.postal_code || '',
      country: contact.country || 'US',
    },
  };
}

export function createSkippedSyncResult(
  contactId: string,
  error: string,
  email = '',
  statusCode?: number
): SyncResult {
  return {
    contactId,
    email,
    success: false,
    action: 'skipped',
    error,
    statusCode,
  };
}

export function buildSegmentPayload(request: CreateSegmentRequest) {
  return {
    name: request.name,
    options: {
      match: request.matchType,
      conditions: request.conditions.map((condition) => ({
        condition_type: 'TextMerge' as const,
        field: condition.field,
        op: condition.op,
        value: String(condition.value),
      })),
    },
  };
}

export function buildCampaignCreatePayload(
  request: CreateCampaignRequest
): MailchimpCampaignCreatePayload {
  const campaignData: MailchimpCampaignCreatePayload = {
    type: 'regular',
    recipients: {
      list_id: request.listId,
    },
    settings: {
      subject_line: request.subject,
      preview_text: request.previewText,
      title: request.title,
      from_name: request.fromName,
      reply_to: request.replyTo,
    },
  };

  if (request.segmentId) {
    campaignData.recipients.segment_opts = {
      saved_segment_id: request.segmentId,
    };
  }

  return campaignData;
}

export function buildCampaignContentPayload(content: { html: string; plainText: string }) {
  return {
    html: content.html,
    plain_text: content.plainText,
  };
}

export function buildCampaignSchedulePayload(sendTime: Date) {
  return {
    schedule_time: sendTime.toISOString(),
  };
}
