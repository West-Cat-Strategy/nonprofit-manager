import type { CaseFormDefault, CaseFormSchema } from '@app-types/caseForms';
import type { DbExecutor } from './caseFormsRepository.shared';
import { mapDefault } from './caseFormsRepository.shared';

export async function listDefaultsByCaseType(
  db: DbExecutor,
  caseTypeId: string,
  organizationId?: string
): Promise<CaseFormDefault[]> {
  const result = await db.query(
    `SELECT *
     FROM case_form_defaults
     WHERE case_type_id = $1
       AND ($2::uuid IS NULL OR account_id IS NULL OR account_id = $2::uuid)
     ORDER BY is_active DESC, updated_at DESC, created_at DESC`,
    [caseTypeId, organizationId || null]
  );
  return result.rows.map(mapDefault);
}

export async function getDefaultById(
  db: DbExecutor,
  defaultId: string,
  organizationId?: string
): Promise<CaseFormDefault | null> {
  const result = await db.query(
    `SELECT *
     FROM case_form_defaults
     WHERE id = $1
       AND ($2::uuid IS NULL OR account_id IS NULL OR account_id = $2::uuid)
     LIMIT 1`,
    [defaultId, organizationId || null]
  );
  return result.rows[0] ? mapDefault(result.rows[0]) : null;
}

export async function createDefault(
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

export async function updateDefault(
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

export async function listRecommendedDefaultsForCase(
  db: DbExecutor,
  caseId: string,
  organizationId?: string
): Promise<CaseFormDefault[]> {
  const result = await db.query(
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
