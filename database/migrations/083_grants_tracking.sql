-- Migration 083: Grants tracking domain

CREATE TABLE IF NOT EXISTS grant_funders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(20) NOT NULL DEFAULT 'federal' CHECK (
        jurisdiction IN ('federal', 'provincial', 'territorial', 'municipal', 'private', 'foundation', 'other')
    ),
    funder_type VARCHAR(80),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grant_funders_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_grant_funders_org ON grant_funders(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_funders_org_active ON grant_funders(organization_id, active);

CREATE TRIGGER update_grant_funders_updated_at
    BEFORE UPDATE ON grant_funders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grant_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    funder_id UUID NOT NULL REFERENCES grant_funders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    program_code VARCHAR(120),
    fiscal_year VARCHAR(20),
    jurisdiction VARCHAR(20) NOT NULL DEFAULT 'federal' CHECK (
        jurisdiction IN ('federal', 'provincial', 'territorial', 'municipal', 'private', 'foundation', 'other')
    ),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'archived')),
    application_open_at DATE,
    application_due_at DATE,
    award_date DATE,
    expiry_date DATE,
    total_budget DECIMAL(15,2),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grant_programs_org_name UNIQUE (organization_id, funder_id, name)
);

CREATE INDEX IF NOT EXISTS idx_grant_programs_org ON grant_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_programs_funder ON grant_programs(organization_id, funder_id);
CREATE INDEX IF NOT EXISTS idx_grant_programs_status ON grant_programs(organization_id, status);

CREATE TRIGGER update_grant_programs_updated_at
    BEFORE UPDATE ON grant_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS recipient_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    jurisdiction VARCHAR(20) CHECK (
        jurisdiction IS NULL OR jurisdiction IN ('federal', 'provincial', 'territorial', 'municipal', 'private', 'foundation', 'other')
    ),
    province VARCHAR(10),
    city VARCHAR(120),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recipient_organizations_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_recipient_organizations_org ON recipient_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipient_organizations_org_active ON recipient_organizations(organization_id, active);

CREATE TRIGGER update_recipient_organizations_updated_at
    BEFORE UPDATE ON recipient_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS funded_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    recipient_organization_id UUID NOT NULL REFERENCES recipient_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'complete', 'archived')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_funded_programs_org_name UNIQUE (organization_id, recipient_organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_funded_programs_org ON funded_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_funded_programs_recipient ON funded_programs(organization_id, recipient_organization_id);
CREATE INDEX IF NOT EXISTS idx_funded_programs_status ON funded_programs(organization_id, status);

CREATE TRIGGER update_funded_programs_updated_at
    BEFORE UPDATE ON funded_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grant_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    application_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    funder_id UUID NOT NULL REFERENCES grant_funders(id) ON DELETE RESTRICT,
    program_id UUID REFERENCES grant_programs(id) ON DELETE SET NULL,
    recipient_organization_id UUID REFERENCES recipient_organizations(id) ON DELETE SET NULL,
    funded_program_id UUID REFERENCES funded_programs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'submitted', 'under_review', 'approved', 'declined', 'withdrawn')
    ),
    requested_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    approved_amount DECIMAL(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    decision_at TIMESTAMP WITH TIME ZONE,
    due_at DATE,
    outcome_reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grant_applications_org_number UNIQUE (organization_id, application_number)
);

CREATE INDEX IF NOT EXISTS idx_grant_applications_org ON grant_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_applications_funder ON grant_applications(organization_id, funder_id);
CREATE INDEX IF NOT EXISTS idx_grant_applications_program ON grant_applications(organization_id, program_id);
CREATE INDEX IF NOT EXISTS idx_grant_applications_status ON grant_applications(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_grant_applications_due_at ON grant_applications(organization_id, due_at);

CREATE TRIGGER update_grant_applications_updated_at
    BEFORE UPDATE ON grant_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    grant_number VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    application_id UUID UNIQUE REFERENCES grant_applications(id) ON DELETE SET NULL,
    funder_id UUID NOT NULL REFERENCES grant_funders(id) ON DELETE RESTRICT,
    program_id UUID REFERENCES grant_programs(id) ON DELETE SET NULL,
    recipient_organization_id UUID REFERENCES recipient_organizations(id) ON DELETE SET NULL,
    funded_program_id UUID REFERENCES funded_programs(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'on_hold', 'completed', 'closed', 'expired')
    ),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    committed_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    disbursed_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
    fiscal_year VARCHAR(20),
    jurisdiction VARCHAR(20) NOT NULL DEFAULT 'federal' CHECK (
        jurisdiction IN ('federal', 'provincial', 'territorial', 'municipal', 'private', 'foundation', 'other')
    ),
    award_date DATE,
    start_date DATE,
    end_date DATE,
    expiry_date DATE,
    reporting_frequency VARCHAR(20) CHECK (
        reporting_frequency IS NULL OR reporting_frequency IN ('monthly', 'quarterly', 'semiannual', 'annual', 'ad_hoc')
    ),
    next_report_due_at DATE,
    closeout_due_at DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grants_org_number UNIQUE (organization_id, grant_number)
);

