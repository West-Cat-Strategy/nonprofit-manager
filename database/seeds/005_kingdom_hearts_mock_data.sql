-- Kingdom Hearts mock data (no users)
-- Intended for first-run dev DB initialization via docker-compose.dev.yml
-- Run after all migrations

\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- ACCOUNTS (Organizations)
-- ============================================================================
INSERT INTO accounts (
  id, account_name, account_type, website, phone, email,
  address_line1, city, state_province, postal_code, country,
  is_active, created_at
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Radiant Garden Relief', 'nonprofit', 'HTTPS://radiant-garden.example.org', '555-0201', 'hello@radiant-garden.example.org', '1 Restoration Way', 'Radiant Garden', 'RG', '00001', 'USA', true, NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Twilight Town Youth Center', 'nonprofit', 'HTTPS://twilight-town.example.org', '555-0202', 'info@twilight-town.example.org', '7 Sunset Boulevard', 'Twilight Town', 'TT', '00002', 'USA', true, NOW()),
  ('10000000-0000-0000-0000-000000000003', 'Traverse Town Community Kitchen', 'nonprofit', 'HTTPS://traverse-town.example.org', '555-0203', 'kitchen@traverse-town.example.org', '9 District Street', 'Traverse Town', 'TR', '00003', 'USA', true, NOW()),
  ('10000000-0000-0000-0000-000000000004', 'Destiny Islands Mutual Aid', 'nonprofit', 'HTTPS://destiny-islands.example.org', '555-0204', 'team@destiny-islands.example.org', '3 Seaside Lane', 'Destiny Islands', 'DI', '00004', 'USA', true, NOW()),
  ('10000000-0000-0000-0000-000000000005', 'Disney Castle Foundation', 'foundation', 'HTTPS://castle-foundation.example.org', '555-0205', 'grants@castle-foundation.example.org', '1 Castle Courtyard', 'Disney Castle', 'DC', '00005', 'USA', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACTS (People)
-- ============================================================================
INSERT INTO contacts (
  id, first_name, last_name, email, phone, mobile_phone, account_id, job_title,
  is_active, birth_date, gender, pronouns,
  address_line1, city, state_province, postal_code, country,
  preferred_contact_method, created_at
)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Sora', 'Keyblade', 'sora@example.com', '555-1101', '555-2101', NULL, 'Volunteer', true, '2002-03-28', 'Male', 'he/him', '1 Beach Path', 'Destiny Islands', 'DI', '00004', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000002', 'Riku', 'Islander', 'riku@example.com', '555-1102', '555-2102', NULL, 'Volunteer', true, '2002-01-01', 'Male', 'he/him', '2 Beach Path', 'Destiny Islands', 'DI', '00004', 'USA', 'phone', NOW()),
  ('20000000-0000-0000-0000-000000000003', 'Kairi', 'Islander', 'kairi@example.com', '555-1103', '555-2103', NULL, 'Volunteer', true, '2002-05-01', 'Female', 'she/her', '3 Beach Path', 'Destiny Islands', 'DI', '00004', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000004', 'Donald', 'Duck', 'donald@example.com', '555-1104', NULL, '10000000-0000-0000-0000-000000000005', 'Outreach Lead', true, NULL, NULL, NULL, '1 Castle Courtyard', 'Disney Castle', 'DC', '00005', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000005', 'Goofy', 'Goof', 'goofy@example.com', '555-1105', NULL, '10000000-0000-0000-0000-000000000005', 'Volunteer Coordinator', true, NULL, NULL, NULL, '1 Castle Courtyard', 'Disney Castle', 'DC', '00005', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000006', 'Mickey', 'Mouse', 'mickey@example.com', '555-1106', NULL, '10000000-0000-0000-0000-000000000005', 'Program Sponsor', true, NULL, NULL, NULL, '1 Castle Courtyard', 'Disney Castle', 'DC', '00005', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000007', 'Aqua', 'Keyblade', 'aqua@example.com', '555-1107', NULL, '10000000-0000-0000-0000-000000000001', 'Case Worker', true, NULL, 'Female', 'she/her', '1 Restoration Way', 'Radiant Garden', 'RG', '00001', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-000000000008', 'Terra', 'Keyblade', 'terra@example.com', '555-1108', NULL, '10000000-0000-0000-0000-000000000001', 'Volunteer', true, NULL, 'Male', 'he/him', '1 Restoration Way', 'Radiant Garden', 'RG', '00001', 'USA', 'phone', NOW()),
  ('20000000-0000-0000-0000-000000000009', 'Ventus', 'Keyblade', 'ventus@example.com', '555-1109', NULL, '10000000-0000-0000-0000-000000000002', 'Volunteer', true, NULL, 'Male', 'he/him', '7 Sunset Boulevard', 'Twilight Town', 'TT', '00002', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-00000000000a', 'Roxas', 'Twilight', 'roxas@example.com', '555-1110', NULL, '10000000-0000-0000-0000-000000000002', 'Youth Mentor', true, NULL, NULL, NULL, '7 Sunset Boulevard', 'Twilight Town', 'TT', '00002', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-00000000000b', 'Lea', 'Axel', 'axel@example.com', '555-1111', NULL, NULL, 'Volunteer', true, NULL, NULL, NULL, '12 Sunset Boulevard', 'Twilight Town', 'TT', '00002', 'USA', 'phone', NOW()),
  ('20000000-0000-0000-0000-00000000000c', 'Namine', 'Artist', 'namine@example.com', '555-1112', NULL, NULL, 'Donor', true, NULL, NULL, NULL, '4 Sketch Lane', 'Twilight Town', 'TT', '00002', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-00000000000d', 'Yen', 'Sid', 'yensid@example.com', '555-1113', NULL, NULL, 'Advisor', true, NULL, NULL, NULL, '1 Tower Road', 'Disney Castle', 'DC', '00005', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-00000000000e', 'Hera', 'Hercules', 'herc@example.com', '555-1114', NULL, NULL, 'Corporate Partner', true, NULL, NULL, NULL, '1 Coliseum Way', 'Olympus', 'OL', '00006', 'USA', 'email', NOW()),
  ('20000000-0000-0000-0000-00000000000f', 'Raine', 'Fairy', 'fairy@example.com', '555-1115', NULL, NULL, 'Major Donor', true, NULL, NULL, NULL, '99 Star Road', 'Traverse Town', 'TR', '00003', 'USA', 'email', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VOLUNTEERS
-- ============================================================================
INSERT INTO volunteers (
  id, contact_id, volunteer_status, skills, availability,
  background_check_status, hours_contributed, created_at
)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'active', ARRAY['outreach','event_support','inventory'], 'Weekends', 'cleared', 42.5, NOW()),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'active', ARRAY['logistics','transport','safety'], 'Evenings', 'cleared', 31.0, NOW()),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'active', ARRAY['client_support','intake','communications'], 'Weekdays', 'cleared', 27.75, NOW()),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'active', ARRAY['fundraising','community_partnerships'], 'Weekdays', 'cleared', 18.0, NOW()),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'active', ARRAY['volunteer_coordination','training'], 'Weekdays', 'cleared', 55.0, NOW()),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000007', 'active', ARRAY['case_management','intake','referrals'], 'Weekdays', 'cleared', 64.25, NOW()),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000008', 'active', ARRAY['facilities','maintenance','safety'], 'Weekends', 'pending', 6.0, NOW()),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009', 'active', ARRAY['youth_programs','mentoring'], 'Afternoons', 'cleared', 22.0, NOW()),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-00000000000a', 'active', ARRAY['tutoring','mentoring','planning'], 'Weekdays', 'cleared', 15.5, NOW()),
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b', 'active', ARRAY['event_support','donor_relations'], 'Evenings', 'cleared', 9.0, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENTS
-- ============================================================================
INSERT INTO events (
  id, name, description, event_type, status, start_date, end_date,
  location_name, address_line1, city, state_province, postal_code, country,
  capacity, registered_count, attended_count, created_at
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    'Twilight Town Community Cleanup',
    'Neighborhood cleanup + supply drive to support youth programs.',
    'volunteer',
    'planned',
    '2026-03-07 10:00:00+00',
    '2026-03-07 14:00:00+00',
    'Station Plaza',
    '1 Station Plaza',
    'Twilight Town',
    'TT',
    '00002',
    'USA',
    150,
    0,
    0,
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Keyblade Food Drive',
    'Food drive benefiting the Traverse Town Community Kitchen.',
    'fundraiser',
    'planned',
    '2026-04-12 16:00:00+00',
    '2026-04-12 20:00:00+00',
    'Third District Marketplace',
    '9 District Street',
    'Traverse Town',
    'TR',
    '00003',
    'USA',
    250,
    0,
    0,
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Radiant Garden Restoration Gala',
    'Fundraising gala supporting housing and emergency assistance programs.',
    'gala',
    'planned',
    '2026-05-30 18:30:00+00',
    '2026-05-30 22:00:00+00',
    'Restoration Hall',
    '1 Restoration Way',
    'Radiant Garden',
    'RG',
    '00001',
    'USA',
    300,
    0,
    0,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENT REGISTRATIONS
-- ============================================================================
INSERT INTO event_registrations (
  id, event_id, contact_id, registration_status, checked_in, notes, created_at
)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'registered', false, 'Bringing extra gloves and bags.', NOW()),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'registered', false, 'Coordinating check-in table.', NOW()),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'registered', false, 'Helping with drop-off logistics.', NOW()),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'registered', false, 'Partner outreach to local vendors.', NOW()),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000000c', 'registered', false, 'Interested in sponsoring a table.', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONATIONS
-- ============================================================================
INSERT INTO donations (
  id, donation_number, account_id, contact_id, amount, currency, donation_date,
  payment_method, payment_status, campaign_name, designation, notes, created_at
)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'KH-2026-0001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-00000000000f', 250.00, 'USD', '2026-02-01 12:00:00+00', 'credit_card', 'completed', 'Keyblade Food Drive', 'Community Kitchen', 'Quarterly giving.', NOW()),
  ('60000000-0000-0000-0000-000000000002', 'KH-2026-0002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-00000000000c', 75.00, 'USD', '2026-02-02 09:30:00+00', 'cash', 'completed', 'Restoration Fund', 'Emergency Assistance', 'In honor of the cleanup team.', NOW()),
  ('60000000-0000-0000-0000-000000000003', 'KH-2026-0003', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', 500.00, 'USD', '2026-02-03 17:45:00+00', 'bank_transfer', 'completed', 'Destiny Islands Mutual Aid', 'Food & Supplies', 'Annual pledge.', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TASKS
-- ============================================================================
INSERT INTO tasks (id, subject, description, status, priority, due_date, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'Confirm cleanup supply order', 'Order gloves, bags, and safety vests for the Twilight Town cleanup.', 'in_progress', 'high', '2026-02-20 17:00:00+00', NOW()),
  ('70000000-0000-0000-0000-000000000002', 'Recruit volunteers for food drive', 'Contact local partners and post volunteer signup link.', 'not_started', 'normal', '2026-03-15 17:00:00+00', NOW()),
  ('70000000-0000-0000-0000-000000000003', 'Send donor thank-you notes', 'Send thank-you emails for recent KH-2026 donations.', 'not_started', 'normal', '2026-02-10 17:00:00+00', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASES (use default case types/statuses seeded by migration 009)
-- ============================================================================
WITH
  ct_general AS (SELECT id FROM case_types WHERE name = 'General Support' LIMIT 1),
  ct_housing AS (SELECT id FROM case_types WHERE name = 'Housing' LIMIT 1),
  ct_employment AS (SELECT id FROM case_types WHERE name = 'Employment' LIMIT 1),
  cs_intake AS (SELECT id FROM case_statuses WHERE name = 'Intake' LIMIT 1),
  cs_active AS (SELECT id FROM case_statuses WHERE name = 'Active' LIMIT 1),
  cs_closed AS (SELECT id FROM case_statuses WHERE name = 'Closed - Successful' LIMIT 1)
INSERT INTO cases (id, case_number, title, description, contact_id, account_id, case_type_id, status_id, priority, is_urgent, due_date, created_at, tags)
SELECT
  '80000000-0000-0000-0000-000000000001',
  'KH-CASE-2026-0001',
  'Emergency Supplies Assistance',
  'Client requested immediate assistance with food and household supplies.',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  (SELECT id FROM ct_general),
  (SELECT id FROM cs_active),
  'high',
  true,
  '2026-02-12',
  NOW(),
  ARRAY['emergency','supplies']
WHERE (SELECT id FROM ct_general) IS NOT NULL AND (SELECT id FROM cs_active) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

WITH
  ct_housing AS (SELECT id FROM case_types WHERE name = 'Housing' LIMIT 1),
  cs_intake AS (SELECT id FROM case_statuses WHERE name = 'Intake' LIMIT 1)
INSERT INTO cases (id, case_number, title, description, contact_id, account_id, case_type_id, status_id, priority, is_urgent, due_date, created_at, tags)
SELECT
  '80000000-0000-0000-0000-000000000002',
  'KH-CASE-2026-0002',
  'Temporary Housing Intake',
  'Housing intake scheduled; assessing eligibility for short-term assistance.',
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  (SELECT id FROM ct_housing),
  (SELECT id FROM cs_intake),
  'medium',
  false,
  '2026-03-01',
  NOW(),
  ARRAY['housing','intake']
WHERE (SELECT id FROM ct_housing) IS NOT NULL AND (SELECT id FROM cs_intake) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

WITH
  ct_employment AS (SELECT id FROM case_types WHERE name = 'Employment' LIMIT 1),
  cs_closed AS (SELECT id FROM case_statuses WHERE name = 'Closed - Successful' LIMIT 1)
INSERT INTO cases (id, case_number, title, description, contact_id, account_id, case_type_id, status_id, priority, is_urgent, due_date, created_at, tags)
SELECT
  '80000000-0000-0000-0000-000000000003',
  'KH-CASE-2025-0120',
  'Employment Support (Closed)',
  'Client completed resume support and interview practice successfully.',
  '20000000-0000-0000-0000-00000000000a',
  '10000000-0000-0000-0000-000000000002',
  (SELECT id FROM ct_employment),
  (SELECT id FROM cs_closed),
  'low',
  false,
  '2025-12-31',
  NOW() - INTERVAL '30 days',
  ARRAY['employment','closed']
WHERE (SELECT id FROM ct_employment) IS NOT NULL AND (SELECT id FROM cs_closed) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE NOTES
-- ============================================================================
INSERT INTO case_notes (id, case_id, note_type, subject, content, is_internal, is_important, created_at)
VALUES
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'note', 'Initial intake', 'Client reported urgent need for supplies; referred to pantry pickup and mutual aid delivery.', true, true, NOW()),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 'update', 'Intake scheduled', 'Scheduled housing intake and collected preliminary documentation checklist.', false, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACT NOTES
-- ============================================================================
INSERT INTO contact_notes (id, contact_id, case_id, note_type, subject, content, is_internal, is_important, attachments, created_at)
VALUES
  ('90000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-00000000000f', NULL, 'call', 'Donor thank-you', 'Called to thank donor for supporting the Community Kitchen.', false, false, NULL, NOW()),
  ('90000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'note', 'Follow-up', 'Client confirmed pickup time and preferred contact method for reminders.', true, true, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'Kingdom Hearts mock data loaded successfully (no users).' AS status;
