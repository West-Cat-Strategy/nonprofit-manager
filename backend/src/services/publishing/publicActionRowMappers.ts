import type {
  PublicAction,
  PublicActionReviewStatus,
  PublicActionStatus,
  PublicActionSubmission,
  PublicActionSupportLetterArtifact,
  PublicActionType,
} from '@app-types/websiteBuilder';

export const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export const asBoolean = (value: unknown): boolean =>
  value === true || value === 'true' || value === 'on' || value === '1';

export const parseAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : null;
};

const toIso = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const mapActionRow = (row: Record<string, unknown>): PublicAction => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  appealCampaignId: (row.appeal_campaign_id as string | null) || null,
  pageId: (row.page_id as string | null) || null,
  componentId: (row.component_id as string | null) || null,
  actionType: row.action_type as PublicActionType,
  status: row.status as PublicActionStatus,
  slug: row.slug as string,
  title: row.title as string,
  description: (row.description as string | null) || null,
  settings: (row.settings as Record<string, unknown> | null) || {},
  confirmationMessage: (row.confirmation_message as string | null) || null,
  publishedAt: toIso(row.published_at),
  closedAt: toIso(row.closed_at),
  submissionCount: Number(row.submission_count || 0),
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

export const mapSubmissionRow = (row: Record<string, unknown>): PublicActionSubmission => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  actionId: row.action_id as string,
  actionType: row.action_type as PublicActionType,
  reviewStatus: row.review_status as PublicActionReviewStatus,
  contactId: (row.contact_id as string | null) || null,
  sourceEntityType: (row.source_entity_type as string | null) || null,
  sourceEntityId: (row.source_entity_id as string | null) || null,
  duplicateOfSubmissionId: (row.duplicate_of_submission_id as string | null) || null,
  consent: (row.consent as Record<string, unknown> | null) || {},
  payloadRedacted: (row.payload_redacted as Record<string, unknown> | null) || {},
  generatedArtifact: (row.generated_artifact as Record<string, unknown> | null) || {},
  pagePath: (row.page_path as string | null) || null,
  visitorId: (row.visitor_id as string | null) || null,
  sessionId: (row.session_id as string | null) || null,
  referrer: (row.referrer as string | null) || null,
  submittedAt: new Date(row.submitted_at as string).toISOString(),
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});

export const mapSupportLetterRow = (
  row: Record<string, unknown>
): PublicActionSupportLetterArtifact => ({
  id: row.id as string,
  organizationId: row.organization_id as string,
  siteId: row.site_id as string,
  actionId: row.action_id as string,
  submissionId: row.submission_id as string,
  contactId: (row.contact_id as string | null) || null,
  templateVersion: row.template_version as string,
  letterTitle: row.letter_title as string,
  letterBody: row.letter_body as string,
  approvalStatus: row.approval_status as PublicActionSupportLetterArtifact['approvalStatus'],
  generatedMetadata: (row.generated_metadata as Record<string, unknown> | null) || {},
  approvedAt: toIso(row.approved_at),
  approvedBy: (row.approved_by as string | null) || null,
  createdAt: new Date(row.created_at as string).toISOString(),
  updatedAt: new Date(row.updated_at as string).toISOString(),
});
