import { Pool } from 'pg';
import pool from '@config/database';
import type {
  WorkflowCoverageFilters,
  WorkflowCoverageItem,
  WorkflowCoverageMissingFilter,
  WorkflowCoverageReportResult,
} from '@app-types/report';

const missingFilterClauses: Record<WorkflowCoverageMissingFilter, string> = {
  note: '(final_rows.missing_appointment_note_count > 0 OR final_rows.missing_follow_up_note_count > 0)',
  outcome:
    '(final_rows.missing_appointment_outcome_count > 0 OR final_rows.missing_follow_up_outcome_count > 0 OR final_rows.missing_case_status_outcome_count > 0)',
  reminder: 'final_rows.missing_reminder_offer_count > 0',
  attendance: 'final_rows.missing_attendance_linkage_count > 0',
};

export class WorkflowCoverageReportService {
  constructor(private readonly pool: Pool) {}

  async getWorkflowCoverageReport(
    organizationId: string,
    filters: WorkflowCoverageFilters = {}
  ): Promise<WorkflowCoverageReportResult> {
    const values: unknown[] = [organizationId];
    const caseConditions = [`COALESCE(c.account_id, con.account_id) = $1`];

    if (filters.ownerId) {
      values.push(filters.ownerId);
      caseConditions.push(`c.assigned_to = $${values.length}`);
    }

    if (filters.statusType) {
      values.push(filters.statusType);
      caseConditions.push(`cs.status_type = $${values.length}`);
    }

    const finalConditions = ['final_rows.total_gaps > 0'];
    if (filters.missing) {
      finalConditions.push(missingFilterClauses[filters.missing]);
    }

    const query = `
      WITH base_cases AS (
        SELECT
          c.id AS case_id,
          c.case_number,
          c.title AS case_title,
          c.contact_id,
          c.assigned_to,
          NULLIF(BTRIM(CONCAT(COALESCE(assignee.first_name, ''), ' ', COALESCE(assignee.last_name, ''))), '') AS assigned_to_name,
          cs.id AS status_id,
          cs.name AS status_name,
          cs.status_type,
          NULLIF(BTRIM(CONCAT(COALESCE(con.first_name, ''), ' ', COALESCE(con.last_name, ''))), '') AS contact_name
        FROM cases c
        LEFT JOIN contacts con ON con.id = c.contact_id
        LEFT JOIN users assignee ON assignee.id = c.assigned_to
        LEFT JOIN case_statuses cs ON cs.id = c.status_id
        WHERE ${caseConditions.join(' AND ')}
      ),
      conversation_gaps AS (
        SELECT
          t.case_id,
          COUNT(*) FILTER (
            WHERE t.status = 'open'
               OR COALESCE(resolution_counts.linked_note_count, 0) = 0
               OR COALESCE(resolution_counts.linked_outcome_count, 0) = 0
          )::int AS missing_conversation_resolution_count
        FROM portal_threads t
        INNER JOIN base_cases bc ON bc.case_id = t.case_id
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::int
              FROM case_notes cn
              WHERE cn.case_id = t.case_id
                AND cn.source_entity_type = 'portal_thread'
                AND cn.source_entity_id = t.id
            ) AS linked_note_count,
            (
              SELECT COUNT(*)::int
              FROM case_outcomes co
              WHERE co.case_id = t.case_id
                AND co.source_entity_type = 'portal_thread'
                AND co.source_entity_id = t.id
            ) AS linked_outcome_count
        ) resolution_counts ON true
        GROUP BY t.case_id
      ),
      appointment_gaps AS (
        SELECT
          a.case_id,
          COUNT(*) FILTER (
            WHERE a.status IN ('completed', 'cancelled')
              AND COALESCE(resolution_counts.linked_note_count, 0) = 0
          )::int AS missing_appointment_note_count,
          COUNT(*) FILTER (
            WHERE a.status IN ('completed', 'cancelled')
              AND COALESCE(resolution_counts.linked_outcome_count, 0) = 0
          )::int AS missing_appointment_outcome_count,
          COUNT(*) FILTER (
            WHERE a.status = 'confirmed'
              AND a.start_time > NOW()
              AND COALESCE(reminder_jobs.total_reminder_jobs, 0) = 0
              AND reminder_history.last_reminder_sent_at IS NULL
          )::int AS missing_reminder_offer_count
        FROM appointments a
        INNER JOIN base_cases bc ON bc.case_id = a.case_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS total_reminder_jobs
          FROM appointment_reminder_jobs arj
          WHERE arj.appointment_id = a.id
        ) reminder_jobs ON true
        LEFT JOIN LATERAL (
          SELECT MAX(ard.sent_at) AS last_reminder_sent_at
          FROM appointment_reminder_deliveries ard
          WHERE ard.appointment_id = a.id
        ) reminder_history ON true
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::int
              FROM case_notes cn
              WHERE cn.case_id = a.case_id
                AND cn.source_entity_type = 'appointment'
                AND cn.source_entity_id = a.id
            ) AS linked_note_count,
            (
              SELECT COUNT(*)::int
              FROM case_outcomes co
              WHERE co.case_id = a.case_id
                AND co.source_entity_type = 'appointment'
                AND co.source_entity_id = a.id
            ) AS linked_outcome_count
        ) resolution_counts ON true
        GROUP BY a.case_id
      ),
      follow_up_gaps AS (
        SELECT
          fu.entity_id AS case_id,
          COUNT(*) FILTER (
            WHERE fu.status IN ('completed', 'cancelled')
              AND COALESCE(resolution_counts.linked_note_count, 0) = 0
          )::int AS missing_follow_up_note_count,
          COUNT(*) FILTER (
            WHERE fu.status IN ('completed', 'cancelled')
              AND COALESCE(resolution_counts.linked_outcome_count, 0) = 0
          )::int AS missing_follow_up_outcome_count
        FROM follow_ups fu
        INNER JOIN base_cases bc
          ON bc.case_id = fu.entity_id
         AND fu.entity_type = 'case'
        LEFT JOIN LATERAL (
          SELECT
            (
              SELECT COUNT(*)::int
              FROM case_notes cn
              WHERE cn.case_id = fu.entity_id
                AND cn.source_entity_type = 'follow_up'
                AND cn.source_entity_id = fu.id
            ) AS linked_note_count,
            (
              SELECT COUNT(*)::int
              FROM case_outcomes co
              WHERE co.case_id = fu.entity_id
                AND co.source_entity_type = 'follow_up'
                AND co.source_entity_id = fu.id
            ) AS linked_outcome_count
        ) resolution_counts ON true
        GROUP BY fu.entity_id
      ),
      attendance_gaps AS (
        SELECT
          bc.case_id,
          COUNT(*) FILTER (
            WHERE er.checked_in = true
              AND er.case_id IS NULL
          )::int AS missing_attendance_linkage_count
        FROM base_cases bc
        LEFT JOIN event_registrations er ON er.contact_id = bc.contact_id
        GROUP BY bc.case_id
      ),
      case_status_gaps AS (
        SELECT
          bc.case_id,
          CASE
            WHEN bc.status_type IN ('review', 'closed', 'cancelled')
              AND NOT EXISTS (
                SELECT 1
                FROM case_outcomes co
                WHERE co.case_id = bc.case_id
                  AND co.workflow_stage = 'case_status'
                  AND co.source_entity_type = 'case_status'
                  AND co.source_entity_id = bc.status_id
              ) THEN 1
            ELSE 0
          END::int AS missing_case_status_outcome_count
        FROM base_cases bc
      ),
      final_rows AS (
        SELECT
          bc.case_id,
          bc.case_number,
          bc.case_title,
          bc.contact_name,
          bc.assigned_to,
          bc.assigned_to_name,
          bc.status_name,
          bc.status_type,
          COALESCE(cg.missing_conversation_resolution_count, 0) AS missing_conversation_resolution_count,
          COALESCE(ag.missing_appointment_note_count, 0) AS missing_appointment_note_count,
          COALESCE(ag.missing_appointment_outcome_count, 0) AS missing_appointment_outcome_count,
          COALESCE(fg.missing_follow_up_note_count, 0) AS missing_follow_up_note_count,
          COALESCE(fg.missing_follow_up_outcome_count, 0) AS missing_follow_up_outcome_count,
          COALESCE(ag.missing_reminder_offer_count, 0) AS missing_reminder_offer_count,
          COALESCE(atg.missing_attendance_linkage_count, 0) AS missing_attendance_linkage_count,
          COALESCE(csg.missing_case_status_outcome_count, 0) AS missing_case_status_outcome_count,
          (
            COALESCE(cg.missing_conversation_resolution_count, 0) +
            COALESCE(ag.missing_appointment_note_count, 0) +
            COALESCE(ag.missing_appointment_outcome_count, 0) +
            COALESCE(fg.missing_follow_up_note_count, 0) +
            COALESCE(fg.missing_follow_up_outcome_count, 0) +
            COALESCE(ag.missing_reminder_offer_count, 0) +
            COALESCE(atg.missing_attendance_linkage_count, 0) +
            COALESCE(csg.missing_case_status_outcome_count, 0)
          )::int AS total_gaps
        FROM base_cases bc
        LEFT JOIN conversation_gaps cg ON cg.case_id = bc.case_id
        LEFT JOIN appointment_gaps ag ON ag.case_id = bc.case_id
        LEFT JOIN follow_up_gaps fg ON fg.case_id = bc.case_id
        LEFT JOIN attendance_gaps atg ON atg.case_id = bc.case_id
        LEFT JOIN case_status_gaps csg ON csg.case_id = bc.case_id
      )
      SELECT
        final_rows.case_id,
        final_rows.case_number,
        final_rows.case_title,
        final_rows.contact_name,
        final_rows.assigned_to,
        final_rows.assigned_to_name,
        final_rows.status_name,
        final_rows.status_type,
        final_rows.missing_conversation_resolution_count,
        final_rows.missing_appointment_note_count,
        final_rows.missing_appointment_outcome_count,
        final_rows.missing_follow_up_note_count,
        final_rows.missing_follow_up_outcome_count,
        final_rows.missing_reminder_offer_count,
        final_rows.missing_attendance_linkage_count,
        final_rows.missing_case_status_outcome_count,
        final_rows.total_gaps
      FROM final_rows
      WHERE ${finalConditions.join(' AND ')}
      ORDER BY final_rows.total_gaps DESC, final_rows.case_number ASC
    `;

    const result = await this.pool.query(query, values);
    const items: WorkflowCoverageItem[] = result.rows.map((row) => ({
      caseId: row.case_id,
      caseNumber: row.case_number,
      caseTitle: row.case_title,
      contactName: row.contact_name,
      assignedToId: row.assigned_to,
      assignedToName: row.assigned_to_name,
      statusName: row.status_name,
      statusType: row.status_type,
      missingConversationResolutionCount: Number(row.missing_conversation_resolution_count || 0),
      missingAppointmentNoteCount: Number(row.missing_appointment_note_count || 0),
      missingAppointmentOutcomeCount: Number(row.missing_appointment_outcome_count || 0),
      missingFollowUpNoteCount: Number(row.missing_follow_up_note_count || 0),
      missingFollowUpOutcomeCount: Number(row.missing_follow_up_outcome_count || 0),
      missingReminderOfferCount: Number(row.missing_reminder_offer_count || 0),
      missingAttendanceLinkageCount: Number(row.missing_attendance_linkage_count || 0),
      missingCaseStatusOutcomeCount: Number(row.missing_case_status_outcome_count || 0),
      totalGaps: Number(row.total_gaps || 0),
    }));

    return {
      items,
      summary: items.reduce(
        (summary, item) => ({
          casesWithGaps: summary.casesWithGaps + 1,
          missingConversationResolutionCount:
            summary.missingConversationResolutionCount + item.missingConversationResolutionCount,
          missingAppointmentNoteCount:
            summary.missingAppointmentNoteCount + item.missingAppointmentNoteCount,
          missingAppointmentOutcomeCount:
            summary.missingAppointmentOutcomeCount + item.missingAppointmentOutcomeCount,
          missingFollowUpNoteCount:
            summary.missingFollowUpNoteCount + item.missingFollowUpNoteCount,
          missingFollowUpOutcomeCount:
            summary.missingFollowUpOutcomeCount + item.missingFollowUpOutcomeCount,
          missingReminderOfferCount:
            summary.missingReminderOfferCount + item.missingReminderOfferCount,
          missingAttendanceLinkageCount:
            summary.missingAttendanceLinkageCount + item.missingAttendanceLinkageCount,
          missingCaseStatusOutcomeCount:
            summary.missingCaseStatusOutcomeCount + item.missingCaseStatusOutcomeCount,
          totalGaps: summary.totalGaps + item.totalGaps,
        }),
        {
          casesWithGaps: 0,
          missingConversationResolutionCount: 0,
          missingAppointmentNoteCount: 0,
          missingAppointmentOutcomeCount: 0,
          missingFollowUpNoteCount: 0,
          missingFollowUpOutcomeCount: 0,
          missingReminderOfferCount: 0,
          missingAttendanceLinkageCount: 0,
          missingCaseStatusOutcomeCount: 0,
          totalGaps: 0,
        }
      ),
    };
  }
}

const workflowCoverageReportService = new WorkflowCoverageReportService(pool);

export default workflowCoverageReportService;
export const getWorkflowCoverageReport = workflowCoverageReportService.getWorkflowCoverageReport.bind(
  workflowCoverageReportService
);
