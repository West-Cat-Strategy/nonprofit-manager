-- Mock data for development and testing
-- Run after all migrations
-- Password for all users: 'password123' (hash generated with bcrypt)

\set ON_ERROR_STOP on

-- ============================================================================
-- USERS
-- ============================================================================
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com', '$2a$10$ylcNfn/4fZuCN5MGbXCLV.trRFYhylZ2p9Pl5/3e0HsPu4eZJ0ZGS', 'Admin', 'User', 'admin', true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'manager@example.com', '$2a$10$ylcNfn/4fZuCN5MGbXCLV.trRFYhylZ2p9Pl5/3e0HsPu4eZJ0ZGS', 'Sarah', 'Manager', 'manager', true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'staff@example.com', '$2a$10$ylcNfn/4fZuCN5MGbXCLV.trRFYhylZ2p9Pl5/3e0HsPu4eZJ0ZGS', 'John', 'Staff', 'user', true, NOW())
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- ACCOUNTS (Organizations)
-- ============================================================================
INSERT INTO accounts (id, account_name, account_type, website, phone, email, is_active, created_at)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Community Food Bank', 'nonprofit', 'https://communityfoodbank.org', '555-0101', 'info@communityfoodbank.org', true, NOW()),
  ('aaaa2222-2222-2222-2222-222222222222', 'Youth Education Center', 'nonprofit', 'https://yec.org', '555-0102', 'contact@yec.org', true, NOW()),
  ('aaaa3333-3333-3333-3333-333333333333', 'Green Earth Initiative', 'nonprofit', 'HTTPS://greenearth.org', '555-0103', 'hello@greenearth.org', true, NOW()),
  ('aaaa4444-4444-4444-4444-444444444444', 'Smith Family Foundation', 'foundation', 'https://smithfoundation.org', '555-0104', 'grants@smithfoundation.org', true, NOW()),
  ('aaaa5555-5555-5555-5555-555555555555', 'TechCorp Industries', 'corporate', 'HTTPS://techcorp.com', '555-0105', 'partnerships@techcorp.com', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONTACTS (People)
-- ============================================================================
INSERT INTO contacts (id, first_name, last_name, email, phone, account_id, job_title, is_active, birth_date, gender, address_line1, city, state_province, postal_code, country, preferred_contact_method, created_at, created_by)
VALUES
  -- Individual donors
  ('cccc1111-1111-1111-1111-111111111111', 'Emily', 'Johnson', 'emily.johnson@email.com', '555-1001', NULL, NULL, true, '1985-03-15', 'Female', '123 Oak Street', 'Springfield', 'IL', '62701', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc2222-2222-2222-2222-222222222222', 'Michael', 'Chen', 'michael.chen@email.com', '555-1002', NULL, NULL, true, '1978-07-22', 'Male', '456 Maple Avenue', 'Springfield', 'IL', '62702', 'USA', 'phone', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc3333-3333-3333-3333-333333333333', 'Sarah', 'Williams', 'sarah.williams@email.com', '555-1003', NULL, NULL, true, '1990-11-08', 'Female', '789 Pine Road', 'Chicago', 'IL', '60601', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc4444-4444-4444-4444-444444444444', 'James', 'Rodriguez', 'james.rodriguez@email.com', '555-1004', NULL, NULL, true, '1982-01-30', 'Male', '321 Elm Street', 'Chicago', 'IL', '60602', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc5555-5555-5555-5555-555555555555', 'Amanda', 'Taylor', 'amanda.taylor@email.com', '555-1005', NULL, NULL, true, '1995-06-12', 'Female', '654 Cedar Lane', 'Naperville', 'IL', '60540', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  -- Organization contacts
  ('cccc6666-6666-6666-6666-666666666666', 'Robert', 'Martinez', 'robert.martinez@communityfoodbank.org', '555-1006', 'aaaa1111-1111-1111-1111-111111111111', 'Executive Director', true, '1970-04-18', 'Male', '100 Food Bank Drive', 'Springfield', 'IL', '62703', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc7777-7777-7777-7777-777777777777', 'Lisa', 'Anderson', 'lisa.anderson@yec.org', '555-1007', 'aaaa2222-2222-2222-2222-222222222222', 'Program Director', true, '1983-09-25', 'Female', '200 Education Way', 'Springfield', 'IL', '62704', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc8888-8888-8888-8888-888888888888', 'David', 'Thompson', 'david.thompson@greenearth.org', '555-1008', 'aaaa3333-3333-3333-3333-333333333333', 'Volunteer Coordinator', true, '1988-12-03', 'Male', '300 Green Street', 'Chicago', 'IL', '60603', 'USA', 'phone', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccc9999-9999-9999-9999-999999999999', 'Jennifer', 'Smith', 'jennifer.smith@smithfoundation.org', '555-1009', 'aaaa4444-4444-4444-4444-444444444444', 'Grants Manager', true, '1975-05-20', 'Female', '400 Foundation Plaza', 'Chicago', 'IL', '60604', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kevin', 'Brown', 'kevin.brown@techcorp.com', '555-1010', 'aaaa5555-5555-5555-5555-555555555555', 'CSR Director', true, '1980-08-14', 'Male', '500 Tech Boulevard', 'Chicago', 'IL', '60605', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  -- More individuals
  ('ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Patricia', 'Garcia', 'patricia.garcia@email.com', '555-1011', NULL, NULL, true, '1992-02-28', 'Female', '111 First Avenue', 'Evanston', 'IL', '60201', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Christopher', 'Lee', 'christopher.lee@email.com', '555-1012', NULL, NULL, true, '1987-10-05', 'Male', '222 Second Street', 'Evanston', 'IL', '60202', 'USA', 'phone', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('ccccdddd-dddd-dddd-dddd-dddddddddddd', 'Michelle', 'Wilson', 'michelle.wilson@email.com', '555-1013', NULL, NULL, true, '1993-07-17', 'Female', '333 Third Place', 'Oak Park', 'IL', '60301', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('cccceeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Daniel', 'Harris', 'daniel.harris@email.com', '555-1014', NULL, NULL, true, '1979-04-09', 'Male', '444 Fourth Drive', 'Oak Park', 'IL', '60302', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('ccccffff-ffff-ffff-ffff-ffffffffffff', 'Jessica', 'Clark', 'jessica.clark@email.com', '555-1015', NULL, NULL, true, '1991-11-23', 'Female', '555 Fifth Court', 'Schaumburg', 'IL', '60173', 'USA', 'email', NOW(), '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONATIONS
-- ============================================================================
INSERT INTO donations (id, contact_id, account_id, amount, donation_date, payment_method, campaign_name, notes, is_recurring, created_at)
VALUES
  ('dddd1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', NULL, 500.00, '2025-12-15', 'credit_card', 'Year-End Campaign', 'Annual gift', false, NOW()),
  ('dddd2222-2222-2222-2222-222222222222', 'cccc1111-1111-1111-1111-111111111111', NULL, 100.00, '2025-11-01', 'credit_card', 'Monthly Giving', 'Monthly supporter', true, NOW()),
  ('dddd3333-3333-3333-3333-333333333333', 'cccc2222-2222-2222-2222-222222222222', NULL, 1000.00, '2025-12-20', 'check', 'Year-End Campaign', 'Major gift', false, NOW()),
  ('dddd4444-4444-4444-4444-444444444444', 'cccc3333-3333-3333-3333-333333333333', NULL, 250.00, '2025-10-10', 'credit_card', 'Fall Fundraiser', NULL, false, NOW()),
  ('dddd5555-5555-5555-5555-555555555555', 'cccc4444-4444-4444-4444-444444444444', NULL, 50.00, '2025-12-01', 'credit_card', 'Monthly Giving', NULL, true, NOW()),
  ('dddd6666-6666-6666-6666-666666666666', 'cccc5555-5555-5555-5555-555555555555', NULL, 150.00, '2025-11-15', 'credit_card', 'Giving Tuesday', NULL, false, NOW()),
  ('dddd7777-7777-7777-7777-777777777777', NULL, 'aaaa4444-4444-4444-4444-444444444444', 25000.00, '2025-09-01', 'wire', 'Foundation Grant', 'Annual operating grant', false, NOW()),
  ('dddd8888-8888-8888-8888-888888888888', NULL, 'aaaa5555-5555-5555-5555-555555555555', 10000.00, '2025-11-20', 'check', 'Corporate Matching', 'Employee matching gift', false, NOW()),
  ('dddd9999-9999-9999-9999-999999999999', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 75.00, '2025-12-10', 'credit_card', 'Year-End Campaign', NULL, false, NOW()),
  ('ddddaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 200.00, '2025-12-05', 'credit_card', 'Year-End Campaign', NULL, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VOLUNTEERS
-- ============================================================================
INSERT INTO volunteers (id, contact_id, volunteer_status, skills, availability, background_check_date, background_check_status, emergency_contact_name, emergency_contact_phone, created_at, created_by)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'cccc3333-3333-3333-3333-333333333333', 'active', ARRAY['event_planning', 'fundraising', 'social_media'], 'weekends', '2025-06-15', 'cleared', 'Tom Williams', '555-9001', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('f2222222-2222-2222-2222-222222222222', 'cccc5555-5555-5555-5555-555555555555', 'active', ARRAY['tutoring', 'mentoring'], 'evenings', '2025-07-20', 'cleared', 'Bob Taylor', '555-9002', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('f3333333-3333-3333-3333-333333333333', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active', ARRAY['administrative', 'data_entry'], 'flexible', '2025-08-10', 'cleared', 'Maria Garcia', '555-9003', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('f4444444-4444-4444-4444-444444444444', 'ccccdddd-dddd-dddd-dddd-dddddddddddd', 'inactive', ARRAY['marketing', 'photography'], 'weekdays', '2025-03-01', 'cleared', 'Susan Harris', '555-9004', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('f5555555-5555-5555-5555-555555555555', 'cccceeee-eeee-eeee-eeee-eeeeeeeeeeee', 'pending', ARRAY['construction', 'landscaping'], 'weekends', NULL, 'pending', 'Mike Harris', '555-9005', NOW(), '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENTS
-- ============================================================================
INSERT INTO events (id, name, description, event_type, start_date, end_date, location_name, capacity, status, created_at, created_by)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Annual Gala Dinner', 'Our flagship fundraising event featuring dinner, silent auction, and live entertainment.', 'fundraiser', '2026-03-15 18:00:00', '2026-03-15 23:00:00', 'Grand Ballroom, Hilton Hotel', 300, 'planned', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('e2222222-2222-2222-2222-222222222222', 'Volunteer Appreciation Day', 'Thank you event for all our amazing volunteers.', 'appreciation', '2026-04-20 12:00:00', '2026-04-20 16:00:00', 'Community Center', 100, 'planned', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('e3333333-3333-3333-3333-333333333333', 'Community Cleanup Day', 'Join us for our spring neighborhood cleanup initiative.', 'community', '2026-04-05 09:00:00', '2026-04-05 14:00:00', 'Riverside Park', 50, 'planned', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('e4444444-4444-4444-4444-444444444444', 'Board Meeting Q1', 'Quarterly board of directors meeting.', 'meeting', '2026-02-15 14:00:00', '2026-02-15 17:00:00', 'Main Office, Conference Room A', 15, 'planned', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('e5555555-5555-5555-5555-555555555555', 'Youth Mentorship Workshop', 'Training session for new youth mentors.', 'workshop', '2026-02-28 10:00:00', '2026-02-28 15:00:00', 'Youth Education Center', 25, 'planned', NOW(), '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EVENT REGISTRATIONS
-- ============================================================================
INSERT INTO event_registrations (id, event_id, contact_id, registration_status, created_at, updated_at)
VALUES
  ('e9111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'registered', NOW(), NOW()),
  ('e9222222-2222-2222-2222-222222222222', 'e1111111-1111-1111-1111-111111111111', 'cccc2222-2222-2222-2222-222222222222', 'registered', NOW(), NOW()),
  ('e9333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'cccc9999-9999-9999-9999-999999999999', 'registered', NOW(), NOW()),
  ('e9444444-4444-4444-4444-444444444444', 'e3333333-3333-3333-3333-333333333333', 'cccc3333-3333-3333-3333-333333333333', 'registered', NOW(), NOW()),
  ('e9555555-5555-5555-5555-555555555555', 'e3333333-3333-3333-3333-333333333333', 'cccc5555-5555-5555-5555-555555555555', 'registered', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE TYPES
-- ============================================================================
INSERT INTO case_types (id, name, description, is_active, created_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Food Assistance', 'Emergency food assistance and ongoing food support', true, NOW()),
  ('a2222222-2222-2222-2222-222222222222', 'Housing Support', 'Rental assistance, housing search, and homeless services', true, NOW()),
  ('a3333333-3333-3333-3333-333333333333', 'Youth Services', 'Tutoring, mentoring, and youth development programs', true, NOW()),
  ('a4444444-4444-4444-4444-444444444444', 'Senior Services', 'Elderly assistance, companionship, and care coordination', true, NOW()),
  ('a5555555-5555-5555-5555-555555555555', 'Employment Services', 'Job training, resume help, and career counseling', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASE STATUSES
-- ============================================================================
INSERT INTO case_statuses (id, name, status_type, description, is_active, created_at)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'New', 'new', 'Newly created case awaiting assignment', true, NOW()),
  ('b2222222-2222-2222-2222-222222222222', 'In Progress', 'active', 'Case is being actively worked on', true, NOW()),
  ('b3333333-3333-3333-3333-333333333333', 'Pending', 'active', 'Waiting for client response or external information', true, NOW()),
  ('b4444444-4444-4444-4444-444444444444', 'Resolved', 'closed', 'Case successfully resolved', true, NOW()),
  ('b5555555-5555-5555-5555-555555555555', 'Closed - No Contact', 'closed', 'Client unresponsive, case closed', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CASES
-- ============================================================================
INSERT INTO cases (id, case_number, title, description, contact_id, case_type_id, status_id, priority, assigned_to, is_urgent, due_date, created_at, created_by)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'CASE-2026-001', 'Emergency Food Assistance', 'Family of 4 needs immediate food assistance after job loss', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'high', '22222222-2222-2222-2222-222222222222', true, '2026-02-10', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', 'CASE-2026-002', 'Youth Tutoring Program', 'High school student needs math tutoring support', 'ccccdddd-dddd-dddd-dddd-dddddddddddd', 'a3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 'medium', '33333333-3333-3333-3333-333333333333', false, '2026-03-15', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('c3333333-3333-3333-3333-333333333333', 'CASE-2026-003', 'Senior Companionship', 'Elderly widow seeking regular companionship visits', 'cccceeee-eeee-eeee-eeee-eeeeeeeeeeee', 'a4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', 'low', NULL, false, NULL, NOW(), '11111111-1111-1111-1111-111111111111'),
  ('c4444444-4444-4444-4444-444444444444', 'CASE-2026-004', 'Job Search Assistance', 'Recently laid off worker needs help with job search', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'a5555555-5555-5555-5555-555555555555', 'b3333333-3333-3333-3333-333333333333', 'medium', '22222222-2222-2222-2222-222222222222', false, '2026-02-28', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('c5555555-5555-5555-5555-555555555555', 'CASE-2025-099', 'Rental Assistance - Completed', 'Emergency rental assistance provided successfully', 'ccccffff-ffff-ffff-ffff-ffffffffffff', 'a2222222-2222-2222-2222-222222222222', 'b4444444-4444-4444-4444-444444444444', 'high', '22222222-2222-2222-2222-222222222222', false, '2025-12-31', NOW() - INTERVAL '30 days', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TASKS
-- ============================================================================
INSERT INTO tasks (id, subject, description, status, priority, due_date, assigned_to, created_at, created_by)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Follow up with Emily Johnson', 'Call Emily about increasing monthly donation', 'not_started', 'normal', '2026-02-15', '22222222-2222-2222-2222-222222222222', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('d2222222-2222-2222-2222-222222222222', 'Prepare grant report', 'Q4 report for Smith Foundation grant', 'in_progress', 'high', '2026-02-10', '11111111-1111-1111-1111-111111111111', NOW(), '11111111-1111-1111-1111-111111111111'),
  ('d3333333-3333-3333-3333-333333333333', 'Confirm gala venue', 'Finalize contract with Hilton for annual gala', 'completed', 'high', '2026-01-31', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111'),
  ('d4444444-4444-4444-4444-444444444444', 'Review volunteer applications', 'Process 5 new volunteer applications', 'not_started', 'normal', '2026-02-20', '33333333-3333-3333-3333-333333333333', NOW(), '22222222-2222-2222-2222-222222222222'),
  ('d5555555-5555-5555-5555-555555555555', 'Schedule board meeting', 'Send calendar invites for Q1 board meeting', 'completed', 'low', '2026-02-01', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'Mock data loaded successfully!' AS status;
SELECT 'Login credentials: admin@example.com / password123' AS info;
