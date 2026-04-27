import { PgExecutor } from './lifecycleQueries';
import { CaseClosureChecklist, CreateCaseClosureChecklistDTO } from '@app-types/case';

export const createCaseClosureChecklistQuery = async (
  db: PgExecutor,
  caseId: string,
  statusId: string,
  data: CreateCaseClosureChecklistDTO,
  organizationId: string,
  userId?: string
): Promise<CaseClosureChecklist> => {
  const result = await db.query(
    `
    INSERT INTO case_closure_checklists (
      organization_id,
      case_id,
      status_id,
      final_summary,
      open_follow_ups_resolved,
      portal_visibility_governance,
      reassignment_referral_notes,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
    `,
    [
      organizationId,
      caseId,
      statusId,
      data.final_summary,
      data.open_follow_ups_resolved,
      JSON.stringify(data.portal_visibility_governance || {}),
      data.reassignment_referral_notes || null,
      userId || null
    ]
  );

  return result.rows[0];
};

export const getCaseClosureChecklistQuery = async (
  db: PgExecutor,
  caseId: string
): Promise<CaseClosureChecklist | null> => {
  const result = await db.query(
    `
    SELECT *
    FROM case_closure_checklists
    WHERE case_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [caseId]
  );

  return result.rows[0] || null;
};
