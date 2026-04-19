import type { ReportDefinition, ReportEntity, ReportFilter, ReportSort } from '@app-types/report';
import type { ReportQueryPlan } from './reportDirectExportSupport';

type ReportGenerationScope = {
  organizationId?: string;
};

type ReportFieldSpec = {
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  column: string;
};

const sanitizeAlias = (alias: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new Error(`Invalid aggregation alias: ${alias}`);
  }
  return alias;
};

export const getReportFieldSpecs = (entity: ReportEntity): Record<
  string,
  ReportFieldSpec
> => {
  switch (entity) {
    case 'cases':
      return {
        id: { label: 'Case ID', type: 'string', column: 'c.id' },
        case_number: { label: 'Case Number', type: 'string', column: 'c.case_number' },
        title: { label: 'Title', type: 'string', column: 'c.title' },
        description: { label: 'Description', type: 'string', column: 'c.description' },
        priority: { label: 'Priority', type: 'string', column: 'c.priority' },
        outcome: {
          label: 'Outcome',
          type: 'string',
          column: 'COALESCE(c.outcome, case_outcome_summary.primary_case_outcome_value)',
        },
        status_name: { label: 'Status', type: 'string', column: 'cs.name' },
        status: { label: 'Status', type: 'string', column: 'cs.name' },
        status_type: { label: 'Status Type', type: 'string', column: 'cs.status_type' },
        case_type_name: {
          label: 'Case Type',
          type: 'string',
          column:
            "COALESCE(ct.name, case_type_summary.primary_case_type_name, c.case_type_id::text)",
        },
        case_type_names: {
          label: 'Case Types',
          type: 'string',
          column:
            "COALESCE(case_type_summary.case_type_names, COALESCE(ct.name, case_type_summary.primary_case_type_name, c.case_type_id::text))",
        },
        case_outcome_values: {
          label: 'Case Outcomes',
          type: 'string',
          column:
            "COALESCE(case_outcome_summary.case_outcome_values, COALESCE(c.outcome, case_outcome_summary.primary_case_outcome_value))",
        },
        assigned_to_name: {
          label: 'Assigned To',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(assignee.first_name, ''), ' ', COALESCE(assignee.last_name, '')))",
        },
        account_name: { label: 'Account', type: 'string', column: 'acc.account_name' },
        contact_name: {
          label: 'Contact',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(con.first_name, ''), ' ', COALESCE(con.last_name, '')))",
        },
        is_urgent: { label: 'Urgent', type: 'boolean', column: 'c.is_urgent' },
        open_flag: {
          label: 'Open',
          type: 'boolean',
          column: "CASE WHEN cs.status_type IN ('intake', 'active', 'review') THEN true ELSE false END",
        },
        overdue_flag: {
          label: 'Overdue',
          type: 'boolean',
          column:
            "CASE WHEN c.due_date < CURRENT_DATE AND cs.status_type NOT IN ('closed', 'cancelled') THEN true ELSE false END",
        },
        unassigned_flag: {
          label: 'Unassigned',
          type: 'boolean',
          column:
            "CASE WHEN c.assigned_to IS NULL AND cs.status_type NOT IN ('closed', 'cancelled') THEN true ELSE false END",
        },
        due_date: { label: 'Due Date', type: 'date', column: 'c.due_date' },
        opened_date: { label: 'Opened Date', type: 'date', column: 'c.opened_date' },
        closed_date: { label: 'Closed Date', type: 'date', column: 'c.closed_date' },
        created_at: { label: 'Created Date', type: 'date', column: 'c.created_at' },
        age_days: {
          label: 'Age (Days)',
          type: 'number',
          column:
            'GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(c.closed_date::timestamp, NOW()) - COALESCE(c.opened_date::timestamp, c.intake_date::timestamp, c.created_at))) / 86400))',
        },
        age_bucket: {
          label: 'Age Bucket',
          type: 'string',
          column: `
            CASE
              WHEN EXTRACT(EPOCH FROM (COALESCE(c.closed_date::timestamp, NOW()) - COALESCE(c.opened_date::timestamp, c.intake_date::timestamp, c.created_at))) / 86400 < 7 THEN '0-6'
              WHEN EXTRACT(EPOCH FROM (COALESCE(c.closed_date::timestamp, NOW()) - COALESCE(c.opened_date::timestamp, c.intake_date::timestamp, c.created_at))) / 86400 < 15 THEN '7-14'
              WHEN EXTRACT(EPOCH FROM (COALESCE(c.closed_date::timestamp, NOW()) - COALESCE(c.opened_date::timestamp, c.intake_date::timestamp, c.created_at))) / 86400 < 31 THEN '15-30'
              ELSE '31+'
            END
          `.trim().replace(/\s+/g, ' '),
        },
        service_outcome: { label: 'Service/Event Outcome', type: 'string', column: 'svc.outcome' },
      };
    case 'accounts':
      return {
        id: { label: 'Account ID', type: 'string', column: 'a.id' },
        account_name: { label: 'Account Name', type: 'string', column: 'a.account_name' },
        account_type: { label: 'Type', type: 'string', column: 'a.account_type' },
        category: { label: 'Category', type: 'string', column: 'a.category' },
        website: { label: 'Website', type: 'string', column: 'a.website' },
        phone: { label: 'Phone', type: 'string', column: 'a.phone' },
        email: { label: 'Email', type: 'string', column: 'a.email' },
        is_active: { label: 'Active', type: 'boolean', column: 'a.is_active' },
        created_at: { label: 'Created Date', type: 'date', column: 'a.created_at' },
        updated_at: { label: 'Updated Date', type: 'date', column: 'a.updated_at' },
      };
    case 'contacts':
      return {
        id: { label: 'Contact ID', type: 'string', column: 'c.id' },
        first_name: { label: 'First Name', type: 'string', column: 'c.first_name' },
        last_name: { label: 'Last Name', type: 'string', column: 'c.last_name' },
        email: { label: 'Email', type: 'string', column: 'c.email' },
        phone: { label: 'Phone', type: 'string', column: 'c.phone' },
        mobile_phone: { label: 'Mobile Phone', type: 'string', column: 'c.mobile_phone' },
        job_title: { label: 'Job Title', type: 'string', column: 'c.job_title' },
        department: { label: 'Department', type: 'string', column: 'c.department' },
        preferred_contact_method: { label: 'Preferred Contact Method', type: 'string', column: 'c.preferred_contact_method' },
        account_name: { label: 'Account', type: 'string', column: 'a.account_name' },
        is_active: { label: 'Active', type: 'boolean', column: 'c.is_active' },
        created_at: { label: 'Created Date', type: 'date', column: 'c.created_at' },
        updated_at: { label: 'Updated Date', type: 'date', column: 'c.updated_at' },
      };
    case 'donations':
      return {
        id: { label: 'Donation ID', type: 'string', column: 'd.id' },
        donation_number: { label: 'Donation Number', type: 'string', column: 'd.donation_number' },
        donor_name: {
          label: 'Donor Name',
          type: 'string',
          column:
            "COALESCE(NULLIF(TRIM(CONCAT(COALESCE(dc.first_name, ''), ' ', COALESCE(dc.last_name, ''))), ''), da.account_name, 'Unknown')",
        },
        amount: { label: 'Amount', type: 'currency', column: 'd.amount' },
        currency: { label: 'Currency', type: 'string', column: 'd.currency' },
        payment_method: { label: 'Payment Method', type: 'string', column: 'd.payment_method' },
        payment_status: { label: 'Payment Status', type: 'string', column: 'd.payment_status' },
        campaign_name: { label: 'Campaign', type: 'string', column: 'd.campaign_name' },
        designation: { label: 'Designation', type: 'string', column: 'd.designation' },
        is_recurring: { label: 'Recurring', type: 'boolean', column: 'd.is_recurring' },
        donation_date: { label: 'Donation Date', type: 'date', column: 'd.donation_date' },
        created_at: { label: 'Created Date', type: 'date', column: 'd.created_at' },
      };
    case 'events':
      return {
        id: { label: 'Event ID', type: 'string', column: 'e.id' },
        name: { label: 'Event Name', type: 'string', column: 'e.name' },
        event_type: { label: 'Type', type: 'string', column: 'e.event_type' },
        status: { label: 'Status', type: 'string', column: 'e.status' },
        location_name: { label: 'Location', type: 'string', column: 'e.location_name' },
        capacity: { label: 'Capacity', type: 'number', column: 'e.capacity' },
        start_date: { label: 'Start Date', type: 'date', column: 'e.start_date' },
        end_date: { label: 'End Date', type: 'date', column: 'e.end_date' },
        created_at: { label: 'Created Date', type: 'date', column: 'e.created_at' },
      };
    case 'appointments':
      return {
        id: { label: 'Appointment ID', type: 'string', column: 'a.id' },
        title: { label: 'Title', type: 'string', column: 'a.title' },
        request_type: { label: 'Request Type', type: 'string', column: 'a.request_type' },
        status: { label: 'Status', type: 'string', column: 'a.status' },
        attendance_state: {
          label: 'Attendance State',
          type: 'string',
          column: `
            CASE
              WHEN a.checked_in_at IS NOT NULL THEN 'checked_in'
              WHEN a.status = 'completed' THEN 'completed'
              WHEN a.status = 'cancelled' THEN 'cancelled'
              ELSE 'pending'
            END
          `.trim().replace(/\s+/g, ' '),
        },
        case_number: { label: 'Case Number', type: 'string', column: 'c.case_number' },
        case_title: { label: 'Case Title', type: 'string', column: 'c.title' },
        contact_name: {
          label: 'Contact',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(con.first_name, ''), ' ', COALESCE(con.last_name, '')))",
        },
        pointperson_name: {
          label: 'Point Person',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')))",
        },
        location: { label: 'Location', type: 'string', column: 'a.location' },
        start_time: { label: 'Start Time', type: 'date', column: 'a.start_time' },
        end_time: { label: 'End Time', type: 'date', column: 'a.end_time' },
        reminder_offered: {
          label: 'Reminder Offered',
          type: 'boolean',
          column: 'EXISTS (SELECT 1 FROM appointment_reminder_jobs arj WHERE arj.appointment_id = a.id)',
        },
        created_at: { label: 'Created Date', type: 'date', column: 'a.created_at' },
        updated_at: { label: 'Updated Date', type: 'date', column: 'a.updated_at' },
      };
    case 'follow_ups':
      return {
        id: { label: 'Follow-up ID', type: 'string', column: 'fu.id' },
        entity_type: { label: 'Entity Type', type: 'string', column: 'fu.entity_type' },
        title: { label: 'Title', type: 'string', column: 'fu.title' },
        status: { label: 'Status', type: 'string', column: 'fu.status' },
        method: { label: 'Method', type: 'string', column: 'fu.method' },
        frequency: { label: 'Frequency', type: 'string', column: 'fu.frequency' },
        case_number: { label: 'Case Number', type: 'string', column: 'c.case_number' },
        contact_name: {
          label: 'Contact',
          type: 'string',
          column: `
            COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(direct_con.first_name, ''), ' ', COALESCE(direct_con.last_name, ''))), ''),
              NULLIF(TRIM(CONCAT(COALESCE(case_con.first_name, ''), ' ', COALESCE(case_con.last_name, ''))), '')
            )
          `.trim().replace(/\s+/g, ' '),
        },
        assigned_to_name: {
          label: 'Assigned To',
          type: 'string',
          column:
            "TRIM(CONCAT(COALESCE(assignee.first_name, ''), ' ', COALESCE(assignee.last_name, '')))",
        },
        scheduled_date: { label: 'Scheduled Date', type: 'date', column: 'fu.scheduled_date' },
        completed_date: { label: 'Completed Date', type: 'date', column: 'fu.completed_date' },
        reminder_minutes_before: {
          label: 'Reminder Minutes',
          type: 'number',
          column: 'fu.reminder_minutes_before',
        },
        has_reminder: {
          label: 'Reminder Offered',
          type: 'boolean',
          column: 'CASE WHEN fu.reminder_minutes_before IS NOT NULL THEN true ELSE false END',
        },
        created_at: { label: 'Created Date', type: 'date', column: 'fu.created_at' },
      };
      case 'attendance':
        return {
          registration_id: { label: 'Attendance ID', type: 'string', column: 'er.id' },
          event_id: { label: 'Event ID', type: 'string', column: 'er.event_id' },
          event_name: { label: 'Event Name', type: 'string', column: 'e.name' },
          case_id: { label: 'Case ID', type: 'string', column: 'er.case_id' },
          case_number: { label: 'Case Number', type: 'string', column: 'c.case_number' },
        contact_name: {
          label: 'Contact',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(con.first_name, ''), ' ', COALESCE(con.last_name, '')))",
        },
        registration_status: {
          label: 'Registration Status',
          type: 'string',
          column: 'er.registration_status',
        },
        checked_in: { label: 'Checked In', type: 'boolean', column: 'er.checked_in' },
        check_in_time: { label: 'Check-in Time', type: 'date', column: 'er.check_in_time' },
        check_in_method: { label: 'Check-in Method', type: 'string', column: 'er.check_in_method' },
        created_at: { label: 'Created Date', type: 'date', column: 'er.created_at' },
      };
    case 'volunteers':
      return {
        id: { label: 'Volunteer ID', type: 'string', column: 'v.id' },
        contact_id: { label: 'Contact ID', type: 'string', column: 'v.contact_id' },
        first_name: { label: 'First Name', type: 'string', column: 'c.first_name' },
        last_name: { label: 'Last Name', type: 'string', column: 'c.last_name' },
        email: { label: 'Email', type: 'string', column: 'c.email' },
        phone: { label: 'Phone', type: 'string', column: 'c.phone' },
        status: { label: 'Status', type: 'string', column: 'v.volunteer_status' },
        volunteer_status: { label: 'Status', type: 'string', column: 'v.volunteer_status' },
        skills: { label: 'Skills', type: 'string', column: 'v.skills' },
        availability: { label: 'Availability', type: 'string', column: 'v.availability' },
        total_hours: { label: 'Total Hours', type: 'number', column: 'v.hours_contributed' },
        hours_contributed: { label: 'Hours Contributed', type: 'number', column: 'v.hours_contributed' },
        created_at: { label: 'Created Date', type: 'date', column: 'v.created_at' },
      };
    case 'tasks':
      return {
        id: { label: 'Task ID', type: 'string', column: 't.id' },
        subject: { label: 'Subject', type: 'string', column: 't.subject' },
        status: { label: 'Status', type: 'string', column: 't.status' },
        priority: { label: 'Priority', type: 'string', column: 't.priority' },
        due_date: { label: 'Due Date', type: 'date', column: 't.due_date' },
        completed_date: { label: 'Completed Date', type: 'date', column: 't.completed_date' },
        related_to_type: { label: 'Related To', type: 'string', column: 't.related_to_type' },
        created_at: { label: 'Created Date', type: 'date', column: 't.created_at' },
      };
    case 'opportunities':
      return {
        id: { label: 'Opportunity ID', type: 'string', column: 'o.id' },
        name: { label: 'Opportunity Name', type: 'string', column: 'o.name' },
        description: { label: 'Description', type: 'string', column: 'o.description' },
        status: { label: 'Status', type: 'string', column: 'o.status' },
        amount: { label: 'Amount', type: 'currency', column: 'o.amount' },
        currency: { label: 'Currency', type: 'string', column: 'o.currency' },
        stage_name: { label: 'Stage', type: 'string', column: 'st.name' },
        stage_order: { label: 'Stage Order', type: 'number', column: 'st.stage_order' },
        probability: { label: 'Probability', type: 'number', column: 'COALESCE(st.probability, 0)' },
        weighted_amount: {
          label: 'Weighted Amount',
          type: 'currency',
          column: '(COALESCE(o.amount, 0) * COALESCE(st.probability, 0)) / 100.0',
        },
        won_flag: { label: 'Won', type: 'boolean', column: "CASE WHEN o.status = 'won' THEN true ELSE false END" },
        lost_flag: { label: 'Lost', type: 'boolean', column: "CASE WHEN o.status = 'lost' THEN true ELSE false END" },
        closed_flag: {
          label: 'Closed',
          type: 'boolean',
          column: "CASE WHEN o.status IN ('won', 'lost') OR COALESCE(st.is_closed, false) THEN true ELSE false END",
        },
        open_flag: {
          label: 'Open',
          type: 'boolean',
          column: "CASE WHEN o.status = 'open' THEN true ELSE false END",
        },
        days_open: {
          label: 'Days Open',
          type: 'number',
          column:
            'GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (COALESCE(o.actual_close_date::timestamp, NOW()) - o.created_at)) / 86400))',
        },
        assigned_to_name: {
          label: 'Assigned To',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(assignee.first_name, ''), ' ', COALESCE(assignee.last_name, '')))",
        },
        account_name: { label: 'Account', type: 'string', column: 'acc.account_name' },
        contact_name: {
          label: 'Contact',
          type: 'string',
          column: "TRIM(CONCAT(COALESCE(con.first_name, ''), ' ', COALESCE(con.last_name, '')))",
        },
        expected_close_date: { label: 'Expected Close Date', type: 'date', column: 'o.expected_close_date' },
        actual_close_date: { label: 'Actual Close Date', type: 'date', column: 'o.actual_close_date' },
        created_at: { label: 'Created Date', type: 'date', column: 'o.created_at' },
      };
    case 'expenses':
      return {
        id: { label: 'Expense ID', type: 'string', column: 'ex.id' },
        amount: { label: 'Amount', type: 'currency', column: 'ex.amount' },
        category: { label: 'Category', type: 'string', column: 'ex.category' },
        description: { label: 'Description', type: 'string', column: 'ex.description' },
        expense_date: { label: 'Expense Date', type: 'date', column: 'ex.expense_date' },
        payment_method: { label: 'Payment Method', type: 'string', column: 'ex.payment_method' },
        status: { label: 'Status', type: 'string', column: 'ex.status' },
        created_at: { label: 'Created Date', type: 'date', column: 'ex.created_at' },
      };
    case 'grants':
      return {
        id: { label: 'Grant ID', type: 'string', column: 'g.id' },
        grant_number: { label: 'Grant Number', type: 'string', column: 'g.grant_number' },
        title: { label: 'Grant Title', type: 'string', column: 'g.title' },
        status: { label: 'Status', type: 'string', column: 'g.status' },
        funder_name: { label: 'Funder', type: 'string', column: 'f.name' },
        funder_type: { label: 'Funder Type', type: 'string', column: 'f.funder_type' },
        program_name: { label: 'Program', type: 'string', column: 'gp.name' },
        program_code: { label: 'Program Code', type: 'string', column: 'gp.program_code' },
        recipient_name: { label: 'Recipient', type: 'string', column: 'ro.name' },
        recipient_legal_name: {
          label: 'Recipient Legal Name',
          type: 'string',
          column: 'ro.legal_name',
        },
        funded_program_name: { label: 'Funded Program', type: 'string', column: 'fp.name' },
        application_number: {
          label: 'Application Number',
          type: 'string',
          column: 'ga.application_number',
        },
        application_status: { label: 'Application Status', type: 'string', column: 'ga.status' },
        amount: { label: 'Amount', type: 'currency', column: 'g.amount' },
        committed_amount: { label: 'Committed Amount', type: 'currency', column: 'g.committed_amount' },
        disbursed_amount: { label: 'Disbursed Amount', type: 'currency', column: 'g.disbursed_amount' },
        outstanding_amount: {
          label: 'Outstanding Amount',
          type: 'currency',
          column: 'GREATEST(g.amount - g.disbursed_amount, 0)',
        },
        currency: { label: 'Currency', type: 'string', column: 'g.currency' },
        fiscal_year: { label: 'Fiscal Year', type: 'string', column: 'g.fiscal_year' },
        jurisdiction: { label: 'Jurisdiction', type: 'string', column: 'g.jurisdiction' },
        start_date: { label: 'Start Date', type: 'date', column: 'g.start_date' },
        end_date: { label: 'End Date', type: 'date', column: 'g.end_date' },
        award_date: { label: 'Award Date', type: 'date', column: 'g.award_date' },
        next_report_due_at: {
          label: 'Next Report Due',
          type: 'date',
          column: 'g.next_report_due_at',
        },
        closeout_due_at: { label: 'Closeout Due', type: 'date', column: 'g.closeout_due_at' },
        expiry_date: { label: 'Expiry Date', type: 'date', column: 'g.expiry_date' },
        report_count: {
          label: 'Report Count',
          type: 'number',
          column:
            'COALESCE((SELECT COUNT(*) FROM grant_reports gr WHERE gr.organization_id = g.organization_id AND gr.grant_id = g.id), 0)',
        },
        disbursement_count: {
          label: 'Disbursement Count',
          type: 'number',
          column:
            'COALESCE((SELECT COUNT(*) FROM grant_disbursements gd WHERE gd.organization_id = g.organization_id AND gd.grant_id = g.id), 0)',
        },
        created_at: { label: 'Created Date', type: 'date', column: 'g.created_at' },
        updated_at: { label: 'Updated Date', type: 'date', column: 'g.updated_at' },
      };
    case 'programs':
      return {
        id: { label: 'Program ID', type: 'string', column: 'p.id' },
        name: { label: 'Program Name', type: 'string', column: 'p.name' },
        description: { label: 'Description', type: 'string', column: 'p.description' },
        status: { label: 'Status', type: 'string', column: 'p.status' },
        start_date: { label: 'Start Date', type: 'date', column: 'p.start_date' },
        end_date: { label: 'End Date', type: 'date', column: 'p.end_date' },
        budget: { label: 'Budget', type: 'currency', column: 'p.budget' },
        created_at: { label: 'Created Date', type: 'date', column: 'p.created_at' },
      };
    default:
      return {};
  }
};

