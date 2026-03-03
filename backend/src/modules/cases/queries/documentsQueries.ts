import { Pool } from 'pg';
import type { CaseDocument, UpdateCaseDocumentDTO } from '@app-types/case';
import { requireCaseIdForDocument, requireCaseOwnership, resolveVisibleToClient } from './shared';

export const getCaseDocumentsQuery = async (db: Pool, caseId: string): Promise<CaseDocument[]> => {
  await requireCaseOwnership(db, caseId);
  const result = await db.query(
    `
    SELECT
      cd.*,
      COALESCE(cd.original_filename, cd.document_name) AS original_filename,
      COALESCE(cd.file_size, 0)::bigint AS file_size,
      u.first_name,
      u.last_name
    FROM case_documents cd
    LEFT JOIN users u ON u.id = cd.uploaded_by
    WHERE cd.case_id = $1
      AND COALESCE(cd.is_active, true) = true
    ORDER BY COALESCE(cd.created_at, cd.uploaded_at) DESC, cd.uploaded_at DESC
  `,
    [caseId]
  );
  return result.rows;
};

export const getCaseDocumentByIdQuery = async (
  db: Pool,
  caseId: string,
  documentId: string
): Promise<CaseDocument | null> => {
  await requireCaseOwnership(db, caseId);
  const result = await db.query(
    `
    SELECT
      cd.*,
      COALESCE(cd.original_filename, cd.document_name) AS original_filename,
      COALESCE(cd.file_size, 0)::bigint AS file_size
    FROM case_documents cd
    WHERE cd.id = $1
      AND cd.case_id = $2
      AND COALESCE(cd.is_active, true) = true
    LIMIT 1
  `,
    [documentId, caseId]
  );
  return result.rows[0] || null;
};

export const createCaseDocumentQuery = async (
  db: Pool,
  input: {
    caseId: string;
    fileName: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType?: string;
    documentName?: string;
    description?: string;
    visibleToClient?: boolean;
    userId?: string;
  }
): Promise<CaseDocument> => {
  const ownership = await requireCaseOwnership(db, input.caseId);

  const result = await db.query(
    `
    INSERT INTO case_documents (
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
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), $12, NOW(), NOW(), $12
    )
    RETURNING *
  `,
    [
      input.caseId,
      ownership.account_id,
      input.documentName?.trim() || input.originalFilename,
      input.documentType || 'other',
      input.description?.trim() || null,
      input.filePath,
      input.fileSize,
      input.mimeType,
      input.fileName,
      input.originalFilename,
      input.visibleToClient || false,
      input.userId || null,
    ]
  );

  return result.rows[0];
};

export const updateCaseDocumentQuery = async (
  db: Pool,
  documentId: string,
  data: UpdateCaseDocumentDTO,
  userId?: string
): Promise<CaseDocument> => {
  const caseId = await requireCaseIdForDocument(db, documentId);
  await requireCaseOwnership(db, caseId);

  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (data.document_name !== undefined) {
    fields.push(`document_name = $${index++}`);
    values.push(data.document_name || null);
  }

  if (data.document_type !== undefined) {
    fields.push(`document_type = $${index++}`);
    values.push(data.document_type || null);
  }

  if (data.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(data.description || null);
  }

  if (data.visible_to_client !== undefined || data.is_portal_visible !== undefined) {
    fields.push(`visible_to_client = $${index++}`);
    values.push(
      resolveVisibleToClient({
        visible_to_client: data.visible_to_client,
        is_portal_visible: data.is_portal_visible,
      })
    );
  }

  if (data.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(data.is_active);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${index++}`);
  values.push(userId || null);
  values.push(documentId, caseId);

  const result = await db.query(
    `
    UPDATE case_documents
    SET ${fields.join(', ')}
    WHERE id = $${index}
      AND case_id = $${index + 1}
    RETURNING *
  `,
    values
  );

  if (!result.rows[0]) {
    throw new Error('Case document not found');
  }

  return result.rows[0];
};

export const deleteCaseDocumentQuery = async (
  db: Pool,
  documentId: string,
  userId?: string
): Promise<boolean> => {
  const caseId = await requireCaseIdForDocument(db, documentId);
  await requireCaseOwnership(db, caseId);

  const result = await db.query(
    `
    UPDATE case_documents
    SET is_active = false, updated_at = NOW(), updated_by = $2
    WHERE id = $1
      AND case_id = $3
    RETURNING id
  `,
    [documentId, userId || null, caseId]
  );
  return Boolean(result.rows[0]);
};
