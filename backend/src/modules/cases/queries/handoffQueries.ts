import { Pool } from 'pg';
import { CaseHandoffPacket, CaseHandoffReassessmentSummary, CaseServiceSiteSnapshot } from '../types/handoff';
import { requireCaseOwnership } from './shared';

type ReassessmentRow = Omit<
  CaseHandoffReassessmentSummary,
  'due_date' | 'earliest_review_date' | 'latest_review_date' | 'completed_at'
> & {
  due_date: string | Date | null;
  earliest_review_date: string | Date | null;
  latest_review_date: string | Date | null;
  completed_at: string | Date | null;
};

const dateOnly = (value: string | Date | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toIsoDate = (value: string | Date | null): string | null => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const toIsoDateTime = (value: string | Date | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const daysUntil = (value: string | Date | null, today: Date): number | null => {
  const date = dateOnly(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
};

const pluralize = (count: number, label: string): string =>
  `${count} ${label}${count === 1 ? '' : 's'}`;

const isPendingFollowUp = (status: string | null): boolean =>
  status === 'pending' || status === 'scheduled';

const nullableText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const normalizeServiceSiteSnapshot = (value: unknown): CaseServiceSiteSnapshot | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  return {
    id: nullableText(snapshot.id),
    name: nullableText(snapshot.name),
    provider_name: nullableText(snapshot.provider_name),
    address_line1: nullableText(snapshot.address_line1),
    address_line2: nullableText(snapshot.address_line2),
    city: nullableText(snapshot.city),
    state_province: nullableText(snapshot.state_province),
    postal_code: nullableText(snapshot.postal_code),
    country: nullableText(snapshot.country),
    phone: nullableText(snapshot.phone),
    email: nullableText(snapshot.email),
    contact_name: nullableText(snapshot.contact_name),
    notes: nullableText(snapshot.notes),
  };
};

const mapReassessment = (row: ReassessmentRow): CaseHandoffReassessmentSummary => ({
  id: row.id,
  title: row.title,
  status: row.status,
  due_date: toIsoDate(row.due_date),
  earliest_review_date: toIsoDate(row.earliest_review_date),
  latest_review_date: toIsoDate(row.latest_review_date),
  completion_summary: row.completion_summary,
  cancellation_reason: row.cancellation_reason,
  completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
});

const buildReassessmentContinuity = (
  reassessments: CaseHandoffReassessmentSummary[],
  today: Date
): CaseHandoffPacket['continuity']['reassessment'] => {
  const active = reassessments.filter(
    (reassessment) => reassessment.status !== 'completed' && reassessment.status !== 'cancelled'
  );
  const closed = reassessments.filter(
    (reassessment) => reassessment.status === 'completed' || reassessment.status === 'cancelled'
  );
  const current = active[0] ?? null;
  const next = active[1] ?? null;
  const overdue = active.filter((reassessment) => {
    const dueDays = daysUntil(reassessment.due_date, today);
    return dueDays !== null && dueDays < 0;
  });
  const lapsed = active.filter((reassessment) => {
    const latestDays = daysUntil(reassessment.latest_review_date, today);
    return latestDays !== null && latestDays < 0;
  });
  const latestClosed = closed[0] ?? null;

  if (lapsed.length > 0) {
    return {
      status: 'lapsed',
      headline: `${pluralize(lapsed.length, 'reassessment window')} lapsed`,
      detail: 'Resolve lapsed reassessments before treating the case plan as current.',
      overdue_count: overdue.length,
      lapsed_count: lapsed.length,
      current,
      next,
      recent: closed.slice(0, 2),
    };
  }

  if (overdue.length > 0) {
    return {
      status: 'overdue',
      headline: `${pluralize(overdue.length, 'reassessment')} overdue`,
      detail: 'Complete, reschedule, or cancel overdue reassessments before handoff or closure.',
      overdue_count: overdue.length,
      lapsed_count: lapsed.length,
      current,
      next,
      recent: closed.slice(0, 2),
    };
  }

  if (current) {
    const dueDays = daysUntil(current.due_date, today);
    if (dueDays !== null && dueDays <= 7) {
      return {
        status: 'due_soon',
        headline: dueDays === 0 ? 'Reassessment due today' : `Reassessment due in ${pluralize(dueDays, 'day')}`,
        detail: 'Confirm the reassessment evidence before transferring or closing this case.',
        overdue_count: 0,
        lapsed_count: 0,
        current,
        next,
        recent: closed.slice(0, 2),
      };
    }

    return {
      status: 'current',
      headline: 'Reassessment cadence is scheduled',
      detail: 'The case has an active reassessment cadence for continuity review.',
      overdue_count: 0,
      lapsed_count: 0,
      current,
      next,
      recent: closed.slice(0, 2),
    };
  }

  if (latestClosed) {
    return {
      status: latestClosed.status === 'completed' ? 'completed' : 'cancelled',
      headline: latestClosed.status === 'completed' ? 'Recent reassessment evidence recorded' : 'Last reassessment cancelled',
      detail:
        latestClosed.status === 'completed'
          ? latestClosed.completion_summary || 'No active reassessment is scheduled after the latest completed cycle.'
          : latestClosed.cancellation_reason || 'No active reassessment is scheduled after the latest cancelled cycle.',
      overdue_count: 0,
      lapsed_count: 0,
      current: null,
      next: null,
      recent: closed.slice(0, 2),
    };
  }

  return {
    status: 'missing',
    headline: 'No reassessment cadence recorded',
    detail: 'Create a reassessment before claiming ongoing continuity evidence for this case.',
    overdue_count: 0,
    lapsed_count: 0,
    current: null,
    next: null,
    recent: [],
  };
};

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
      c.closed_date, c.closure_reason,
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

  const reassessmentsResult = await db.query<ReassessmentRow>(
    `
    SELECT
      id,
      title,
      status,
      due_date,
      earliest_review_date,
      latest_review_date,
      completion_summary,
      cancellation_reason,
      completed_at
    FROM case_reassessment_cycles
    WHERE case_id = $1
    ORDER BY
      CASE WHEN status IN ('scheduled', 'in_progress') THEN 0 ELSE 1 END,
      due_date ASC NULLS LAST,
      completed_at DESC NULLS LAST,
      updated_at DESC
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

  const fieldServicesResult = await db.query(
    `
    SELECT
      id,
      service_name as name,
      service_type as type,
      service_provider as provider,
      service_site_snapshot,
      status,
      service_date,
      outcome
    FROM case_services
    WHERE case_id = $1
    ORDER BY service_date DESC NULLS LAST, created_at DESC
    LIMIT 8
    `,
    [caseId]
  );

  const fieldFormsResult = await db.query(
    `
    SELECT
      id,
      title,
      status,
      due_at,
      sent_at,
      submitted_at,
      reviewed_at,
      recipient_email
    FROM case_form_assignments
    WHERE case_id = $1
    ORDER BY due_at ASC NULLS LAST, updated_at DESC, created_at DESC
    LIMIT 8
    `,
    [caseId]
  );

  const fieldAppointmentsResult = await db.query(
    `
    SELECT
      a.id,
      a.title,
      a.status,
      a.start_time,
      a.end_time,
      a.location,
      COALESCE(a.service_site_snapshot, slot.service_site_snapshot) as service_site_snapshot,
      a.request_type,
      u.first_name as pointperson_first_name,
      u.last_name as pointperson_last_name,
      u.email as pointperson_email
    FROM appointments a
    LEFT JOIN users u ON u.id = a.pointperson_user_id
    LEFT JOIN appointment_availability_slots slot ON slot.id = a.slot_id
    WHERE a.case_id = $1
    ORDER BY
      CASE WHEN a.status IN ('requested', 'confirmed') THEN 0 ELSE 1 END,
      a.start_time ASC
    LIMIT 8
    `,
    [caseId]
  );

  const artifacts = artifactsResult.rows[0];
  const milestones = milestonesResult.rows;
  const followUps = followUpsResult.rows;
  const reassessments = reassessmentsResult.rows.map(mapReassessment);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reassessmentContinuity = buildReassessmentContinuity(reassessments, today);

  const overdueMilestones = milestones.filter(m => !m.is_completed && m.due_date && new Date(m.due_date) < new Date());
  const overdueFollowUps = followUps.filter(f => isPendingFollowUp(f.status) && f.due_date && new Date(f.due_date) < new Date());
  const pendingMilestones = milestones.filter(m => !m.is_completed);
  const pendingFollowUps = followUps.filter(f => isPendingFollowUp(f.status));

  const riskSummary: string[] = [];
  if (caseRow.is_urgent) riskSummary.push('Marked as Urgent');
  if (['high', 'critical', 'urgent'].includes(caseRow.priority?.toLowerCase())) riskSummary.push('High Priority');
  if (overdueMilestones.length > 0) riskSummary.push(`${overdueMilestones.length} Overdue Milestones`);
  if (overdueFollowUps.length > 0) riskSummary.push(`${overdueFollowUps.length} Overdue Follow-ups`);
  if (reassessmentContinuity.overdue_count > 0) {
    riskSummary.push(`${reassessmentContinuity.overdue_count} Overdue Reassessments`);
  }
  if (reassessmentContinuity.lapsed_count > 0) {
    riskSummary.push(`${reassessmentContinuity.lapsed_count} Lapsed Reassessment Windows`);
  }

  const openActionCues: string[] = [];
  if (pendingMilestones.length > 0) openActionCues.push(`${pluralize(pendingMilestones.length, 'pending milestone')}`);
  if (pendingFollowUps.length > 0) openActionCues.push(`${pluralize(pendingFollowUps.length, 'pending follow-up')}`);
  if (reassessmentContinuity.status === 'missing') openActionCues.push('no reassessment cadence');
  if (reassessmentContinuity.overdue_count > 0) {
    openActionCues.push(`${pluralize(reassessmentContinuity.overdue_count, 'overdue reassessment')}`);
  }
  if (reassessmentContinuity.lapsed_count > 0) {
    openActionCues.push(`${pluralize(reassessmentContinuity.lapsed_count, 'lapsed reassessment window')}`);
  }

  const handoffReadinessCues = openActionCues.length > 0
    ? openActionCues
    : ['handoff packet has no pending milestones, follow-ups, or reassessment blockers'];
  const isClosed = caseRow.status_type === 'closed';
  const closureCues: string[] = [];
  if (isClosed) {
    if (caseRow.closure_reason) {
      closureCues.push(`closure reason recorded: ${caseRow.closure_reason}`);
    } else {
      closureCues.push('closed case is missing a closure reason');
    }
    if (caseRow.closed_date) closureCues.push(`closed ${toIsoDate(caseRow.closed_date)}`);
    closureCues.push(...openActionCues);
  } else if (openActionCues.length > 0) {
    closureCues.push(...openActionCues.map((cue) => `${cue} before closure`));
  } else {
    closureCues.push('no pending case-detail actions blocking closure continuity');
  }

  const closureStatus: CaseHandoffPacket['continuity']['closure']['status'] = isClosed
    ? caseRow.closure_reason && openActionCues.length === 0
      ? 'closed_with_evidence'
      : 'closed_needs_review'
    : openActionCues.length > 0
      ? 'open_actions'
      : 'ready';

  const assignedStaff = caseRow.assigned_email ? {
    first_name: caseRow.assigned_first_name,
    last_name: caseRow.assigned_last_name,
    email: caseRow.assigned_email
  } : null;
  const contact = {
    first_name: caseRow.contact_first_name,
    last_name: caseRow.contact_last_name,
    email: caseRow.contact_email
  };
  const portalVisibilityStatus = caseRow.client_viewable ? 'Visible to Client' : 'Internal Only';

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
      closed_date: toIsoDate(caseRow.closed_date),
      closure_reason: caseRow.closure_reason,
      assigned_staff: assignedStaff,
      contact
    },
    risks: {
      is_urgent: caseRow.is_urgent,
      is_high_priority: ['high', 'critical', 'urgent'].includes(caseRow.priority?.toLowerCase()),
      overdue_milestones_count: overdueMilestones.length,
      overdue_follow_ups_count: overdueFollowUps.length,
      risk_summary: riskSummary
    },
    continuity: {
      reassessment: reassessmentContinuity,
      handoff_readiness: {
        status: openActionCues.length > 0 ? 'needs_attention' : 'ready',
        cues: handoffReadinessCues
      },
      closure: {
        status: closureStatus,
        cues: closureCues
      }
    },
    next_actions: {
      pending_milestones: pendingMilestones.map(m => ({ id: m.id, name: m.name, due_date: m.due_date })),
      pending_follow_ups: pendingFollowUps.map(f => ({ id: f.id, title: f.title, due_date: f.due_date }))
    },
    visibility: {
      client_viewable: caseRow.client_viewable,
      portal_visibility_status: portalVisibilityStatus
    },
    artifacts_summary: {
      services_count: artifacts.services_count,
      forms_count: artifacts.forms_count,
      appointments_count: artifacts.appointments_count,
      notes_count: artifacts.notes_count,
      documents_count: artifacts.documents_count
    },
    field_packet: {
      scope: {
        summary: [
          'Portable staff review packet assembled from existing case-detail records',
          'Includes current service, form, appointment, visibility, reassessment, next-action, and assignment context',
          'Does not create an offline sync bundle, service-site routing record, referral transfer, or persisted packet entity'
        ],
        offline_sync_included: false,
        service_site_routing_included: false,
        referral_transfer_included: false,
        persisted_packet_included: false
      },
      assignment_context: {
        assigned_staff: assignedStaff,
        contact,
        case_status: caseRow.status_name,
        priority: caseRow.priority,
        portal_visibility_status: portalVisibilityStatus
      },
      services: fieldServicesResult.rows.map((service) => ({
        id: service.id,
        name: service.name,
        type: service.type,
        provider: service.provider,
        service_site_snapshot: normalizeServiceSiteSnapshot(service.service_site_snapshot),
        status: service.status,
        service_date: toIsoDate(service.service_date),
        outcome: service.outcome
      })),
      forms: fieldFormsResult.rows.map((form) => ({
        id: form.id,
        title: form.title,
        status: form.status,
        due_at: toIsoDateTime(form.due_at),
        sent_at: toIsoDateTime(form.sent_at),
        submitted_at: toIsoDateTime(form.submitted_at),
        reviewed_at: toIsoDateTime(form.reviewed_at),
        recipient_email: form.recipient_email
      })),
      appointments: fieldAppointmentsResult.rows.map((appointment) => ({
        id: appointment.id,
        title: appointment.title,
        status: appointment.status,
        start_time: toIsoDateTime(appointment.start_time) || new Date(appointment.start_time).toISOString(),
        end_time: toIsoDateTime(appointment.end_time),
        location: appointment.location,
        service_site_snapshot: normalizeServiceSiteSnapshot(appointment.service_site_snapshot),
        request_type: appointment.request_type,
        pointperson: appointment.pointperson_email ? {
          first_name: appointment.pointperson_first_name,
          last_name: appointment.pointperson_last_name,
          email: appointment.pointperson_email
        } : null
      }))
    },
    generated_at: new Date().toISOString()
  };
};