export const buildReportWhereClause = (
  filters: ReportFilter[],
  fieldSpecs: Record<string, { column: string }>,
  paramOffset = 0
): { conditions: string[]; values: unknown[] } => {
  if (!filters || filters.length === 0) {
    return { conditions: [], values: [] };
  }

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = paramOffset + 1;

  for (const filter of filters) {
    const fieldSpec = fieldSpecs[filter.field];
    if (!fieldSpec) {
      throw new Error(`Invalid filter field: ${filter.field}`);
    }
    const column = fieldSpec.column;
    const value = filter.value;

    switch (filter.operator) {
      case 'eq':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'ne':
        if (value === undefined || value === null) break;
        if (value === '') {
          conditions.push(`COALESCE(${column}, '') <> ''`);
          break;
        }
        conditions.push(`${column} != $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'gt':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} > $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'gte':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} >= $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'lt':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} < $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'lte':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} <= $${paramIndex}`);
        values.push(value);
        paramIndex++;
        break;
      case 'like':
        if (value === undefined || value === null || value === '') break;
        conditions.push(`${column} ILIKE $${paramIndex}`);
        values.push(`%${value}%`);
        paramIndex++;
        break;
      case 'in':
        if (value === undefined || value === null || value === '') break;
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
          conditions.push(`${column} IN (${placeholders})`);
          values.push(...value);
          paramIndex += value.length;
        } else if (typeof value === 'string') {
          const list = value.split(',').map((v) => v.trim()).filter(Boolean);
          if (list.length > 0) {
            const placeholders = list.map((_, i) => `$${paramIndex + i}`).join(', ');
            conditions.push(`${column} IN (${placeholders})`);
            values.push(...list);
            paramIndex += list.length;
          }
        }
        break;
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          conditions.push(`${column} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
          values.push(value[0], value[1]);
          paramIndex += 2;
        } else if (typeof value === 'string') {
          const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
          if (parts.length === 2) {
            conditions.push(`${column} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            values.push(parts[0], parts[1]);
            paramIndex += 2;
          }
        }
        break;
    }
  }

  return { conditions, values };
};

