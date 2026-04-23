import type {
  MailchimpCampaign,
  MailchimpList,
  MailchimpMember,
  MailchimpMemberStatus,
  MailchimpSegment,
  MailchimpTag,
} from '@app-types/mailchimp';

interface RawMailchimpList {
  id: string;
  name: string;
  stats: { member_count: number };
  date_created: string;
  double_optin: boolean;
}

interface RawMailchimpMemberTag {
  name: string;
}

interface RawMailchimpMember {
  id: string;
  email_address: string;
  status: string;
  merge_fields: MailchimpMember['mergeFields'];
  tags?: RawMailchimpMemberTag[];
  list_id: string;
  timestamp_signup?: string;
  timestamp_opt?: string;
  last_changed: string;
}

interface RawMailchimpTagSegment {
  id: number;
  name: string;
  member_count: number;
}

interface RawMailchimpSegment extends RawMailchimpTagSegment {
  list_id: string;
  created_at: string;
  updated_at: string;
}

interface RawMailchimpCampaignReportSummary {
  opens: number;
  unique_opens: number;
  open_rate: number;
  clicks: number;
  subscriber_clicks: number;
  click_rate: number;
}

interface RawMailchimpCampaign {
  id: string;
  type: string;
  status: string;
  settings: { title: string; subject_line: string };
  recipients: { list_id: string };
  create_time: string;
  send_time?: string;
  emails_sent: number;
  report_summary?: RawMailchimpCampaignReportSummary;
}

export function mapMailchimpList(list: RawMailchimpList): MailchimpList {
  return {
    id: list.id,
    name: list.name,
    memberCount: list.stats.member_count,
    createdAt: new Date(list.date_created),
    doubleOptIn: list.double_optin,
  };
}

export function mapMailchimpMember(member: RawMailchimpMember): MailchimpMember {
  const createdAt = member.timestamp_signup || member.timestamp_opt || '';

  return {
    id: member.id,
    emailAddress: member.email_address,
    status: member.status as MailchimpMemberStatus,
    mergeFields: member.merge_fields,
    tags: member.tags?.map((tag) => tag.name) || [],
    listId: member.list_id,
    createdAt: new Date(createdAt),
    lastChanged: new Date(member.last_changed),
  };
}

export function mapMailchimpTag(segment: RawMailchimpTagSegment): MailchimpTag {
  return {
    id: segment.id,
    name: segment.name,
    memberCount: segment.member_count,
  };
}

export function mapMailchimpSegment(segment: RawMailchimpSegment): MailchimpSegment {
  return {
    id: segment.id,
    name: segment.name,
    memberCount: segment.member_count,
    listId: segment.list_id,
    createdAt: new Date(segment.created_at),
    updatedAt: new Date(segment.updated_at),
  };
}

export function mapMailchimpCampaign(campaign: RawMailchimpCampaign): MailchimpCampaign {
  return {
    id: campaign.id,
    type: campaign.type as MailchimpCampaign['type'],
    status: campaign.status as MailchimpCampaign['status'],
    title: campaign.settings.title,
    subject: campaign.settings.subject_line,
    listId: campaign.recipients.list_id,
    createdAt: new Date(campaign.create_time),
    sendTime: campaign.send_time ? new Date(campaign.send_time) : undefined,
    emailsSent: campaign.emails_sent,
    reportSummary: campaign.report_summary
      ? {
          opens: campaign.report_summary.opens,
          uniqueOpens: campaign.report_summary.unique_opens,
          openRate: campaign.report_summary.open_rate,
          clicks: campaign.report_summary.clicks,
          uniqueClicks: campaign.report_summary.subscriber_clicks,
          clickRate: campaign.report_summary.click_rate,
          unsubscribes: 0,
        }
      : undefined,
  };
}
