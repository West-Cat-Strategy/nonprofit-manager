import pool from '@config/database';

export interface CreatePortalEscalationInput {
  caseId: string;
  accountId?: string | null;
  contactId?: string | null;
  portalUserId?: string | null;
  createdByPortalUserId?: string | null;
  category?: string;
  reason: string;
  severity?: 'low' | 'normal' | 'high' | 'urgent';
  sensitivity?: 'standard' | 'sensitive';
  assigneeUserId?: string | null;
  slaDueAt?: Date | null;
  createdBy?: string | null;
}

export interface PortalEscalation {
  id: string;
  caseId: string;
  contactId: string | null;
  accountId: string | null;
  portalUserId: string | null;
  createdByPortalUserId: string | null;
  category: string;
  reason: string;
  severity: CreatePortalEscalationInput['severity'];
  sensitivity: CreatePortalEscalationInput['sensitivity'];
  assigneeUserId: string | null;
  slaDueAt: Date | null;
  status: 'open' | 'in_review' | 'resolved' | 'referred';
  resolutionSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePortalEscalationInput {
  id: string;
  caseId: string;
  accountId?: string | null;
  status?: PortalEscalation['status'];
  resolutionSummary?: string | null;
  assigneeUserId?: string | null;
  slaDueAt?: Date | null;
  updatedBy?: string | null;
}

interface PortalEscalationRow {
  id: string;
  case_id: string;
  account_id: string | null;
  contact_id: string | null;
  portal_user_id: string | null;
  created_by_portal_user_id: string | null;
  category: string;
  reason: string;
  severity: CreatePortalEscalationInput['severity'];
  sensitivity: CreatePortalEscalationInput['sensitivity'];
  assignee_user_id: string | null;
  sla_due_at: Date | null;
  status: PortalEscalation['status'];
  resolution_summary: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRow = (row: PortalEscalationRow): PortalEscalation => ({
  id: row.id,
  caseId: row.case_id,
  accountId: row.account_id,
  contactId: row.contact_id,
  portalUserId: row.portal_user_id,
  createdByPortalUserId: row.created_by_portal_user_id,
  category: row.category,
  reason: row.reason,
  severity: row.severity,
  sensitivity: row.sensitivity,
  assigneeUserId: row.assignee_user_id,
  slaDueAt: row.sla_due_at,
  status: row.status,
  resolutionSummary: row.resolution_summary,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const basePortalEscalationSelect = `
  SELECT pe.id, pe.case_id, pe.account_id, pe.contact_id, pe.portal_user_id,
         pe.created_by_portal_user_id, pe.category, pe.reason, pe.severity,
         pe.sensitivity, pe.assignee_user_id, pe.sla_due_at, pe.status,
         pe.resolution_summary, pe.created_at, pe.updated_at
  FROM portal_escalations pe
`;

export async function createPortalEscalation(
  input: CreatePortalEscalationInput
): Promise<PortalEscalation> {
  const result = await pool.query<PortalEscalationRow>(
    `INSERT INTO portal_escalations (
       case_id, account_id, contact_id, portal_user_id, created_by_portal_user_id,
       category, reason, severity, sensitivity, assignee_user_id, sla_due_at,
       created_by, updated_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING id, case_id, account_id, contact_id, portal_user_id, created_by_portal_user_id,
               category, reason, severity, sensitivity, assignee_user_id, sla_due_at,
               status, resolution_summary, created_at, updated_at`,
    [
      input.caseId,
      input.accountId ?? null,
      input.contactId ?? null,
      input.portalUserId ?? null,
      input.createdByPortalUserId ?? null,
      input.category ?? 'case_review',
      input.reason.trim(),
      input.severity ?? 'normal',
      input.sensitivity ?? 'standard',
      input.assigneeUserId ?? null,
      input.slaDueAt ?? null,
      input.createdBy ?? null,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listPortalEscalationsForCase(
  caseId: string,
  accountId?: string | null
): Promise<PortalEscalation[]> {
  const result = await pool.query<PortalEscalationRow>(
    `${basePortalEscalationSelect}
     JOIN cases c ON c.id = pe.case_id
     WHERE pe.case_id = $1
       AND ($2::uuid IS NULL OR c.account_id = $2 OR pe.account_id = $2)
     ORDER BY pe.created_at DESC`,
    [caseId, accountId ?? null]
  );

  return result.rows.map(mapRow);
}

export async function updatePortalEscalationForCase(
  input: UpdatePortalEscalationInput
): Promise<PortalEscalation> {
  const result = await pool.query<PortalEscalationRow>(
    `UPDATE portal_escalations pe
     SET status = COALESCE($3, pe.status),
         resolution_summary = CASE WHEN $4::boolean THEN $5 ELSE pe.resolution_summary END,
         assignee_user_id = CASE WHEN $6::boolean THEN $7 ELSE pe.assignee_user_id END,
         sla_due_at = CASE WHEN $8::boolean THEN $9 ELSE pe.sla_due_at END,
         resolved_at = CASE
           WHEN $3 IN ('resolved', 'referred') THEN COALESCE(pe.resolved_at, CURRENT_TIMESTAMP)
           WHEN $3 IN ('open', 'in_review') THEN NULL
           ELSE pe.resolved_at
         END,
         updated_by = $10,
         updated_at = CURRENT_TIMESTAMP
     FROM cases c
     WHERE pe.id = $1
       AND pe.case_id = $2
       AND c.id = pe.case_id
       AND ($11::uuid IS NULL OR c.account_id = $11 OR pe.account_id = $11)
     RETURNING pe.id, pe.case_id, pe.account_id, pe.contact_id, pe.portal_user_id,
               pe.created_by_portal_user_id, pe.category, pe.reason, pe.severity,
               pe.sensitivity, pe.assignee_user_id, pe.sla_due_at, pe.status,
               pe.resolution_summary, pe.created_at, pe.updated_at`,
    [
      input.id,
      input.caseId,
      input.status ?? null,
      Object.prototype.hasOwnProperty.call(input, 'resolutionSummary'),
      input.resolutionSummary ?? null,
      Object.prototype.hasOwnProperty.call(input, 'assigneeUserId'),
      input.assigneeUserId ?? null,
      Object.prototype.hasOwnProperty.call(input, 'slaDueAt'),
      input.slaDueAt ?? null,
      input.updatedBy ?? null,
      input.accountId ?? null,
    ]
  );

  if (!result.rows[0]) {
    const error = new Error('Portal escalation not found for case') as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  return mapRow(result.rows[0]);
}

export const portalEscalationService = {
  createPortalEscalation,
  listPortalEscalationsForCase,
  updatePortalEscalationForCase,
};

export default portalEscalationService;