export const getReportScopeClause = (
  entity: ReportEntity,
  scope: ReportGenerationScope | undefined
): { condition: string | null; values: unknown[] } => {
  if (entity === 'opportunities') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for opportunities reports');
    }
    return {
      condition: 'o.organization_id = $1',
      values: [scope.organizationId],
    };
  }

  if (entity === 'cases') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for cases reports');
    }
    return {
      condition: 'COALESCE(c.account_id, con.account_id) = $1',
      values: [scope.organizationId],
    };
  }

  if (entity === 'appointments') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for appointments reports');
    }
    return {
      condition: 'COALESCE(c.account_id, con.account_id) = $1',
      values: [scope.organizationId],
    };
  }

  if (entity === 'follow_ups') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for follow-up reports');
    }
    return {
      condition: 'fu.organization_id = $1',
      values: [scope.organizationId],
    };
  }

  if (entity === 'grants') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for grants reports');
    }
    return {
      condition: 'g.organization_id = $1',
      values: [scope.organizationId],
    };
  }

  if (entity === 'attendance') {
    if (!scope?.organizationId) {
      throw new Error('Organization scope is required for attendance reports');
    }
    return {
      condition: 'COALESCE(c.account_id, con.account_id) = $1',
      values: [scope.organizationId],
    };
  }

  return { condition: null, values: [] };
};

