-- Mock data without users (preserves first-login behavior)
-- Run after all migrations

BEGIN;

-- ============================================================================
-- ACCOUNTS (Organizations)
-- ============================================================================
INSERT INTO accounts (id, account_name, account_type, website, phone, email, address_line1, city, state_province, postal_code, country, is_active, created_at)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Community Food Bank', 'nonprofit', 'https://communityfoodbank.org', '555-0101', 'info@communityfoodbank.org', '100 Food Bank Drive', 'Springfield', 'IL', '62703', 'USA', true, NOW()),
  ('aaaa2222-2222-2222-2222-222222222222', 'Youth Education Center', 'nonprofit', 'https://yec.org', '555-0102', 'contact@yec.org', '200 Education Way', 'Springfield', 'IL', '62704', 'USA', true, NOW()),
  ('aaaa3333-3333-3333-3333-333333333333', 'Green Earth Initiative', 'nonprofit', 'https://greenearth.org', '555-0103', 'hello@greenearth.org', '300 Green Street', 'Chicago', 'IL', '60603', 'USA', true, NOW()),
  ('aaaa4444-4444-4444-4444-444444444444', 'Smith Family Foundation', 'foundation', 'https://smithfoundation.org', '555-0104', 'grants@smithfoundation.org', '400 Foundation Plaza', 'Chicago', 'IL', '60604', 'USA', true, NOW()),
  ('aaaa5555-5555-5555-5555-555555555555', 'TechCorp Industries', 'corporate', 'https://techcorp.com', '555-0105', 'partnerships@techcorp.com', '500 Tech Boulevard', 'Chicago', 'IL', '60605', 'USA', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACTS (People)
-- ============================================================================
INSERT INTO contacts (id, first_name, last_name, email, phone, account_id, job_title, is_active, birth_date, gender, address_line1, city, state_province, postal_code, country, preferred_contact_method, created_at)
VALUES
  ('cccc1111-1111-1111-1111-111111111111', 'Emily', 'Johnson', 'emily.johnson@email.com', '555-1001', NULL, NULL, true, '1985-03-15', 'Female', '123 Oak Street', 'Springfield', 'IL', '62701', 'USA', 'email', NOW()),
  ('cccc2222-2222-2222-2222-222222222222', 'Michael', 'Chen', 'michael.chen@email.com', '555-1002', NULL, NULL, true, '1978-07-22', 'Male', '456 Maple Avenue', 'Springfield', 'IL', '62702', 'USA', 'phone', NOW()),
  ('cccc3333-3333-3333-3333-333333333333', 'Sarah', 'Williams', 'sarah.williams@email.com', '555-1003', NULL, NULL, true, '1990-11-08', 'Female', '789 Pine Road', 'Chicago', 'IL', '60601', 'USA', 'email', NOW()),
  ('cccc4444-4444-4444-4444-444444444444', 'James', 'Rodriguez', 'james.rodriguez@email.com', '555-1004', NULL, NULL, true, '1982-01-30', 'Male', '321 Elm Street', 'Chicago', 'IL', '60602', 'USA', 'email', NOW()),
  ('cccc5555-5555-5555-5555-555555555555', 'Amanda', 'Taylor', 'amanda.taylor@email.com', '555-1005', NULL, NULL, true, '1995-06-12', 'Female', '654 Cedar Lane', 'Naperville', 'IL', '60540', 'USA', 'email', NOW()),
  ('cccc6666-6666-6666-6666-666666666666', 'Robert', 'Martinez', 'robert.martinez@communityfoodbank.org', '555-1006', 'aaaa1111-1111-1111-1111-111111111111', 'Executive Director', true, '1970-04-18', 'Male', '100 Food Bank Drive', 'Springfield', 'IL', '62703', 'USA', 'email', NOW()),
  ('cccc7777-7777-7777-7777-777777777777', 'Lisa', 'Anderson', 'lisa.anderson@yec.org', '555-1007', 'aaaa2222-2222-2222-2222-222222222222', 'Program Director', true, '1983-09-25', 'Female', '200 Education Way', 'Springfield', 'IL', '62704', 'USA', 'email', NOW()),
  ('cccc8888-8888-8888-8888-888888888888', 'David', 'Thompson', 'david.thompson@greenearth.org', '555-1008', 'aaaa3333-3333-3333-3333-333333333333', 'Volunteer Coordinator', true, '1988-12-03', 'Male', '300 Green Street', 'Chicago', 'IL', '60603', 'USA', 'phone', NOW()),
  ('cccc9999-9999-9999-9999-999999999999', 'Jennifer', 'Smith', 'jennifer.smith@smithfoundation.org', '555-1009', 'aaaa4444-4444-4444-4444-444444444444', 'Grants Manager', true, '1975-05-20', 'Female', '400 Foundation Plaza', 'Chicago', 'IL', '60604', 'USA', 'email', NOW()),
  ('ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kevin', 'Brown', 'kevin.brown@techcorp.com', '555-1010', 'aaaa5555-5555-5555-5555-555555555555', 'CSR Director', true, '1980-08-14', 'Male', '500 Tech Boulevard', 'Chicago', 'IL', '60605', 'USA', 'email', NOW()),
  ('ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Patricia', 'Garcia', 'patricia.garcia@email.com', '555-1011', NULL, NULL, true, '1992-02-28', 'Female', '111 First Avenue', 'Evanston', 'IL', '60201', 'USA', 'email', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Christopher', 'Lee', 'christopher.lee@email.com', '555-1012', NULL, NULL, true, '1987-10-05', 'Male', '222 Second Street', 'Evanston', 'IL', '60202', 'USA', 'phone', NOW()),
  ('ccccdddd-dddd-dddd-dddd-dddddddddddd', 'Michelle', 'Wilson', 'michelle.wilson@email.com', '555-1013', NULL, NULL, true, '1993-07-17', 'Female', '333 Third Place', 'Oak Park', 'IL', '60301', 'USA', 'email', NOW()),
  ('cccceeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Daniel', 'Harris', 'daniel.harris@email.com', '555-1014', NULL, NULL, true, '1979-04-09', 'Male', '444 Fourth Drive', 'Oak Park', 'IL', '60302', 'USA', 'email', NOW()),
  ('ccccffff-ffff-ffff-ffff-ffffffffffff', 'Jessica', 'Clark', 'jessica.clark@email.com', '555-1015', NULL, NULL, true, '1991-11-23', 'Female', '555 Fifth Court', 'Schaumburg', 'IL', '60173', 'USA', 'email', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACT PHONES / EMAILS
-- ============================================================================
INSERT INTO contact_phone_numbers (id, contact_id, phone_number, label, is_primary, created_at)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', '555-1001', 'mobile', true, NOW()),
  ('f2222222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', '555-1002', 'mobile', true, NOW()),
  ('f3333333-3333-3333-3333-333333333333', 'cccc3333-3333-3333-3333-333333333333', '555-1003', 'mobile', true, NOW()),
  ('f4444444-4444-4444-4444-444444444444', 'cccc4444-4444-4444-4444-444444444444', '555-1004', 'mobile', true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO contact_email_addresses (id, contact_id, email_address, label, is_primary, created_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'emily.johnson@email.com', 'personal', true, NOW()),
  ('e2222222-2222-2222-2222-222222222222', 'cccc2222-2222-2222-2222-222222222222', 'michael.chen@email.com', 'personal', true, NOW()),
  ('e3333333-3333-3333-3333-333333333333', 'cccc3333-3333-3333-3333-333333333333', 'sarah.williams@email.com', 'personal', true, NOW()),
  ('e4444444-4444-4444-4444-444444444444', 'cccc4444-4444-4444-4444-444444444444', 'james.rodriguez@email.com', 'personal', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VOLUNTEERS
-- ============================================================================
INSERT INTO volunteers (id, contact_id, volunteer_status, skills, availability, background_check_date, background_check_status, emergency_contact_name, emergency_contact_phone, created_at)
VALUES
  ('f9111111-1111-1111-1111-111111111111', 'cccc3333-3333-3333-3333-333333333333', 'active', ARRAY['event_planning', 'fundraising', 'social_media'], 'weekends', '2025-06-15', 'cleared', 'Tom Williams', '555-9001', NOW()),
  ('f9222222-2222-2222-2222-222222222222', 'cccc5555-5555-5555-5555-555555555555', 'active', ARRAY['tutoring', 'mentoring'], 'evenings', '2025-07-20', 'cleared', 'Bob Taylor', '555-9002', NOW()),
  ('f9333333-3333-3333-3333-333333333333', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', ARRAY['administrative', 'data_entry'], 'flexible', '2025-08-10', 'cleared', 'Maria Garcia', '555-9003', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENTS + REGISTRATIONS
-- ============================================================================
INSERT INTO events (id, name, description, event_type, start_date, end_date, location_name, capacity, status, created_at)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Annual Gala Dinner', 'Flagship fundraising event with dinner and auction.', 'fundraiser', '2026-03-15 18:00:00', '2026-03-15 23:00:00', 'Grand Ballroom, Hilton Hotel', 300, 'planned', NOW()),
  ('e2222222-2222-2222-2222-222222222222', 'Volunteer Appreciation Day', 'Thank you event for volunteers.', 'appreciation', '2026-04-20 12:00:00', '2026-04-20 16:00:00', 'Community Center', 100, 'planned', NOW()),
  ('e3333333-3333-3333-3333-333333333333', 'Community Cleanup Day', 'Neighborhood cleanup initiative.', 'community', '2026-04-05 09:00:00', '2026-04-05 14:00:00', 'Riverside Park', 50, 'planned', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO event_registrations (id, event_id, contact_id, registration_status, checked_in, created_at)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'registered', false, NOW()),
  ('f2222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'cccc2222-2222-2222-2222-222222222222', 'registered', false, NOW()),
  ('f3333333-3333-3333-3333-333333333333', 'e3333333-3333-3333-3333-333333333333', 'cccc3333-3333-3333-3333-333333333333', 'registered', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONATIONS
-- ============================================================================
INSERT INTO donations (id, contact_id, account_id, amount, donation_date, payment_method, payment_status, campaign_name, notes, is_recurring, created_at)
VALUES
  ('dddd1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', NULL, 500.00, '2025-12-15', 'credit_card', 'completed', 'Year-End Campaign', 'Annual gift', false, NOW()),
  ('dddd2222-2222-2222-2222-222222222222', 'cccc1111-1111-1111-1111-111111111111', NULL, 100.00, '2025-11-01', 'credit_card', 'completed', 'Monthly Giving', 'Monthly supporter', true, NOW()),
  ('dddd3333-3333-3333-3333-333333333333', 'cccc2222-2222-2222-2222-222222222222', NULL, 1000.00, '2025-12-20', 'check', 'completed', 'Year-End Campaign', 'Major gift', false, NOW()),
  ('dddd7777-7777-7777-7777-777777777777', NULL, 'aaaa4444-4444-4444-4444-444444444444', 25000.00, '2025-09-01', 'wire', 'completed', 'Foundation Grant', 'Annual operating grant', false, NOW()),
  ('dddd8888-8888-8888-8888-888888888888', NULL, 'aaaa5555-5555-5555-5555-555555555555', 10000.00, '2025-11-20', 'check', 'completed', 'Corporate Matching', 'Employee matching gift', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ACTIVITIES
-- ============================================================================
INSERT INTO activities (id, activity_type, subject, description, activity_date, regarding_type, regarding_id, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'call', 'Donor follow-up', 'Left voicemail re: annual giving', NOW() - INTERVAL '5 days', 'contact', 'cccc1111-1111-1111-1111-111111111111', NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'email', 'Grant update', 'Sent Q4 impact update to foundation', NOW() - INTERVAL '12 days', 'account', 'aaaa4444-4444-4444-4444-444444444444', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TASKS
-- ============================================================================
INSERT INTO tasks (id, subject, description, status, priority, due_date, created_at)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Follow up with Emily Johnson', 'Call Emily about increasing monthly donation', 'not_started', 'normal', '2026-02-15', NOW()),
  ('d2222222-2222-2222-2222-222222222222', 'Prepare grant report', 'Q4 report for Smith Foundation grant', 'in_progress', 'high', '2026-02-10', NOW())
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
INSERT INTO cases (id, case_number, title, description, contact_id, case_type_id, status_id, priority, is_urgent, due_date, created_at)
SELECT
  'c1111111-1111-1111-1111-111111111111',
  'CASE-2026-0001',
  'Emergency Food Assistance',
  'Family needs immediate food support after job loss.',
  'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (SELECT id FROM ct_general),
  (SELECT id FROM cs_active),
  'high',
  true,
  '2026-02-10',
  NOW()
WHERE (SELECT id FROM ct_general) IS NOT NULL AND (SELECT id FROM cs_active) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

WITH
  ct_housing AS (SELECT id FROM case_types WHERE name = 'Housing' LIMIT 1),
  cs_intake AS (SELECT id FROM case_statuses WHERE name = 'Intake' LIMIT 1)
INSERT INTO cases (id, case_number, title, description, contact_id, case_type_id, status_id, priority, is_urgent, due_date, created_at)
SELECT
  'c2222222-2222-2222-2222-222222222222',
  'CASE-2026-0002',
  'Housing Support Intake',
  'Rental assistance intake for recently displaced client.',
  'ccccdddd-dddd-dddd-dddd-dddddddddddd',
  (SELECT id FROM ct_housing),
  (SELECT id FROM cs_intake),
  'medium',
  false,
  '2026-03-01',
  NOW()
WHERE (SELECT id FROM ct_housing) IS NOT NULL AND (SELECT id FROM cs_intake) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

WITH
  ct_employment AS (SELECT id FROM case_types WHERE name = 'Employment' LIMIT 1),
  cs_closed AS (SELECT id FROM case_statuses WHERE name = 'Closed - Successful' LIMIT 1)
INSERT INTO cases (id, case_number, title, description, contact_id, case_type_id, status_id, priority, is_urgent, due_date, created_at)
SELECT
  'c3333333-3333-3333-3333-333333333333',
  'CASE-2025-0120',
  'Job Search Assistance',
  'Client completed job search coaching successfully.',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  (SELECT id FROM ct_employment),
  (SELECT id FROM cs_closed),
  'low',
  false,
  '2025-12-31',
  NOW() - INTERVAL '30 days'
WHERE (SELECT id FROM ct_employment) IS NOT NULL AND (SELECT id FROM cs_closed) IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE NOTES
-- ============================================================================
INSERT INTO case_notes (id, case_id, note_type, subject, content, is_internal, is_important, created_at)
VALUES
  ('c9111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'note', 'Initial intake', 'Client reported job loss and food insecurity. Provided emergency resources.', true, true, NOW()),
  ('c9222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'update', 'Housing intake scheduled', 'Scheduled intake appointment for housing support.', false, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACT NOTES (supports "Note an Interaction")
-- ============================================================================
INSERT INTO contact_notes (id, contact_id, case_id, note_type, subject, content, is_internal, is_important, attachments, created_at)
VALUES
  ('b9111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', NULL, 'call', 'Thank you call', 'Called to thank donor for their annual contribution.', false, false, NULL, NOW()),
  ('b9222222-2222-2222-2222-222222222222', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'c1111111-1111-1111-1111-111111111111', 'note', 'Food assistance follow-up', 'Client confirmed they received the food box and needs ongoing support.', true, true, '[{"name":"Follow-up checklist","url":"/files/followup-checklist.pdf","type":"application/pdf","size":12043}]'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'Mock data (no users) loaded successfully!' AS status;
