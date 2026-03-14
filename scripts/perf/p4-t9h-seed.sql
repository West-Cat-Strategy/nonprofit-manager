-- Synthetic dataset for P4-T9H staff catalog perf capture.
-- The first 240 rows in each primary table include the shared marker token "supportwave".

BEGIN;

INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  is_active
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'perf.runner@example.org',
  'not-used',
  'Perf',
  'Runner',
  'admin',
  true
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '11111111-1111-1111-1111-111111111111'::uuid AS account_ns
)
INSERT INTO accounts (
  id,
  account_number,
  account_name,
  account_type,
  category,
  email,
  phone,
  description,
  is_active,
  created_at,
  updated_at,
  created_by,
  modified_by
)
SELECT
  uuid_generate_v5(account_ns, 'account-' || gs::text),
  'ACC-' || lpad(gs::text, 5, '0'),
  CASE
    WHEN gs <= 240 THEN 'supportwave account ' || gs
    ELSE 'baseline account ' || gs
  END,
  CASE WHEN gs % 2 = 0 THEN 'organization' ELSE 'individual' END,
  CASE WHEN gs % 3 = 0 THEN 'community' ELSE 'general' END,
  CASE
    WHEN gs <= 240 THEN 'supportwave.account.' || gs || '@example.org'
    ELSE 'account.' || gs || '@example.org'
  END,
  '555-100-' || lpad((gs % 10000)::text, 4, '0'),
  CASE
    WHEN gs <= 240 THEN 'supportwave seeded account ' || gs
    ELSE 'baseline seeded account ' || gs
  END,
  true,
  NOW() - (gs || ' minutes')::interval,
  NOW() - (gs || ' minutes')::interval,
  user_id,
  user_id
FROM constants
CROSS JOIN generate_series(1, 12000) AS gs
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '11111111-1111-1111-1111-111111111111'::uuid AS account_ns,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns
)
INSERT INTO contacts (
  id,
  account_id,
  first_name,
  preferred_name,
  last_name,
  email,
  phone,
  mobile_phone,
  job_title,
  preferred_contact_method,
  notes,
  pronouns,
  tags,
  is_active,
  created_at,
  updated_at,
  created_by,
  modified_by
)
SELECT
  uuid_generate_v5(contact_ns, 'contact-' || gs::text),
  uuid_generate_v5(account_ns, 'account-' || (((gs - 1) % 12000) + 1)::text),
  CASE
    WHEN gs <= 240 THEN 'supportwave'
    ELSE 'Contact'
  END,
  CASE
    WHEN gs % 5 = 0 THEN 'Preferred ' || gs
    ELSE NULL
  END,
  'Person ' || gs,
  CASE
    WHEN gs <= 240 THEN 'supportwave.contact.' || gs || '@example.org'
    ELSE 'contact.' || gs || '@example.org'
  END,
  '555-200-' || lpad((gs % 10000)::text, 4, '0'),
  '555-300-' || lpad((gs % 10000)::text, 4, '0'),
  'Case Worker',
  'email',
  CASE
    WHEN gs <= 240 THEN 'supportwave contact note seed'
    ELSE 'baseline contact note seed'
  END,
  'they/them',
  ARRAY['seed', CASE WHEN gs <= 240 THEN 'supportwave' ELSE 'baseline' END]::text[],
  true,
  NOW() - (gs || ' minutes')::interval,
  NOW() - (gs || ' minutes')::interval,
  user_id,
  user_id