export const buildReportOrderByClause = (
  sort: ReportSort[] | undefined,
  fieldSpecs: Record<string, { column: string }>,
  aggregationAliases: Set<string>
): string => {
  if (!sort || sort.length === 0) {
    return '';
  }

  const orderClauses = sort.map((s) => {
    const direction = s.direction.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new Error(`Invalid sort direction: ${s.direction}`);
    }

    const fieldSpec = fieldSpecs[s.field];
    if (fieldSpec) {
      return `${fieldSpec.column} ${direction}`;
    }

    if (aggregationAliases.has(s.field)) {
      return `"${s.field}" ${direction}`;
    }

    throw new Error(`Invalid sort field: ${s.field}`);
  });
  return `ORDER BY ${orderClauses.join(', ')}`;
};

export const getReportTableName = (entity: ReportEntity): string => {
  const tableMap: Record<ReportEntity, string> = {
    cases:
      'cases c LEFT JOIN contacts con ON c.contact_id = con.id LEFT JOIN accounts acc ON acc.id = COALESCE(c.account_id, con.account_id) LEFT JOIN users assignee ON assignee.id = c.assigned_to LEFT JOIN case_statuses cs ON c.status_id = cs.id LEFT JOIN case_types ct ON c.case_type_id = ct.id LEFT JOIN LATERAL (SELECT STRING_AGG(ct_lookup.name, \' | \' ORDER BY cta.is_primary DESC, cta.sort_order ASC, cta.created_at ASC, cta.id ASC) AS case_type_names, (ARRAY_AGG(ct_lookup.name ORDER BY cta.is_primary DESC, cta.sort_order ASC, cta.created_at ASC, cta.id ASC))[1] AS primary_case_type_name FROM case_type_assignments cta INNER JOIN case_types ct_lookup ON ct_lookup.id = cta.case_type_id WHERE cta.case_id = c.id) case_type_summary ON true LEFT JOIN LATERAL (SELECT STRING_AGG(coa.outcome_value, \' | \' ORDER BY coa.is_primary DESC, coa.sort_order ASC, coa.created_at ASC, coa.id ASC) AS case_outcome_values, (ARRAY_AGG(coa.outcome_value ORDER BY coa.is_primary DESC, coa.sort_order ASC, coa.created_at ASC, coa.id ASC))[1] AS primary_case_outcome_value FROM case_outcome_assignments coa WHERE coa.case_id = c.id) case_outcome_summary ON true LEFT JOIN LATERAL (SELECT s.outcome FROM case_services s WHERE s.case_id = c.id ORDER BY s.service_date DESC NULLS LAST, s.created_at DESC LIMIT 1) svc ON true',
    accounts: 'accounts a',
    contacts: 'contacts c LEFT JOIN accounts a ON c.account_id = a.id',
    donations: 'donations d LEFT JOIN contacts dc ON d.contact_id = dc.id LEFT JOIN accounts da ON d.account_id = da.id',
    events: 'events e',
    appointments:
      'appointments a LEFT JOIN cases c ON c.id = a.case_id LEFT JOIN contacts con ON con.id = a.contact_id LEFT JOIN users u ON u.id = a.pointperson_user_id',
    follow_ups:
      "follow_ups fu LEFT JOIN cases c ON fu.entity_type = 'case' AND fu.entity_id = c.id LEFT JOIN contacts case_con ON case_con.id = c.contact_id LEFT JOIN contacts direct_con ON fu.entity_type = 'contact' AND fu.entity_id = direct_con.id LEFT JOIN users assignee ON assignee.id = fu.assigned_to",
    attendance:
      'event_registrations er INNER JOIN events e ON e.id = er.event_id LEFT JOIN cases c ON c.id = er.case_id LEFT JOIN contacts con ON con.id = er.contact_id',
    volunteers: 'volunteers v INNER JOIN contacts c ON v.contact_id = c.id',
    tasks: 'tasks t',
    opportunities:
      "opportunities o INNER JOIN opportunity_stages st ON st.id = o.stage_id LEFT JOIN accounts acc ON acc.id = o.account_id LEFT JOIN contacts con ON con.id = o.contact_id LEFT JOIN users assignee ON assignee.id = o.assigned_to",
    expenses: 'expenses ex',
    grants:
      'grants g LEFT JOIN grant_funders f ON f.id = g.funder_id LEFT JOIN grant_programs gp ON gp.id = g.program_id LEFT JOIN recipient_organizations ro ON ro.id = g.recipient_organization_id LEFT JOIN funded_programs fp ON fp.id = g.funded_program_id LEFT JOIN grant_applications ga ON ga.grant_id = g.id',
    programs: 'programs p',
  };

  return tableMap[entity];
};

