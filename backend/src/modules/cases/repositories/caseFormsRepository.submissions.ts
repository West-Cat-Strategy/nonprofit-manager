import type {
  CaseFormAsset,
  CaseFormSubmission,
} from '@app-types/caseForms';
import type {
  CaseFormAccessTokenRecord,
  DbExecutor,
} from './caseFormsRepository.shared';
import {
  assetSelect,
  mapAsset,
  mapSubmission,
  submissionSelect,
} from './caseFormsRepository.shared';
import { getAssignmentById } from './caseFormsRepository.assignments';

export async function getSubmissionByClientSubmissionId(
  db: DbExecutor,
  assignmentId: string,
  clientSubmissionId: string
): Promise<CaseFormSubmission | null> {
  const result = await db.query(
    `${submissionSelect}
     WHERE cfs.assignment_id = $1
       AND cfs.client_submission_id = $2
     LIMIT 1`,
    [assignmentId, clientSubmissionId]
  );
  return result.rows[0] ? mapSubmission(result.rows[0]) : null;
}

export async function listSubmissionsForAssignment(
  db: DbExecutor,
  assignmentId: string
): Promise<CaseFormSubmission[]> {
  const result = await db.query(
    `${submissionSelect}
     WHERE cfs.assignment_id = $1
     ORDER BY cfs.created_at DESC, cfs.submission_number DESC`,
    [assignmentId]
  );
  return result.rows.map(mapSubmission);
}

export async function getNextSubmissionNumber(
  executor: DbExecutor,
  assignmentId: string
): Promise<number> {
  const result = await executor.query<{ next_number: string }>(
    `SELECT COALESCE(MAX(submission_number), 0) + 1 AS next_number
     FROM case_form_submissions
     WHERE assignment_id = $1`,
    [assignmentId]
  );
  return Number(result.rows[0]?.next_number ?? 1);
}

export async function createSubmission(
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

export async function listAssetsForAssignment(
  db: DbExecutor,
  assignmentId: string
): Promise<CaseFormAsset[]> {
  const result = await db.query(
    `${assetSelect}
     WHERE cfa.assignment_id = $1
     ORDER BY cfa.created_at DESC`,
    [assignmentId]
  );
  return result.rows.map(mapAsset);
}

export async function listAssetsForSubmissionIds(
  db: DbExecutor,
  submissionIds: string[]
): Promise<CaseFormAsset[]> {
  if (submissionIds.length === 0) {
    return [];
  }
  const result = await db.query(
    `${assetSelect}
     WHERE cfa.submission_id = ANY($1::uuid[])
     ORDER BY cfa.created_at DESC`,
    [submissionIds]
  );
  return result.rows.map(mapAsset);
}

export async function createAsset(
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

export async function linkAssetsToSubmission(
  executor: DbExecutor,
  assetIds: string[],
  submissionId: string
): Promise<void> {
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

export async function createAccessToken(
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

export async function revokeAccessTokens(
  executor: DbExecutor,
  assignmentId: string
): Promise<void> {
  await executor.query(
    `UPDATE case_form_access_tokens
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE assignment_id = $1
       AND revoked_at IS NULL`,
    [assignmentId]
  );
}

export async function getAccessTokenByHash(
  db: DbExecutor,
  tokenHash: string
): Promise<CaseFormAccessTokenRecord | null> {
  const result = await db.query(
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

  const assignment = await getAssignmentById(db, String(row.assignment_id));
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

export async function markAccessTokenViewed(executor: DbExecutor, tokenId: string): Promise<void> {
  await executor.query(
    `UPDATE case_form_access_tokens
     SET last_viewed_at = COALESCE(last_viewed_at, NOW()),
         last_used_at = NOW()
     WHERE id = $1`,
    [tokenId]
  );
}

export async function markAccessTokenUsed(
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

export async function updateContactFields(
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

export async function updateCaseJsonField(
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

export async function createCaseDocumentRecord(
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

export async function createContactDocumentRecord(
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
