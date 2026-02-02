-- Migration: Case Management System
-- Created: 2026-02-02
-- Description: Add comprehensive case management with intake, workflows, and multiple cases per client

-- ============================================================================
-- CASE_TYPES TABLE - Define types of cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20), -- For UI display (e.g., 'blue', 'green', 'red')
    icon VARCHAR(50), -- Icon name for UI
    is_active BOOLEAN DEFAULT true,
    requires_intake BOOLEAN DEFAULT true, -- Whether this case type requires intake form
    average_duration_days INTEGER, -- Expected case duration

    -- Custom fields configuration (JSON)
    custom_fields JSONB, -- Store custom field definitions

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

-- Index for active case types
CREATE INDEX idx_case_types_active ON case_types(is_active);

-- ============================================================================
-- CASE_STATUSES TABLE - Define status/phase options
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    status_type VARCHAR(50) NOT NULL, -- 'intake', 'active', 'review', 'closed', 'cancelled'
    description TEXT,
    color VARCHAR(20), -- For UI display
    sort_order INTEGER DEFAULT 0, -- For ordering statuses
    is_active BOOLEAN DEFAULT true,

    -- Workflow rules
    can_transition_to UUID[], -- Array of status IDs this can transition to
    requires_reason BOOLEAN DEFAULT false, -- Whether status change requires a reason

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for status type and ordering
CREATE INDEX idx_case_statuses_type ON case_statuses(status_type);
CREATE INDEX idx_case_statuses_sort ON case_statuses(sort_order);

-- ============================================================================
-- CASES TABLE - Main case records
-- ============================================================================

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated (CASE-YYMMDD-XXXXX)

    -- Client/Contact relationship
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

    -- Case details
    case_type_id UUID NOT NULL REFERENCES case_types(id),
    status_id UUID NOT NULL REFERENCES case_statuses(id),
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

    -- Case information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(100), -- 'phone', 'email', 'walk-in', 'referral', 'web', 'other'
    referral_source VARCHAR(255), -- Who/where referred from

    -- Dates
    intake_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    opened_date TIMESTAMP WITH TIME ZONE,
    closed_date TIMESTAMP WITH TIME ZONE,
    due_date DATE,

    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_team VARCHAR(100), -- Team or department name

    -- Outcome tracking
    outcome VARCHAR(50), -- 'successful', 'unsuccessful', 'referred', 'withdrawn', 'other'
    outcome_notes TEXT,
    closure_reason VARCHAR(255),

    -- Custom fields (flexible JSON storage)
    intake_data JSONB, -- Intake form responses
    custom_data JSONB, -- Additional custom fields

    -- Flags
    is_urgent BOOLEAN DEFAULT false,
    requires_followup BOOLEAN DEFAULT false,
    followup_date DATE,

    -- Tags for categorization
    tags TEXT[], -- Array of tag strings

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

-- Indexes for cases
CREATE INDEX idx_cases_contact ON cases(contact_id);
CREATE INDEX idx_cases_account ON cases(account_id);
CREATE INDEX idx_cases_case_type ON cases(case_type_id);
CREATE INDEX idx_cases_status ON cases(status_id);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_intake_date ON cases(intake_date);
CREATE INDEX idx_cases_opened_date ON cases(opened_date);
CREATE INDEX idx_cases_closed_date ON cases(closed_date);
CREATE INDEX idx_cases_due_date ON cases(due_date);
CREATE INDEX idx_cases_tags ON cases USING GIN (tags);

-- ============================================================================
-- CASE_NOTES TABLE - Timeline/activity tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Note details
    note_type VARCHAR(50) NOT NULL, -- 'note', 'email', 'call', 'meeting', 'update', 'status_change'
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- Metadata
    is_internal BOOLEAN DEFAULT false, -- Internal note vs client-facing
    is_important BOOLEAN DEFAULT false,

    -- For status changes
    previous_status_id UUID REFERENCES case_statuses(id),
    new_status_id UUID REFERENCES case_statuses(id),

    -- Attachments (file references)
    attachments JSONB, -- Array of file metadata {name, url, size, type}

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for case notes
CREATE INDEX idx_case_notes_case ON case_notes(case_id);
CREATE INDEX idx_case_notes_type ON case_notes(note_type);
CREATE INDEX idx_case_notes_created ON case_notes(created_at);

-- ============================================================================
-- CASE_ASSIGNMENTS TABLE - Track assignment history
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    assigned_from UUID REFERENCES users(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    assignment_reason TEXT,

    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),

    unassigned_at TIMESTAMP WITH TIME ZONE,
    unassigned_by UUID REFERENCES users(id)
);

-- Indexes for assignments
CREATE INDEX idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_assigned_to ON case_assignments(assigned_to);
CREATE INDEX idx_case_assignments_date ON case_assignments(assigned_at);

-- ============================================================================
-- CASE_DOCUMENTS TABLE - Document management
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Document details
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100), -- 'intake', 'assessment', 'consent', 'report', 'correspondence', 'other'
    description TEXT,

    -- File information
    file_path VARCHAR(500), -- File storage path
    file_size BIGINT, -- File size in bytes
    mime_type VARCHAR(100),

    -- Security
    is_confidential BOOLEAN DEFAULT false,
    access_level VARCHAR(50) DEFAULT 'standard', -- 'public', 'standard', 'restricted', 'confidential'

    -- Versioning
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES case_documents(id),

    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES users(id)
);