FROM constants
CROSS JOIN generate_series(1, 12000) AS gs
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns
)
INSERT INTO contact_phone_numbers (
  id,
  contact_id,
  phone_number,
  label,
  is_primary,
  created_by,
  modified_by
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(contact_ns, 'contact-' || contact_no::text),
  '555-410-' || lpad((contact_no % 10000)::text, 4, '0') || '-' || slot_no,
  CASE WHEN slot_no = 1 THEN 'mobile' ELSE 'work' END,
  slot_no = 1,
  user_id,
  user_id
FROM constants
CROSS JOIN generate_series(1, 12000) AS contact_no
CROSS JOIN generate_series(1, 2) AS slot_no
ON CONFLICT (contact_id, phone_number) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns
)
INSERT INTO contact_email_addresses (
  id,
  contact_id,
  email_address,
  label,
  is_primary,
  created_by,
  modified_by
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(contact_ns, 'contact-' || contact_no::text),
  CASE
    WHEN slot_no = 1 THEN 'primary.contact.' || contact_no || '@example.org'
    ELSE 'secondary.contact.' || contact_no || '@example.org'
  END,
  CASE WHEN slot_no = 1 THEN 'personal' ELSE 'work' END,
  slot_no = 1,
  user_id,
  user_id
FROM constants
CROSS JOIN generate_series(1, 12000) AS contact_no
CROSS JOIN generate_series(1, 2) AS slot_no
ON CONFLICT (contact_id, email_address) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns
)
INSERT INTO contact_relationships (
  id,
  contact_id,
  related_contact_id,
  relationship_type,
  relationship_label,
  is_bidirectional,
  is_active,
  created_by,
  modified_by
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(contact_ns, 'contact-' || gs::text),
  uuid_generate_v5(contact_ns, 'contact-' || (gs + 1)::text),
  'support_person',
  'Support Person',
  false,
  true,
  user_id,
  user_id
FROM constants
CROSS JOIN generate_series(1, 11000) AS gs
ON CONFLICT (contact_id, related_contact_id, relationship_type) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns
)
INSERT INTO contact_notes (
  id,
  contact_id,
  note_type,
  subject,
  content,
  is_internal,
  is_important,
  created_by,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(contact_ns, 'contact-' || contact_no::text),
  'note',
  CASE
    WHEN contact_no <= 240 THEN 'supportwave contact note ' || slot_no
    ELSE 'baseline contact note ' || slot_no
  END,
  'Seeded contact note ' || slot_no || ' for contact ' || contact_no,
  false,
  slot_no = 1,
  user_id,
  NOW() - ((contact_no + slot_no) || ' minutes')::interval,
  NOW() - ((contact_no + slot_no) || ' minutes')::interval
FROM constants
CROSS JOIN generate_series(1, 12000) AS contact_no
CROSS JOIN generate_series(1, 2) AS slot_no
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns,
    (
      SELECT id
      FROM contact_roles
      WHERE name = 'Member'
      LIMIT 1
    ) AS role_id
)
INSERT INTO contact_role_assignments (
  contact_id,
  role_id,
  assigned_at,
  assigned_by
)
SELECT
  uuid_generate_v5(contact_ns, 'contact-' || gs::text),
  role_id,
  NOW() - (gs || ' minutes')::interval,
  user_id