CREATE INDEX IF NOT EXISTS idx_grants_org ON grants(organization_id);
CREATE INDEX IF NOT EXISTS idx_grants_funder ON grants(organization_id, funder_id);
CREATE INDEX IF NOT EXISTS idx_grants_program ON grants(organization_id, program_id);
CREATE INDEX IF NOT EXISTS idx_grants_recipient ON grants(organization_id, recipient_organization_id);
CREATE INDEX IF NOT EXISTS idx_grants_funded_program ON grants(organization_id, funded_program_id);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_grants_next_report_due ON grants(organization_id, next_report_due_at);

CREATE TRIGGER update_grants_updated_at
    BEFORE UPDATE ON grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE grant_applications
    ADD COLUMN IF NOT EXISTS grant_id UUID;

ALTER TABLE grant_applications
    ADD CONSTRAINT uq_grant_applications_grant UNIQUE (grant_id);

ALTER TABLE grant_applications
    ADD CONSTRAINT fk_grant_applications_grant
    FOREIGN KEY (grant_id) REFERENCES grants(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS grant_disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    tranche_label VARCHAR(120),
    scheduled_date DATE,
    paid_at DATE,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'pending', 'paid', 'failed', 'cancelled')
    ),
    method VARCHAR(80),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grant_disbursements_org ON grant_disbursements(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_disbursements_grant ON grant_disbursements(organization_id, grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_disbursements_status ON grant_disbursements(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_grant_disbursements_scheduled ON grant_disbursements(organization_id, scheduled_date);

CREATE TRIGGER update_grant_disbursements_updated_at
    BEFORE UPDATE ON grant_disbursements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grant_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL DEFAULT 'progress',
    period_start DATE,
    period_end DATE,
    due_at DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'due' CHECK (
        status IN ('draft', 'due', 'submitted', 'reviewed', 'overdue', 'accepted', 'rejected')
    ),
    summary TEXT,
    outstanding_items TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grant_reports_org ON grant_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_reports_grant ON grant_reports(organization_id, grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_reports_status ON grant_reports(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_grant_reports_due ON grant_reports(organization_id, due_at);

CREATE TRIGGER update_grant_reports_updated_at
    BEFORE UPDATE ON grant_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grant_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    application_id UUID REFERENCES grant_applications(id) ON DELETE CASCADE,
    report_id UUID REFERENCES grant_reports(id) ON DELETE CASCADE,
    document_type VARCHAR(80) NOT NULL DEFAULT 'supporting',
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grant_documents_org ON grant_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_documents_grant ON grant_documents(organization_id, grant_id);
CREATE INDEX IF NOT EXISTS idx_grant_documents_application ON grant_documents(organization_id, application_id);
CREATE INDEX IF NOT EXISTS idx_grant_documents_report ON grant_documents(organization_id, report_id);

CREATE TRIGGER update_grant_documents_updated_at
    BEFORE UPDATE ON grant_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS grant_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE CASCADE,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    action VARCHAR(120) NOT NULL,
    notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grant_activity_logs_org ON grant_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_grant_activity_logs_grant ON grant_activity_logs(organization_id, grant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_grant_activity_logs_entity ON grant_activity_logs(organization_id, entity_type, entity_id);

COMMENT ON TABLE grant_funders IS 'Federal, provincial, and other funders tracked by workspace';
COMMENT ON TABLE grant_programs IS 'External funder programs and funding streams';
COMMENT ON TABLE recipient_organizations IS 'External recipient organizations receiving grant funding';
COMMENT ON TABLE funded_programs IS 'Internal programs or initiatives funded by a grant';
COMMENT ON TABLE grant_applications IS 'Grant applications tracked through intake and review';
COMMENT ON TABLE grants IS 'Awarded grant records used for portfolio tracking and reporting';
COMMENT ON TABLE grant_disbursements IS 'Grant payment schedule and disbursement history';
COMMENT ON TABLE grant_reports IS 'Grant reporting obligations and submissions';
COMMENT ON TABLE grant_documents IS 'Documents attached to grants, applications, and reports';
COMMENT ON TABLE grant_activity_logs IS 'Audit-style activity feed for grant lifecycle events';