-- Indexes for documents
CREATE INDEX idx_case_documents_case ON case_documents(case_id);
CREATE INDEX idx_case_documents_type ON case_documents(document_type);

-- ============================================================================
-- CASE_RELATIONSHIPS TABLE - Link related cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    related_case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    relationship_type VARCHAR(50) NOT NULL, -- 'duplicate', 'related', 'parent', 'child', 'blocked_by', 'blocks'
    description TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),

    CONSTRAINT case_relationship_unique UNIQUE(case_id, related_case_id, relationship_type),
    CONSTRAINT case_not_self_related CHECK (case_id != related_case_id)
);

-- Indexes for relationships
CREATE INDEX idx_case_relationships_case ON case_relationships(case_id);
CREATE INDEX idx_case_relationships_related ON case_relationships(related_case_id);

-- ============================================================================
-- CASE_SERVICES TABLE - Track services provided
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    -- Service details
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(100), -- 'counseling', 'legal', 'financial', 'housing', 'healthcare', 'education', 'employment', 'other'
    service_provider VARCHAR(255), -- Internal staff or external organization

    -- Dates
    service_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,

    -- Status and outcome
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
    outcome TEXT,

    -- Cost tracking
    cost DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for services
CREATE INDEX idx_case_services_case ON case_services(case_id);
CREATE INDEX idx_case_services_date ON case_services(service_date);
CREATE INDEX idx_case_services_type ON case_services(service_type);
CREATE INDEX idx_case_services_status ON case_services(status);

-- ============================================================================
-- CASE_MILESTONES TABLE - Track case progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,

    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,

    due_date DATE,
    completed_date DATE,
    is_completed BOOLEAN DEFAULT false,

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Indexes for milestones
CREATE INDEX idx_case_milestones_case ON case_milestones(case_id);
CREATE INDEX idx_case_milestones_due ON case_milestones(due_date);
CREATE INDEX idx_case_milestones_completed ON case_milestones(is_completed);

-- ============================================================================
-- SEED DATA - Default case types and statuses
-- ============================================================================

-- Insert default case types
INSERT INTO case_types (name, description, color, icon, requires_intake) VALUES
('General Support', 'General client support and assistance', 'blue', 'support', true),
('Crisis Intervention', 'Immediate crisis response and intervention', 'red', 'alert', true),
('Counseling', 'Mental health and counseling services', 'purple', 'psychology', true),
('Legal Assistance', 'Legal aid and advocacy services', 'green', 'gavel', true),
('Housing', 'Housing assistance and placement', 'orange', 'home', true),
('Employment', 'Job placement and career services', 'teal', 'work', true),
('Healthcare', 'Medical and healthcare referrals', 'pink', 'medical', true),
('Financial Assistance', 'Financial aid and budgeting support', 'yellow', 'attach_money', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default case statuses
INSERT INTO case_statuses (name, status_type, description, color, sort_order) VALUES
('Intake', 'intake', 'Initial intake and assessment', 'gray', 1),
('Under Review', 'active', 'Case under review by staff', 'blue', 2),
('Active', 'active', 'Actively working on case', 'green', 3),
('Pending Client', 'active', 'Waiting for client response', 'yellow', 4),
('Pending External', 'active', 'Waiting for external response', 'orange', 5),
('In Progress', 'active', 'Services being provided', 'cyan', 6),
('On Hold', 'review', 'Case temporarily on hold', 'purple', 7),
('Ready for Closure', 'review', 'Case ready to be closed', 'lime', 8),
('Closed - Successful', 'closed', 'Case closed successfully', 'darkgreen', 9),
('Closed - Unsuccessful', 'closed', 'Case closed without success', 'red', 10),
('Closed - Referred', 'closed', 'Client referred to another service', 'blue', 11),
('Cancelled', 'cancelled', 'Case cancelled by client or staff', 'gray', 12);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cases IS 'Main case management table - stores all case records with multiple cases per client support';
COMMENT ON TABLE case_types IS 'Configurable case types/categories';
COMMENT ON TABLE case_statuses IS 'Case workflow statuses and phases';
COMMENT ON TABLE case_notes IS 'Case activity timeline and notes';
COMMENT ON TABLE case_assignments IS 'Case assignment history and tracking';
COMMENT ON TABLE case_documents IS 'Document management for cases';
COMMENT ON TABLE case_relationships IS 'Links between related cases';
COMMENT ON TABLE case_services IS 'Services provided as part of case management';
COMMENT ON TABLE case_milestones IS 'Case progress milestones and goals';

COMMENT ON COLUMN cases.case_number IS 'Unique case identifier (CASE-YYMMDD-XXXXX)';
COMMENT ON COLUMN cases.intake_data IS 'JSON storage for intake form responses';
COMMENT ON COLUMN cases.custom_data IS 'JSON storage for custom fields';
COMMENT ON COLUMN cases.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN case_notes.is_internal IS 'Internal notes not visible to clients';
COMMENT ON COLUMN case_documents.access_level IS 'Document security access level';