export const buildReportLimitClause = (limit?: number): string =>
  typeof limit === 'number' ? `LIMIT ${limit}` : '';

export const buildReportQueryPlan = (
  definition: ReportDefinition,
  scope?: ReportGenerationScope
): ReportQueryPlan => {
  const tableName = getReportTableName(definition.entity);
  const fieldSpecs = getReportFieldSpecs(definition.entity);

  const selectParts: string[] = [];
  const aggregationAliases = new Set<string>();
  const isGrouped = Boolean(definition.groupBy && definition.groupBy.length > 0);

  if (isGrouped) {
    for (const field of definition.groupBy || []) {
      if (!fieldSpecs[field]) {
        throw new Error(`Invalid group by field: ${field}`);
      }
      selectParts.push(`${fieldSpecs[field].column} AS ${field}`);
    }
  } else if (definition.fields && definition.fields.length > 0) {
    const invalidFields = definition.fields.filter((field) => !fieldSpecs[field]);
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
    }
    definition.fields.forEach((field) => {
      selectParts.push(`${fieldSpecs[field].column} AS ${field}`);
    });
  }

  if (definition.aggregations && definition.aggregations.length > 0) {
    for (const agg of definition.aggregations) {
      if (!fieldSpecs[agg.field]) {
        throw new Error(`Invalid aggregation field: ${agg.field}`);
      }
      const alias = sanitizeAlias(agg.alias || `${agg.function}_${agg.field}`);
      aggregationAliases.add(alias);
      selectParts.push(`${agg.function.toUpperCase()}(${fieldSpecs[agg.field].column}) AS "${alias}"`);
    }
  }

  if (selectParts.length === 0) {
    throw new Error('At least one field or aggregation must be selected');
  }

  const scoped = getReportScopeClause(definition.entity, scope);
  const { conditions: filterConditions, values: filterValues } = buildReportWhereClause(
    definition.filters || [],
    fieldSpecs,
    scoped.values.length
  );
  const whereConditions = [...(scoped.condition ? [scoped.condition] : []), ...filterConditions];
  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  return {
    tableName,
    selectFields: selectParts.join(', '),
    whereClause,
    values: [...scoped.values, ...filterValues],
    groupByClause: isGrouped
      ? `GROUP BY ${(definition.groupBy || []).map((field) => fieldSpecs[field].column).join(', ')}`
      : '',
    orderByClause: buildReportOrderByClause(definition.sort, fieldSpecs, aggregationAliases),
    limitClause: buildReportLimitClause(definition.limit),
    isGrouped,
  };
};
