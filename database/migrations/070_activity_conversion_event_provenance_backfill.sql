-- Migration 070: provenance columns and historical backfill for activity/conversion events

ALTER TABLE activity_events
  ADD COLUMN IF NOT EXISTS source_table VARCHAR(64),
  ADD COLUMN IF NOT EXISTS source_record_id UUID;

ALTER TABLE conversion_events
  ADD COLUMN IF NOT EXISTS source_table VARCHAR(64),
  ADD COLUMN IF NOT EXISTS source_record_id UUID;

WITH analytics_source_events AS (
  SELECT
    sa.id AS source_record_id,
    ps.organization_id,
    sa.site_id,
    'pageview'::varchar(50) AS conversion_type,
    'view'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type = 'pageview'

  UNION ALL

  SELECT
    sa.id AS source_record_id,
    ps.organization_id,
    sa.site_id,
    sa.event_type::varchar(50) AS conversion_type,
    'submit'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type IN ('form_submit', 'donation', 'event_register')

  UNION ALL

  SELECT
    sa.id AS source_record_id,
    ps.organization_id,
    sa.site_id,
    sa.event_type::varchar(50) AS conversion_type,
    'confirm'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type IN ('form_submit', 'donation', 'event_register')
)
UPDATE conversion_events ce
SET source_table = 'site_analytics',
    source_record_id = src.source_record_id
FROM analytics_source_events src
WHERE ce.source_table IS NULL
  AND ce.site_id = src.site_id
  AND ce.conversion_type = src.conversion_type
  AND ce.conversion_step = src.conversion_step
  AND ce.page_path = src.page_path
  AND ce.occurred_at = src.occurred_at
  AND COALESCE(ce.visitor_id, '') = COALESCE(src.visitor_id, '')
  AND COALESCE(ce.session_id, '') = COALESCE(src.session_id, '')
  AND COALESCE(ce.referrer, '') = COALESCE(src.referrer, '')
  AND COALESCE(ce.user_agent, '') = COALESCE(src.user_agent, '')
  AND COALESCE(ce.source_entity_type, '') = COALESCE(src.source_entity_type, '')
  AND COALESCE(ce.source_entity_id::text, '') = COALESCE(src.source_entity_id::text, '')
  AND COALESCE(ce.event_data, '{}'::jsonb) = COALESCE(src.event_data, '{}'::jsonb);

UPDATE activity_events ae
SET source_table = 'donations',
    source_record_id = d.id
FROM donations d
WHERE ae.source_table IS NULL
  AND ae.activity_type = 'donation_received'
  AND ae.entity_type = 'donation'
  AND ae.entity_id = d.id;

UPDATE activity_events ae
SET source_table = 'event_registrations',
    source_record_id = er.id
FROM event_registrations er
WHERE ae.source_table IS NULL
  AND ae.activity_type = 'event_registration'
  AND ae.metadata ->> 'registrationId' = er.id::text;

UPDATE activity_events ae
SET source_table = 'event_registrations',
    source_record_id = er.id
FROM event_registrations er
WHERE ae.source_table IS NULL
  AND ae.activity_type = 'event_check_in'
  AND ae.metadata ->> 'registrationId' = er.id::text;

WITH portal_activity_sources AS (
  SELECT
    pal.id,
    pal.portal_user_id::text AS portal_user_id,
    pal.action,
    COALESCE(pal.details, pal.action) AS description,
    ROW_NUMBER() OVER (
      PARTITION BY pal.portal_user_id, pal.action, COALESCE(pal.details, pal.action)
      ORDER BY pal.created_at, pal.id
    ) AS sequence_number
  FROM portal_activity_logs pal
),
portal_activity_events AS (
  SELECT
    ae.id,
    ae.metadata ->> 'portalUserId' AS portal_user_id,
    ae.metadata ->> 'action' AS action,
    ae.description,
    ROW_NUMBER() OVER (
      PARTITION BY ae.metadata ->> 'portalUserId', ae.metadata ->> 'action', ae.description
      ORDER BY ae.occurred_at, ae.id
    ) AS sequence_number
  FROM activity_events ae
  WHERE ae.source_table IS NULL
    AND ae.activity_type = 'portal_action'
    AND ae.metadata ? 'portalUserId'
    AND ae.metadata ? 'action'
)
UPDATE activity_events ae
SET source_table = 'portal_activity_logs',
    source_record_id = src.id
