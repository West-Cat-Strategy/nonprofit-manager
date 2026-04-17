import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormDeliveryTarget,
  CaseFormDefault,
  CaseFormSchema,
  CaseFormSubmission,
} from '@app-types/caseForms';

export type DbExecutor = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export interface CaseFormAssignmentRecord extends CaseFormAssignment {
  account_id?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  client_viewable?: boolean | null;
  case_assigned_to?: string | null;
  review_follow_up_id?: string | null;
}

export interface CaseFormAccessTokenRecord {
  id: string;
  assignment_id: string;
  case_id: string;
  contact_id: string;
  recipient_email?: string | null;
  token_hash: string;
  expires_at: Date | string;
  revoked_at?: Date | string | null;
  last_viewed_at?: Date | string | null;
  last_used_at?: Date | string | null;
  latest_submission_id?: string | null;
  created_by?: string | null;
  created_at: Date | string;
  assignment: CaseFormAssignmentRecord;
}

export const assignmentSelect = `
  SELECT
    cfa.*,
    COALESCE(cfa.account_id, c.account_id, ct.account_id) AS scoped_account_id,
    c.case_number,
    c.title AS case_title,
    c.client_viewable,
    c.assigned_to AS case_assigned_to,
    ct.first_name AS contact_first_name,
    ct.last_name AS contact_last_name
  FROM case_form_assignments cfa
  INNER JOIN cases c ON c.id = cfa.case_id
  INNER JOIN contacts ct ON ct.id = cfa.contact_id
`;

export const submissionSelect = `
  SELECT
    cfs.*
  FROM case_form_submissions cfs
`;

export const assetSelect = `
  SELECT
    cfa.*
  FROM case_form_assets cfa
`;

export const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const parseJsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
};

export const mapDefault = (row: QueryResultRow): CaseFormDefault => ({
  id: String(row.id),
  case_type_id: String(row.case_type_id),
  account_id: (row.account_id as string | null | undefined) ?? null,
  title: String(row.title),
  description: (row.description as string | null | undefined) ?? null,
  schema: (row.schema as CaseFormSchema) ?? { version: 1, title: String(row.title), sections: [] },
  version: Number(row.version ?? 1),
  is_active: Boolean(row.is_active),
  created_at: row.created_at as Date | string,
  updated_at: row.updated_at as Date | string,
  created_by: (row.created_by as string | null | undefined) ?? null,
  updated_by: (row.updated_by as string | null | undefined) ?? null,
});

export const mapAssignment = (row: QueryResultRow): CaseFormAssignmentRecord => ({
  id: String(row.id),
  case_id: String(row.case_id),
  contact_id: String(row.contact_id),
  account_id:
    (row.scoped_account_id as string | null | undefined)
    ?? (row.account_id as string | null | undefined)
    ?? null,
  case_type_id: (row.case_type_id as string | null | undefined) ?? null,
  source_default_id: (row.source_default_id as string | null | undefined) ?? null,
  source_default_version: row.source_default_version == null ? null : Number(row.source_default_version),
  title: String(row.title),
  description: (row.description as string | null | undefined) ?? null,
  status: String(row.status) as CaseFormAssignment['status'],
  schema: (row.schema as CaseFormSchema) ?? { version: 1, title: String(row.title), sections: [] },
  current_draft_answers: parseJsonRecord(row.current_draft_answers),
  last_draft_saved_at: (row.last_draft_saved_at as Date | string | null | undefined) ?? null,
  due_at: (row.due_at as Date | string | null | undefined) ?? null,
  recipient_email: (row.recipient_email as string | null | undefined) ?? null,
  delivery_target: (row.delivery_target as CaseFormDeliveryTarget | null | undefined) ?? null,
  sent_at: (row.sent_at as Date | string | null | undefined) ?? null,
  viewed_at: (row.viewed_at as Date | string | null | undefined) ?? null,
  submitted_at: (row.submitted_at as Date | string | null | undefined) ?? null,
  reviewed_at: (row.reviewed_at as Date | string | null | undefined) ?? null,
  closed_at: (row.closed_at as Date | string | null | undefined) ?? null,
  created_at: row.created_at as Date | string,
  updated_at: row.updated_at as Date | string,
  created_by: (row.created_by as string | null | undefined) ?? null,
  updated_by: (row.updated_by as string | null | undefined) ?? null,
  case_number: (row.case_number as string | null | undefined) ?? null,
  case_title: (row.case_title as string | null | undefined) ?? null,
  contact_first_name: (row.contact_first_name as string | null | undefined) ?? null,
  contact_last_name: (row.contact_last_name as string | null | undefined) ?? null,
  client_viewable: (row.client_viewable as boolean | null | undefined) ?? null,
  case_assigned_to: (row.case_assigned_to as string | null | undefined) ?? null,
  review_follow_up_id: (row.review_follow_up_id as string | null | undefined) ?? null,
  latest_submission: null,
});

export const mapSubmission = (row: QueryResultRow): CaseFormSubmission => ({
  id: String(row.id),
  assignment_id: String(row.assignment_id),
  case_id: String(row.case_id),
  contact_id: String(row.contact_id),
  submission_number: Number(row.submission_number ?? 1),
  client_submission_id: (row.client_submission_id as string | null | undefined) ?? null,
  answers: parseJsonRecord(row.answers),
  mapping_audit: parseJsonArray(row.mapping_audit),
  asset_refs: [],
  signature_refs: [],
  response_packet_file_name: (row.response_packet_file_name as string | null | undefined) ?? null,
  response_packet_file_path: (row.response_packet_file_path as string | null | undefined) ?? null,
  response_packet_case_document_id:
    (row.response_packet_case_document_id as string | null | undefined) ?? null,
  response_packet_contact_document_id:
    (row.response_packet_contact_document_id as string | null | undefined) ?? null,
  submitted_by_actor_type: String(row.submitted_by_actor_type) as CaseFormSubmission['submitted_by_actor_type'],
  submitted_by_user_id: (row.submitted_by_user_id as string | null | undefined) ?? null,
  submitted_by_portal_user_id: (row.submitted_by_portal_user_id as string | null | undefined) ?? null,
  access_token_id: (row.access_token_id as string | null | undefined) ?? null,
  created_at: row.created_at as Date | string,
});

export const mapAsset = (row: QueryResultRow): CaseFormAsset => ({
  id: String(row.id),
  assignment_id: String(row.assignment_id),
  case_id: String(row.case_id),
  contact_id: String(row.contact_id),
  asset_kind: String(row.asset_kind) as CaseFormAsset['asset_kind'],
  question_key: String(row.question_key),
  file_name: String(row.file_name),
  original_name: String(row.original_name),
  file_path: String(row.file_path),
  file_size: Number(row.file_size ?? 0),
  mime_type: String(row.mime_type),
  created_by_actor_type: String(row.created_by_actor_type) as CaseFormAsset['created_by_actor_type'],
  created_by_user_id: (row.created_by_user_id as string | null | undefined) ?? null,
  created_by_portal_user_id: (row.created_by_portal_user_id as string | null | undefined) ?? null,
  submission_id: (row.submission_id as string | null | undefined) ?? null,
  created_at: row.created_at as Date | string,
});
