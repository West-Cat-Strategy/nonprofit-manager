-- Meeting Manager
-- Adds committees, meetings, agenda items, motions, and meeting action items.

CREATE TABLE IF NOT EXISTS committees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS committee_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role_label VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    UNIQUE (committee_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_contact ON committee_members(contact_id);

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
    meeting_type VARCHAR(50) NOT NULL DEFAULT 'committee', -- board, agm, committee
    title VARCHAR(255) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, scheduled, in_progress, completed, cancelled
    presiding_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    secretary_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    minutes_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT meetings_type_check CHECK (meeting_type IN ('board', 'agm', 'committee')),
    CONSTRAINT meetings_status_check CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_meetings_committee ON meetings(committee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_starts_at ON meetings(starts_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

CREATE TABLE IF NOT EXISTS meeting_agenda_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL DEFAULT 'discussion', -- discussion, motion, report, other
    duration_minutes INTEGER,
    presenter_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, discussed, deferred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT agenda_item_type_check CHECK (item_type IN ('discussion', 'motion', 'report', 'other')),
    CONSTRAINT agenda_item_status_check CHECK (status IN ('planned', 'discussed', 'deferred'))
);

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting ON meeting_agenda_items(meeting_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting_position ON meeting_agenda_items(meeting_id, position);

CREATE TABLE IF NOT EXISTS meeting_motions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_item_id UUID REFERENCES meeting_agenda_items(id) ON DELETE SET NULL,
    parent_motion_id UUID REFERENCES meeting_motions(id) ON DELETE SET NULL, -- amendment chain
    text TEXT NOT NULL,
    moved_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    seconded_by_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, passed, failed, amended, withdrawn
    votes_for INTEGER,
    votes_against INTEGER,
    votes_abstain INTEGER,
    result_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT meeting_motion_status_check CHECK (status IN ('pending', 'passed', 'failed', 'amended', 'withdrawn'))
);

CREATE INDEX IF NOT EXISTS idx_meeting_motions_meeting ON meeting_motions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_motions_agenda ON meeting_motions(agenda_item_id);

CREATE TABLE IF NOT EXISTS meeting_action_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    motion_id UUID REFERENCES meeting_motions(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    CONSTRAINT meeting_action_item_status_check CHECK (status IN ('open', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_meeting_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_action_items_assigned_contact ON meeting_action_items(assigned_contact_id);

-- Seed default committees
INSERT INTO committees (name, description, is_system)
VALUES
  ('Staff', 'Default staff committee', true),
  ('Board of Directors', 'Default board committee', true)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE committees IS 'Groups of contacts used for meetings and approvals';
COMMENT ON TABLE meetings IS 'Meetings for committees/boards with agendas, motions, and minutes';
COMMENT ON TABLE meeting_agenda_items IS 'Agenda items in order for a meeting';
COMMENT ON TABLE meeting_motions IS 'Motions attached to a meeting (and optionally an agenda item)';
COMMENT ON TABLE meeting_action_items IS 'Action items arising from meetings, assignable to contacts';