FROM portal_activity_events event_rows
JOIN portal_activity_sources src
  ON src.portal_user_id = event_rows.portal_user_id
 AND src.action = event_rows.action
 AND src.description = event_rows.description
 AND src.sequence_number = event_rows.sequence_number
WHERE ae.id = event_rows.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_events_source_activity
  ON activity_events(source_table, source_record_id, activity_type)
  WHERE source_table IS NOT NULL AND source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversion_events_source_step
  ON conversion_events(source_table, source_record_id, conversion_step)
  WHERE source_table IS NOT NULL AND source_record_id IS NOT NULL;

WITH analytics_source_events AS (
  SELECT
    ps.organization_id,
    sa.site_id,
    'pageview'::varchar(50) AS conversion_type,
    'view'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at,
    sa.id AS source_record_id
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type = 'pageview'

  UNION ALL

  SELECT
    ps.organization_id,
    sa.site_id,
    sa.event_type::varchar(50) AS conversion_type,
    'submit'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at,
    sa.id AS source_record_id
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type IN ('form_submit', 'donation', 'event_register')

  UNION ALL

  SELECT
    ps.organization_id,
    sa.site_id,
    sa.event_type::varchar(50) AS conversion_type,
    'confirm'::varchar(20) AS conversion_step,
    sa.page_path,
    sa.visitor_id,
    sa.session_id,
    sa.referrer,
    sa.user_agent,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityType') = 'string'
      THEN sa.event_data ->> 'sourceEntityType'
      ELSE NULL
    END AS source_entity_type,
    CASE
      WHEN jsonb_typeof(sa.event_data) = 'object'
       AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
       AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (sa.event_data ->> 'sourceEntityId')::uuid
      ELSE NULL
    END AS source_entity_id,
    COALESCE(sa.event_data, '{}'::jsonb) AS event_data,
    sa.created_at AS occurred_at,
    sa.id AS source_record_id
  FROM site_analytics sa
  JOIN published_sites ps ON ps.id = sa.site_id
  WHERE sa.event_type IN ('form_submit', 'donation', 'event_register')
)
INSERT INTO conversion_events (
  organization_id,
  site_id,
  conversion_type,
  conversion_step,
  page_path,
  visitor_id,
  session_id,
  referrer,
  user_agent,
  source_entity_type,
  source_entity_id,
  source_table,
  source_record_id,
  event_data,
  occurred_at,
  created_at
)
SELECT
  src.organization_id,
  src.site_id,
  src.conversion_type,
  src.conversion_step,
  src.page_path,
  src.visitor_id,
  src.session_id,
  src.referrer,
  src.user_agent,
  src.source_entity_type,
  src.source_entity_id,
  'site_analytics',
  src.source_record_id,
  src.event_data,
  src.occurred_at,
  src.occurred_at
FROM analytics_source_events src
ON CONFLICT DO NOTHING;

INSERT INTO activity_events (
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  source_table,
  source_record_id,
  metadata,
  occurred_at,
  created_at
)
SELECT
  d.account_id,
  NULL,
  'donation_received',
  'Donation received',
  'Donation of $' || TRIM(TO_CHAR(d.amount, 'FM9999999990.00')),
  d.created_by,
  NULL,
  'donation',
  d.id,
  CASE WHEN d.contact_id IS NOT NULL THEN 'contact' ELSE NULL END,
  d.contact_id,
  'donations',
  d.id,
  jsonb_build_object(
    'amount', d.amount,
    'currency', d.currency,
    'paymentStatus', d.payment_status,
    'paymentMethod', d.payment_method,
    'campaignName', d.campaign_name,
    'backfilled', true
  ),
  COALESCE(d.donation_date, d.created_at),
  COALESCE(d.created_at, d.donation_date)
FROM donations d
ON CONFLICT DO NOTHING;

INSERT INTO activity_events (
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  source_table,
  source_record_id,
  metadata,
  occurred_at,
  created_at
)
SELECT
  c.account_id,
  NULL,
  'event_registration',
  'Event registration',
  'A contact registered for an event',
  NULL,
  NULL,
  'event',
  er.event_id,
  'contact',
  er.contact_id,
  'event_registrations',
  er.id,
  jsonb_build_object(
    'registrationId', er.id,
    'registrationStatus', er.registration_status,
    'backfilled', true
  ),
  er.created_at,
  er.created_at
FROM event_registrations er
LEFT JOIN contacts c ON c.id = er.contact_id
ON CONFLICT DO NOTHING;