FROM constants
CROSS JOIN generate_series(1, 12000) AS gs
WHERE role_id IS NOT NULL
ON CONFLICT (contact_id, role_id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '11111111-1111-1111-1111-111111111111'::uuid AS account_ns,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns,
    '33333333-3333-3333-3333-333333333333'::uuid AS task_ns
)
INSERT INTO tasks (
  id,
  subject,
  description,
  status,
  priority,
  due_date,
  assigned_to,
  related_to_type,
  related_to_id,
  created_by,
  modified_by,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(task_ns, 'task-' || gs::text),
  CASE
    WHEN gs <= 240 THEN 'supportwave task subject ' || gs
    ELSE 'baseline task subject ' || gs
  END,
  CASE
    WHEN gs <= 240 THEN 'supportwave task description ' || gs
    ELSE 'baseline task description ' || gs
  END,
  CASE
    WHEN gs % 5 = 0 THEN 'completed'
    WHEN gs % 3 = 0 THEN 'in_progress'
    ELSE 'not_started'
  END,
  CASE
    WHEN gs % 7 = 0 THEN 'urgent'
    WHEN gs % 5 = 0 THEN 'high'
    WHEN gs % 3 = 0 THEN 'normal'
    ELSE 'low'
  END,
  NOW() + ((gs % 45) || ' days')::interval,
  user_id,
  CASE WHEN gs % 2 = 0 THEN 'account' ELSE 'contact' END,
  CASE
    WHEN gs % 2 = 0
      THEN uuid_generate_v5(account_ns, 'account-' || (((gs - 1) % 12000) + 1)::text)
    ELSE uuid_generate_v5(contact_ns, 'contact-' || (((gs - 1) % 12000) + 1)::text)
  END,
  user_id,
  user_id,
  NOW() - (gs || ' minutes')::interval,
  NOW() - (gs || ' minutes')::interval
FROM constants
CROSS JOIN generate_series(1, 16000) AS gs
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '11111111-1111-1111-1111-111111111111'::uuid AS account_ns,
    '22222222-2222-2222-2222-222222222222'::uuid AS contact_ns,
    '44444444-4444-4444-4444-444444444444'::uuid AS case_ns,
    (
      SELECT id
      FROM case_types
      WHERE is_active = true
      ORDER BY name
      LIMIT 1
    ) AS case_type_id,
    (
      SELECT id
      FROM case_statuses
      WHERE status_type = 'active'
      ORDER BY sort_order, name
      LIMIT 1
    ) AS status_id
)
INSERT INTO cases (
  id,
  case_number,
  contact_id,
  account_id,
  case_type_id,
  status_id,
  priority,
  title,
  description,
  source,
  intake_date,
  opened_date,
  due_date,
  assigned_to,
  is_urgent,
  client_viewable,
  created_by,
  modified_by,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(case_ns, 'case-' || gs::text),
  'CASE-202603-' || lpad(gs::text, 5, '0'),
  uuid_generate_v5(contact_ns, 'contact-' || gs::text),
  uuid_generate_v5(account_ns, 'account-' || gs::text),
  case_type_id,
  status_id,
  CASE
    WHEN gs % 7 = 0 THEN 'urgent'
    WHEN gs % 5 = 0 THEN 'high'
    ELSE 'medium'
  END,
  CASE
    WHEN gs <= 240 THEN 'supportwave case title ' || gs
    ELSE 'baseline case title ' || gs
  END,
  CASE
    WHEN gs <= 240 THEN 'supportwave case description ' || gs
    ELSE 'baseline case description ' || gs
  END,
  'web',
  NOW() - (gs || ' hours')::interval,
  NOW() - (gs || ' hours')::interval,
  CURRENT_DATE + ((gs % 30)::int),
  user_id,
  gs % 7 = 0,
  false,
  user_id,
  user_id,
  NOW() - (gs || ' hours')::interval,
  NOW() - (gs || ' hours')::interval
FROM constants
CROSS JOIN generate_series(1, 8000) AS gs
WHERE case_type_id IS NOT NULL
  AND status_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '44444444-4444-4444-4444-444444444444'::uuid AS case_ns
)
INSERT INTO case_notes (
  id,
  case_id,
  note_type,
  subject,
  content,
  is_internal,
  is_important,
  created_by,
  created_at
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(case_ns, 'case-' || case_no::text),
  'note',
  CASE
    WHEN case_no <= 240 THEN 'supportwave case note ' || slot_no
    ELSE 'baseline case note ' || slot_no
  END,
  'Seeded case note ' || slot_no || ' for case ' || case_no,
  false,
  slot_no = 1,
  user_id,
  NOW() - ((case_no + slot_no) || ' hours')::interval
FROM constants
CROSS JOIN generate_series(1, 8000) AS case_no
CROSS JOIN generate_series(1, 3) AS slot_no
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid AS user_id,
    '44444444-4444-4444-4444-444444444444'::uuid AS case_ns
)
INSERT INTO case_documents (
  id,
  case_id,
  document_name,
  document_type,
  file_path,
  file_size,
  mime_type,
  uploaded_by,
  uploaded_at
)
SELECT
  uuid_generate_v4(),
  uuid_generate_v5(case_ns, 'case-' || case_no::text),
  'seeded-document-' || case_no || '-' || slot_no || '.pdf',
  'report',
  '/seeded/cases/' || case_no || '/' || slot_no || '.pdf',
  1024 + slot_no,
  'application/pdf',
  user_id,
  NOW() - ((case_no + slot_no) || ' hours')::interval
FROM constants
CROSS JOIN generate_series(1, 8000) AS case_no
CROSS JOIN generate_series(1, 2) AS slot_no
ON CONFLICT (id) DO NOTHING;
