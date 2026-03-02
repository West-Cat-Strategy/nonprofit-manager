-- Migration 055: Opportunities pipeline domain

CREATE TABLE IF NOT EXISTS opportunity_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    stage_order INTEGER NOT NULL,
    probability SMALLINT CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
    is_closed BOOLEAN NOT NULL DEFAULT false,
    is_won BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_opportunity_stages_org_name UNIQUE (organization_id, name),
    CONSTRAINT uq_opportunity_stages_org_order UNIQUE (organization_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_stages_org ON opportunity_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_stages_active ON opportunity_stages(organization_id, is_active, stage_order);

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stage_id UUID NOT NULL REFERENCES opportunity_stages(id) ON DELETE RESTRICT,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,
    amount DECIMAL(15,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    expected_close_date DATE,
    actual_close_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
    loss_reason TEXT,
    source VARCHAR(100),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(organization_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(organization_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close ON opportunities(organization_id, expected_close_date);

CREATE TABLE IF NOT EXISTS opportunity_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    from_stage_id UUID REFERENCES opportunity_stages(id) ON DELETE SET NULL,
    to_stage_id UUID REFERENCES opportunity_stages(id) ON DELETE SET NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunity_stage_history_opp
    ON opportunity_stage_history(opportunity_id, changed_at DESC);

COMMENT ON TABLE opportunity_stages IS 'Per-organization opportunity pipeline stages';
COMMENT ON TABLE opportunities IS 'Opportunity records managed through stage-based pipeline';
COMMENT ON TABLE opportunity_stage_history IS 'Audit log of opportunity stage transitions';