INSERT INTO activity_events (
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  source_table,
  source_record_id,
  metadata,
  occurred_at,
  created_at
)
SELECT
  c.account_id,
  NULL,
  'event_check_in',
  'Event attendee checked in',
  'An attendee was checked in to an event',
  er.checked_in_by,
  NULL,
  'event',
  er.event_id,
  'contact',
  er.contact_id,
  'event_registrations',
  er.id,
  jsonb_build_object(
    'registrationId', er.id,
    'method', er.check_in_method,
    'backfilled', true
  ),
  COALESCE(er.check_in_time, er.updated_at, er.created_at),
  er.created_at
FROM event_registrations er
LEFT JOIN contacts c ON c.id = er.contact_id
WHERE er.checked_in = true
ON CONFLICT DO NOTHING;

INSERT INTO activity_events (
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  source_table,
  source_record_id,
  metadata,
  occurred_at,
  created_at
)
SELECT
  c.account_id,
  NULL,
  'portal_action',
  'Portal activity',
  COALESCE(pal.details, pal.action),
  NULL,
  NULLIF(TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))), ''),
  'contact',
  pu.contact_id,
  NULL,
  NULL,
  'portal_activity_logs',
  pal.id,
  jsonb_build_object(
    'action', pal.action,
    'portalUserId', pal.portal_user_id,
    'userAgent', pal.user_agent,
    'backfilled', true
  ),
  pal.created_at,
  pal.created_at
FROM portal_activity_logs pal
JOIN portal_users pu ON pu.id = pal.portal_user_id
JOIN contacts c ON c.id = pu.contact_id
ON CONFLICT DO NOTHING;

WITH public_submission_cutoffs AS (
  SELECT site_id, MIN(created_at) AS first_submission_at
  FROM public_submissions
  GROUP BY site_id
)
INSERT INTO activity_events (
  organization_id,
  site_id,
  activity_type,
  title,
  description,
  actor_user_id,
  actor_name,
  entity_type,
  entity_id,
  related_entity_type,
  related_entity_id,
  source_table,
  source_record_id,
  metadata,
  occurred_at,
  created_at
)
SELECT
  ps.organization_id,
  sa.site_id,
  CASE
    WHEN sa.event_type = 'donation' THEN 'public_donation_submitted'
    WHEN COALESCE(sa.event_data ->> 'formType', '') = 'newsletter-signup' THEN 'newsletter_signup'
    WHEN COALESCE(sa.event_data ->> 'formType', '') = 'volunteer-interest-form' THEN 'volunteer_interest_submitted'
    ELSE 'public_form_submission'
  END AS activity_type,
  CASE
    WHEN sa.event_type = 'donation' THEN 'Public donation submitted'
    WHEN COALESCE(sa.event_data ->> 'formType', '') = 'newsletter-signup' THEN 'Public newsletter signup'
    WHEN COALESCE(sa.event_data ->> 'formType', '') = 'volunteer-interest-form' THEN 'Volunteer interest submitted'
    ELSE 'Public contact form submitted'
  END AS title,
  sa.page_path,
  NULL,
  NULL,
  CASE
    WHEN COALESCE(sa.event_data ->> 'sourceEntityType', '') IN ('contact', 'volunteer', 'donation')
    THEN (sa.event_data ->> 'sourceEntityType')::varchar(50)
    WHEN sa.event_type = 'donation' THEN 'donation'
    ELSE 'contact'
  END AS entity_type,
  (sa.event_data ->> 'sourceEntityId')::uuid AS entity_id,
  NULL,
  NULL,
  'site_analytics',
  sa.id,
  jsonb_build_object(
    'formKey', sa.event_data ->> 'formKey',
    'formType', sa.event_data ->> 'formType',
    'backfilled', true
  ),
  sa.created_at,
  sa.created_at
FROM site_analytics sa
JOIN published_sites ps ON ps.id = sa.site_id
LEFT JOIN public_submission_cutoffs cutoffs ON cutoffs.site_id = sa.site_id
WHERE sa.event_type IN ('form_submit', 'donation')
  AND jsonb_typeof(sa.event_data) = 'object'
  AND jsonb_typeof(sa.event_data -> 'sourceEntityId') = 'string'
  AND (sa.event_data ->> 'sourceEntityId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND (
    cutoffs.first_submission_at IS NULL
    OR sa.created_at < cutoffs.first_submission_at
  )
ON CONFLICT DO NOTHING;
