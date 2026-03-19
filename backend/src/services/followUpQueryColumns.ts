export const FOLLOW_UP_SELECT_COLUMNS = `
  fu.id,
  fu.organization_id,
  fu.entity_type,
  fu.entity_id,
  fu.title,
  fu.description,
  fu.scheduled_date,
  fu.scheduled_time,
  fu.frequency,
  fu.frequency_end_date,
  fu.method,
  fu.status,
  fu.completed_date,
  fu.completed_notes,
  fu.assigned_to,
  fu.reminder_minutes_before,
  fu.created_by,
  fu.created_at,
  fu.updated_at
`;

export const FOLLOW_UP_RETURNING_COLUMNS = `
  id,
  organization_id,
  entity_type,
  entity_id,
  title,
  description,
  scheduled_date,
  scheduled_time,
  frequency,
  frequency_end_date,
  method,
  status,
  completed_date,
  completed_notes,
  assigned_to,
  reminder_minutes_before,
  created_by,
  created_at,
  updated_at
`;

export const FOLLOW_UP_ENTITY_COLUMNS = `
  ${FOLLOW_UP_SELECT_COLUMNS},
  assignee.first_name || ' ' || assignee.last_name AS assigned_to_name,
  c.case_number,
  c.title AS case_title,
  c.priority AS case_priority,
  CASE
    WHEN fu.entity_type = 'contact' THEN direct_contact.first_name || ' ' || direct_contact.last_name
    ELSE con.first_name || ' ' || con.last_name
  END AS contact_name,
  direct_contact.first_name || ' ' || direct_contact.last_name AS direct_contact_name,
  t.subject AS task_subject,
  t.priority AS task_priority
`;
