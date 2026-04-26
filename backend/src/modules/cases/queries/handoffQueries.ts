import { Pool } from 'pg';
import { CaseHandoffPacket } from '../types/handoff';
import { requireCaseOwnership } from './shared';

export const getCaseHandoffPacketQuery = async (
  db: Pool,
  caseId: string,
  organizationId?: string
): Promise<CaseHandoffPacket> => {
  await requireCaseOwnership(db, caseId, organizationId);

  const caseResult = await db.query(
    `
    SELECT 
      c.id, c.case_number, c.title, c.priority, c.is_urgent, c.description, c.client_viewable,
      cs.name as status_name, cs.status_type,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name, u.email as assigned_email,
      con.first_name as contact_first_name, con.last_name as contact_last_name, con.email as contact_email
    FROM cases c
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    LEFT JOIN users u ON c.assigned_to = u.id
    LEFT JOIN contacts con ON c.contact_id = con.id
    WHERE c.id = $1
    `,
    [caseId]
  );

  const caseRow = caseResult.rows[0];
  if (!caseRow) {
    throw new Error('Case not found');
  }

  const milestonesResult = await db.query(
    `
    SELECT id, milestone_name as name, due_date, is_completed
    FROM case_milestones
    WHERE case_id = $1
    ORDER BY due_date ASC NULLS LAST
    `,
    [caseId]
  );

  const followUpsResult = await db.query(
    `
    SELECT id, title, scheduled_date as due_date, status
    FROM follow_ups
    WHERE entity_type = 'case' AND entity_id = $1
    ORDER BY scheduled_date ASC NULLS LAST
    `,
    [caseId]
  );

  const artifactsResult = await db.query(
    `
    SELECT
      (SELECT COUNT(*)::int FROM case_services WHERE case_id = $1) as services_count,
      (SELECT COUNT(*)::int FROM case_form_assignments WHERE case_id = $1) as forms_count,
      (SELECT COUNT(*)::int FROM appointments WHERE case_id = $1) as appointments_count,
      (SELECT COUNT(*)::int FROM case_notes WHERE case_id = $1) as notes_count,
      (SELECT COUNT(*)::int FROM case_documents WHERE case_id = $1) as documents_count
    `,
    [caseId]
  );

  const artifacts = artifactsResult.rows[0];
  const milestones = milestonesResult.rows;
  const followUps = followUpsResult.rows;

  const overdueMilestones = milestones.filter(m => !m.is_completed && m.due_date && new Date(m.due_date) < new Date());
  const overdueFollowUps = followUps.filter(f => f.status === 'pending' && f.due_date && new Date(f.due_date) < new Date());
  const pendingMilestones = milestones.filter(m => !m.is_completed);
  const pendingFollowUps = followUps.filter(f => f.status === 'pending');

  const riskSummary: string[] = [];
  if (caseRow.is_urgent) riskSummary.push('Marked as Urgent');
  if (['high', 'critical', 'urgent'].includes(caseRow.priority?.toLowerCase())) riskSummary.push('High Priority');
  if (overdueMilestones.length > 0) riskSummary.push(`${overdueMilestones.length} Overdue Milestones`);
  if (overdueFollowUps.length > 0) riskSummary.push(`${overdueFollowUps.length} Overdue Follow-ups`);

  return {
    case_details: {
      id: caseRow.id,
      case_number: caseRow.case_number,
      title: caseRow.title,
      status_name: caseRow.status_name,
      status_type: caseRow.status_type,
      priority: caseRow.priority,
      is_urgent: caseRow.is_urgent,
      description: caseRow.description,
      assigned_staff: caseRow.assigned_email ? {
        first_name: caseRow.assigned_first_name,
        last_name: caseRow.assigned_last_name,
        email: caseRow.assigned_email
      } : null,
      contact: {
        first_name: caseRow.contact_first_name,
        last_name: caseRow.contact_last_name,
        email: caseRow.contact_email
      }
    },
    risks: {
      is_urgent: caseRow.is_urgent,
      is_high_priority: ['high', 'critical', 'urgent'].includes(caseRow.priority?.toLowerCase()),
      overdue_milestones_count: overdueMilestones.length,
      overdue_follow_ups_count: overdueFollowUps.length,
      risk_summary: riskSummary
    },
    next_actions: {
      pending_milestones: pendingMilestones.map(m => ({ id: m.id, name: m.name, due_date: m.due_date })),
      pending_follow_ups: pendingFollowUps.map(f => ({ id: f.id, title: f.title, due_date: f.due_date }))
    },
    visibility: {
      client_viewable: caseRow.client_viewable,
      portal_visibility_status: caseRow.client_viewable ? 'Visible to Client' : 'Internal Only'
    },
    artifacts_summary: {
      services_count: artifacts.services_count,
      forms_count: artifacts.forms_count,
      appointments_count: artifacts.appointments_count,
      notes_count: artifacts.notes_count,
      documents_count: artifacts.documents_count
    },
    generated_at: new Date().toISOString()
  };
};
