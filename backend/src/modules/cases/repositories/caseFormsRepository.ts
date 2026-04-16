import pool from '@config/database';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type {
  CaseFormAsset,
  CaseFormAssignment,
  CaseFormDefault,
  CaseFormSchema,
  CaseFormSubmission,
} from '@app-types/caseForms';

type DbExecutor = Pool | PoolClient;

export interface CaseFormAssignmentRecord extends CaseFormAssignment {
  account_id?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  client_viewable?: boolean | null;
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

const assignmentSelect = `
  SELECT
    cfa.*,
    c.case_number,
    c.title AS case_title,
    c.client_viewable,
    ct.first_name AS contact_first_name,
    ct.last_name AS contact_last_name
  FROM case_form_assignments cfa
  INNER JOIN cases c ON c.id = cfa.case_id
  INNER JOIN contacts ct ON ct.id = cfa.contact_id
`;

const submissionSelect = `
  SELECT
    cfs.*
  FROM case_form_submissions cfs
`;

const assetSelect = `
  SELECT
    cfa.*
  FROM case_form_assets cfa
`;

const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const parseJsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
};

const mapDefault = (row: QueryResultRow): CaseFormDefault => ({
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

const mapAssignment = (row: QueryResultRow): CaseFormAssignmentRecord => ({
  id: String(row.id),
  case_id: String(row.case_id),
  contact_id: String(row.contact_id),
  account_id: (row.account_id as string | null | undefined) ?? null,
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
  latest_submission: null,
});

const mapSubmission = (row: QueryResultRow): CaseFormSubmission => ({
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

const mapAsset = (row: QueryResultRow): CaseFormAsset => ({
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

export class CaseFormsRepository {
  constructor(private readonly db: Pool = pool) {}

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listDefaultsByCaseType(caseTypeId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    const result = await this.db.query(
      `SELECT *
       FROM case_form_defaults
       WHERE case_type_id = $1
         AND ($2::uuid IS NULL OR account_id IS NULL OR account_id = $2::uuid)
       ORDER BY is_active DESC, updated_at DESC, created_at DESC`,
      [caseTypeId, organizationId || null]
    );
    return result.rows.map(mapDefault);
  }

  async getDefaultById(defaultId: string, organizationId?: string): Promise<CaseFormDefault | null> {
    const result = await this.db.query(
      `SELECT *
       FROM case_form_defaults
       WHERE id = $1
         AND ($2::uuid IS NULL OR account_id IS NULL OR account_id = $2::uuid)
       LIMIT 1`,
      [defaultId, organizationId || null]
    );
    return result.rows[0] ? mapDefault(result.rows[0]) : null;
  }

  async createDefault(
    executor: DbExecutor,
    input: {
      caseTypeId: string;
      organizationId?: string | null;
      title: string;
      description?: string | null;
      schema: CaseFormSchema;
      isActive: boolean;
      userId?: string | null;
    }
  ): Promise<CaseFormDefault> {
    const result = await executor.query(
      `INSERT INTO case_form_defaults (
         case_type_id,
         account_id,
         title,
         description,
         schema,
         version,
         is_active,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5::jsonb, 1, $6, $7, $7)
       RETURNING *`,
      [
        input.caseTypeId,
        input.organizationId || null,
        input.title,
        input.description || null,
        JSON.stringify(input.schema),
        input.isActive,
        input.userId || null,
      ]
    );
    return mapDefault(result.rows[0]);
  }

  async updateDefault(
    executor: DbExecutor,
    defaultId: string,
    input: {
      title?: string;
      description?: string | null;
      schema?: CaseFormSchema;
      isActive?: boolean;
      userId?: string | null;
    }
  ): Promise<CaseFormDefault> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(input.description || null);
    }
    if (input.schema !== undefined) {
      fields.push(`schema = $${index++}::jsonb`);
      values.push(JSON.stringify(input.schema));
      fields.push('version = version + 1');
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(input.isActive);
    }

    fields.push('updated_at = NOW()');
    fields.push(`updated_by = $${index++}`);
    values.push(input.userId || null);
    values.push(defaultId);

    const result = await executor.query(
      `UPDATE case_form_defaults
       SET ${fields.join(', ')}
       WHERE id = $${index}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      throw Object.assign(new Error('Form default not found'), { statusCode: 404, code: 'not_found' });
    }
    return mapDefault(result.rows[0]);
  }

  async listRecommendedDefaultsForCase(caseId: string, organizationId?: string): Promise<CaseFormDefault[]> {
    const result = await this.db.query(
      `SELECT DISTINCT cfd.*
       FROM cases c
       LEFT JOIN case_type_assignments cta ON cta.case_id = c.id
       INNER JOIN case_form_defaults cfd
         ON cfd.case_type_id = COALESCE(cta.case_type_id, c.case_type_id)
       LEFT JOIN contacts ct ON ct.id = c.contact_id
       WHERE c.id = $1
         AND cfd.is_active = true
         AND ($2::uuid IS NULL OR COALESCE(c.account_id, ct.account_id) = $2::uuid)
         AND ($2::uuid IS NULL OR cfd.account_id IS NULL OR cfd.account_id = $2::uuid)
       ORDER BY cfd.updated_at DESC, cfd.created_at DESC`,
      [caseId, organizationId || null]
    );
    return result.rows.map(mapDefault);
  }

  async listAssignmentsForCase(caseId: string, organizationId?: string): Promise<CaseFormAssignmentRecord[]> {
    const result = await this.db.query(
      `${assignmentSelect}
       LEFT JOIN contacts scoped_contact ON scoped_contact.id = c.contact_id
       WHERE cfa.case_id = $1
         AND ($2::uuid IS NULL OR COALESCE(c.account_id, scoped_contact.account_id) = $2::uuid)
       ORDER BY cfa.updated_at DESC, cfa.created_at DESC`,
      [caseId, organizationId || null]
    );
    return result.rows.map(mapAssignment);
  }

  async listAssignmentsForPortal(contactId: string, status?: string): Promise<CaseFormAssignmentRecord[]> {
    const result = await this.db.query(
      `${assignmentSelect}
       WHERE cfa.contact_id = $1
         AND c.client_viewable = true
         AND ($2::text IS NULL OR cfa.status = $2::text)
       ORDER BY COALESCE(cfa.submitted_at, cfa.sent_at, cfa.updated_at) DESC, cfa.updated_at DESC`,
      [contactId, status || null]
    );
    return result.rows.map(mapAssignment);
  }

  async getAssignmentById(assignmentId: string): Promise<CaseFormAssignmentRecord | null> {
    const result = await this.db.query(
      `${assignmentSelect}
       WHERE cfa.id = $1
       LIMIT 1`,
      [assignmentId]
    );
    return result.rows[0] ? mapAssignment(result.rows[0]) : null;
  }

  async createAssignment(
    executor: DbExecutor,
    input: {
      caseId: string;
      contactId: string;
      accountId?: string | null;
      caseTypeId?: string | null;
      sourceDefaultId?: string | null;
      sourceDefaultVersion?: number | null;
      title: string;
      description?: string | null;
      schema: CaseFormSchema;
      dueAt?: string | null;
      recipientEmail?: string | null;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    const result = await executor.query(
      `INSERT INTO case_form_assignments (
         case_id,
         contact_id,
         account_id,
         case_type_id,
         source_default_id,
         source_default_version,
         title,
         description,
         status,
         schema,
         current_draft_answers,
         due_at,
         recipient_email,
         created_by,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9::jsonb, '{}'::jsonb, $10, $11, $12, $12)
       RETURNING *`,
      [
        input.caseId,
        input.contactId,
        input.accountId || null,
        input.caseTypeId || null,
        input.sourceDefaultId || null,
        input.sourceDefaultVersion ?? null,
        input.title,
        input.description || null,
        JSON.stringify(input.schema),
        input.dueAt || null,
        input.recipientEmail || null,
        input.userId || null,
      ]
    );
    return this.getAssignmentById(String(result.rows[0].id)) as Promise<CaseFormAssignmentRecord>;
  }

  async updateAssignment(
    executor: DbExecutor,
    assignmentId: string,
    input: {
      title?: string;
      description?: string | null;
      schema?: CaseFormSchema;
      dueAt?: string | null;
      recipientEmail?: string | null;
      status?: string;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(input.description || null);
    }
    if (input.schema !== undefined) {
      fields.push(`schema = $${index++}::jsonb`);
      values.push(JSON.stringify(input.schema));
    }
    if (input.dueAt !== undefined) {
      fields.push(`due_at = $${index++}`);
      values.push(input.dueAt || null);
    }
    if (input.recipientEmail !== undefined) {
      fields.push(`recipient_email = $${index++}`);
      values.push(input.recipientEmail || null);
    }
    if (input.status !== undefined) {
      fields.push(`status = $${index++}`);
      values.push(input.status);
    }

    fields.push('updated_at = NOW()');
    fields.push(`updated_by = $${index++}`);
    values.push(input.userId || null);
    values.push(assignmentId);

    await executor.query(
      `UPDATE case_form_assignments
       SET ${fields.join(', ')}
       WHERE id = $${index}`,
      values
    );

    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return assignment;
  }

  async saveDraft(
    executor: DbExecutor,
    assignmentId: string,
    answers: Record<string, unknown>,
    input: {
      status: string;
      userId?: string | null;
    }
  ): Promise<CaseFormAssignmentRecord> {
    await executor.query(
      `UPDATE case_form_assignments
       SET current_draft_answers = $2::jsonb,
           last_draft_saved_at = NOW(),
           status = $3,
           updated_at = NOW(),
           updated_by = $4
       WHERE id = $1`,
      [assignmentId, JSON.stringify(answers), input.status, input.userId || null]
    );

    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) {
      throw Object.assign(new Error('Form assignment not found'), { statusCode: 404, code: 'not_found' });
    }
    return assignment;
  }

  async markAssignmentViewed(executor: DbExecutor, assignmentId: string): Promise<void> {
    await executor.query(
      `UPDATE case_form_assignments
       SET viewed_at = COALESCE(viewed_at, NOW()),
           status = CASE
             WHEN status = 'sent' THEN 'viewed'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [assignmentId]
    );
  }

  async markAssignmentAfterSubmission(
    executor: DbExecutor,
    assignmentId: string,
    answers: Record<string, unknown>,
    userId?: string | null
  ): Promise<void> {
    await executor.query(
      `UPDATE case_form_assignments
       SET current_draft_answers = $2::jsonb,
           last_draft_saved_at = NOW(),
           status = 'submitted',
           submitted_at = NOW(),
           updated_at = NOW(),
           updated_by = $3
       WHERE id = $1`,
      [assignmentId, JSON.stringify(answers), userId || null]
    );
  }

  async markAssignmentReviewDecision(
    executor: DbExecutor,
    assignmentId: string,
    input: {
      status: 'reviewed' | 'closed' | 'cancelled';
      userId?: string | null;
    }
  ): Promise<void> {
    const timestampField =
      input.status === 'reviewed'
        ? 'reviewed_at'
        : input.status === 'closed'
          ? 'closed_at'
          : null;

    const assignments: string[] = [
      'status = $2',
      'updated_at = NOW()',
      'updated_by = $3',
    ];
    if (timestampField) {
      assignments.push(`${timestampField} = COALESCE(${timestampField}, NOW())`);
    }

    await executor.query(
      `UPDATE case_form_assignments
       SET ${assignments.join(', ')}
       WHERE id = $1`,
      [assignmentId, input.status, input.userId || null]
    );
  }

  async getSubmissionByClientSubmissionId(
    assignmentId: string,
    clientSubmissionId: string
  ): Promise<CaseFormSubmission | null> {
    const result = await this.db.query(
      `${submissionSelect}
       WHERE cfs.assignment_id = $1
         AND cfs.client_submission_id = $2
       LIMIT 1`,
      [assignmentId, clientSubmissionId]
    );
    return result.rows[0] ? mapSubmission(result.rows[0]) : null;
  }

  async listSubmissionsForAssignment(assignmentId: string): Promise<CaseFormSubmission[]> {
    const result = await this.db.query(
      `${submissionSelect}
       WHERE cfs.assignment_id = $1
       ORDER BY cfs.created_at DESC, cfs.submission_number DESC`,
      [assignmentId]
    );
    return result.rows.map(mapSubmission);
  }

  async getNextSubmissionNumber(executor: DbExecutor, assignmentId: string): Promise<number> {
    const result = await executor.query<{ next_number: string }>(
      `SELECT COALESCE(MAX(submission_number), 0) + 1 AS next_number
       FROM case_form_submissions
       WHERE assignment_id = $1`,
      [assignmentId]
    );
    return Number(result.rows[0]?.next_number ?? 1);
  }

  async createSubmission(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      submissionNumber: number;
      answers: Record<string, unknown>;
      mappingAudit: unknown[];
      clientSubmissionId?: string | null;
      actorType: 'staff' | 'portal' | 'public';
      submittedByUserId?: string | null;
      submittedByPortalUserId?: string | null;
      accessTokenId?: string | null;
      responsePacketFileName?: string | null;
      responsePacketFilePath?: string | null;
      responsePacketCaseDocumentId?: string | null;
      responsePacketContactDocumentId?: string | null;
    }
  ): Promise<CaseFormSubmission> {
    const result = await executor.query(
      `INSERT INTO case_form_submissions (
         assignment_id,
         case_id,
         contact_id,
         submission_number,
         client_submission_id,
         answers,
         mapping_audit,
         response_packet_file_name,
         response_packet_file_path,
         response_packet_case_document_id,
         response_packet_contact_document_id,
         submitted_by_actor_type,
         submitted_by_user_id,
         submitted_by_portal_user_id,
         access_token_id
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        input.assignmentId,
        input.caseId,
        input.contactId,
        input.submissionNumber,
        input.clientSubmissionId || null,
        JSON.stringify(input.answers),
        JSON.stringify(input.mappingAudit),
        input.responsePacketFileName || null,
        input.responsePacketFilePath || null,
        input.responsePacketCaseDocumentId || null,
        input.responsePacketContactDocumentId || null,
        input.actorType,
        input.submittedByUserId || null,
        input.submittedByPortalUserId || null,
        input.accessTokenId || null,
      ]
    );
    return mapSubmission(result.rows[0]);
  }

  async listAssetsForAssignment(assignmentId: string): Promise<CaseFormAsset[]> {
    const result = await this.db.query(
      `${assetSelect}
       WHERE cfa.assignment_id = $1
       ORDER BY cfa.created_at DESC`,
      [assignmentId]
    );
    return result.rows.map(mapAsset);
  }

  async listAssetsForSubmissionIds(submissionIds: string[]): Promise<CaseFormAsset[]> {
    if (submissionIds.length === 0) {
      return [];
    }
    const result = await this.db.query(
      `${assetSelect}
       WHERE cfa.submission_id = ANY($1::uuid[])
       ORDER BY cfa.created_at DESC`,
      [submissionIds]
    );
    return result.rows.map(mapAsset);
  }

  async createAsset(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      questionKey: string;
      assetKind: 'upload' | 'signature';
      fileName: string;
      originalName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      actorType: 'staff' | 'portal' | 'public';
      userId?: string | null;
      portalUserId?: string | null;
    }
  ): Promise<CaseFormAsset> {
    const result = await executor.query(
      `INSERT INTO case_form_assets (
         assignment_id,
         case_id,
         contact_id,
         asset_kind,
         question_key,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         created_by_actor_type,
         created_by_user_id,
         created_by_portal_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.assignmentId,
        input.caseId,
        input.contactId,
        input.assetKind,
        input.questionKey,
        input.fileName,
        input.originalName,
        input.filePath,
        input.fileSize,
        input.mimeType,
        input.actorType,
        input.userId || null,
        input.portalUserId || null,
      ]
    );
    return mapAsset(result.rows[0]);
  }

  async linkAssetsToSubmission(executor: DbExecutor, assetIds: string[], submissionId: string): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }
    await executor.query(
      `UPDATE case_form_assets
       SET submission_id = $2
       WHERE id = ANY($1::uuid[])`,
      [assetIds, submissionId]
    );
  }

  async createAccessToken(
    executor: DbExecutor,
    input: {
      assignmentId: string;
      caseId: string;
      contactId: string;
      recipientEmail?: string | null;
      tokenHash: string;
      expiresAt: string | Date;
      userId?: string | null;
    }
  ): Promise<string> {
    const result = await executor.query<{ id: string }>(
      `INSERT INTO case_form_access_tokens (
         assignment_id,
         case_id,
         contact_id,
         recipient_email,
         token_hash,
         expires_at,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.assignmentId,
        input.caseId,
        input.contactId,
        input.recipientEmail || null,
        input.tokenHash,
        input.expiresAt,
        input.userId || null,
      ]
    );
    return result.rows[0].id;
  }

  async revokeAccessTokens(executor: DbExecutor, assignmentId: string): Promise<void> {
    await executor.query(
      `UPDATE case_form_access_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE assignment_id = $1
         AND revoked_at IS NULL`,
      [assignmentId]
    );
  }

  async getAccessTokenByHash(tokenHash: string): Promise<CaseFormAccessTokenRecord | null> {
    const result = await this.db.query(
      `SELECT
         cfat.*,
         cfa.case_id AS assignment_case_id
       FROM case_form_access_tokens cfat
       INNER JOIN case_form_assignments cfa ON cfa.id = cfat.assignment_id
       WHERE cfat.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const assignment = await this.getAssignmentById(String(row.assignment_id));
    if (!assignment) {
      return null;
    }

    return {
      id: String(row.id),
      assignment_id: String(row.assignment_id),
      case_id: String(row.case_id),
      contact_id: String(row.contact_id),
      recipient_email: (row.recipient_email as string | null | undefined) ?? null,
      token_hash: String(row.token_hash),
      expires_at: row.expires_at as Date | string,
      revoked_at: (row.revoked_at as Date | string | null | undefined) ?? null,
      last_viewed_at: (row.last_viewed_at as Date | string | null | undefined) ?? null,
      last_used_at: (row.last_used_at as Date | string | null | undefined) ?? null,
      latest_submission_id: (row.latest_submission_id as string | null | undefined) ?? null,
      created_by: (row.created_by as string | null | undefined) ?? null,
      created_at: row.created_at as Date | string,
      assignment,
    };
  }

  async markAccessTokenViewed(executor: DbExecutor, tokenId: string): Promise<void> {
    await executor.query(
      `UPDATE case_form_access_tokens
       SET last_viewed_at = COALESCE(last_viewed_at, NOW()),
           last_used_at = NOW()
       WHERE id = $1`,
      [tokenId]
    );
  }

  async markAccessTokenUsed(
    executor: DbExecutor,
    tokenId: string,
    latestSubmissionId?: string | null
  ): Promise<void> {
    await executor.query(
      `UPDATE case_form_access_tokens
       SET last_used_at = NOW(),
           latest_submission_id = COALESCE($2, latest_submission_id)
       WHERE id = $1`,
      [tokenId, latestSubmissionId || null]
    );
  }

  async updateContactFields(
    executor: DbExecutor,
    contactId: string,
    patch: Record<string, unknown>
  ): Promise<void> {
    const entries = Object.entries(patch);
    if (entries.length === 0) {
      return;
    }
    const assignments = entries.map(([field], idx) => `${field} = $${idx + 2}`);
    const values = entries.map(([, value]) => value);
    await executor.query(
      `UPDATE contacts
       SET ${assignments.join(', ')}
       WHERE id = $1`,
      [contactId, ...values]
    );
  }

  async updateCaseJsonField(
    executor: DbExecutor,
    caseId: string,
    container: 'intake_data' | 'custom_data',
    key: string,
    value: unknown
  ): Promise<void> {
    await executor.query(
      `UPDATE cases
       SET ${container} = jsonb_set(
         COALESCE(${container}, '{}'::jsonb),
         $2::text[],
         $3::jsonb,
         true
       )
       WHERE id = $1`,
      [caseId, [key], JSON.stringify(value)]
    );
  }

  async createCaseDocumentRecord(
    executor: DbExecutor,
    input: {
      caseId: string;
      accountId?: string | null;
      documentName: string;
      documentType: string;
      description?: string | null;
      filePath: string;
      fileSize: number;
      mimeType: string;
      fileName: string;
      originalFilename: string;
      visibleToClient: boolean;
      userId?: string | null;
    }
  ): Promise<string> {
    const result = await executor.query<{ id: string }>(
      `INSERT INTO case_documents (
         case_id,
         account_id,
         document_name,
         document_type,
         description,
         file_path,
         file_size,
         mime_type,
         file_name,
         original_filename,
         visible_to_client,
         is_active,
         uploaded_at,
         uploaded_by,
         created_at,
         updated_at,
         updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), $12, NOW(), NOW(), $12)
       RETURNING id`,
      [
        input.caseId,
        input.accountId || null,
        input.documentName,
        input.documentType,
        input.description || null,
        input.filePath,
        input.fileSize,
        input.mimeType,
        input.fileName,
        input.originalFilename,
        input.visibleToClient,
        input.userId || null,
      ]
    );
    return result.rows[0].id;
  }

  async createContactDocumentRecord(
    executor: DbExecutor,
    input: {
      contactId: string;
      caseId: string;
      documentType: string;
      title: string;
      description?: string | null;
      fileName: string;
      originalName: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      portalVisible: boolean;
      userId?: string | null;
    }
  ): Promise<string> {
    const result = await executor.query<{ id: string }>(
      `INSERT INTO contact_documents (
         contact_id,
         case_id,
         file_name,
         original_name,
         file_path,
         file_size,
         mime_type,
         document_type,
         title,
         description,
         is_portal_visible,
         portal_visible_at,
         portal_visible_by,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       RETURNING id`,
      [
        input.contactId,
        input.caseId,
        input.fileName,
        input.originalName,
        input.filePath,
        input.fileSize,
        input.mimeType,
        input.documentType,
        input.title,
        input.description || null,
        input.portalVisible,
        input.portalVisible ? new Date() : null,
        input.portalVisible ? input.userId || null : null,
      ]
    );
    return result.rows[0].id;
  }
}
