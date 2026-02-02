-- Analytics Performance Optimization Indexes
-- Indexes to improve analytics query performance

-- Donations table indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_donations_date_range ON donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_donor_date ON donations(donor_id, donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_amount ON donations(amount);
CREATE INDEX IF NOT EXISTS idx_donations_method ON donations(payment_method);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);

-- Composite index for date range queries with aggregations
CREATE INDEX IF NOT EXISTS idx_donations_date_amount ON donations(donation_date, amount);

-- Volunteers table indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_created_at ON volunteers(created_at);

-- Volunteer hours table indexes
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date ON volunteer_hours(log_date);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_volunteer_date ON volunteer_hours(volunteer_id, log_date);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_hours ON volunteer_hours(hours);

-- Composite index for volunteer hours aggregations
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_date_hours ON volunteer_hours(log_date, hours);

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Event registrations table indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_registered_at ON event_registrations(registered_at);

-- Composite index for event attendance queries
CREATE INDEX IF NOT EXISTS idx_event_reg_event_status ON event_registrations(event_id, status);

-- Cases table indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);

-- Composite index for case analytics
CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON cases(status, priority);
CREATE INDEX IF NOT EXISTS idx_cases_created_status ON cases(created_at, status);

-- Donors table indexes
CREATE INDEX IF NOT EXISTS idx_donors_type ON donors(donor_type);
CREATE INDEX IF NOT EXISTS idx_donors_created_at ON donors(created_at);

-- Alert instances for stats queries
CREATE INDEX IF NOT EXISTS idx_alert_instances_config_triggered ON alert_instances(alert_config_id, triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_instances_triggered_at ON alert_instances(triggered_at);

-- Dashboard configs for user queries
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_default ON dashboard_configs(user_id, is_default);

-- Comments about index choices
COMMENT ON INDEX idx_donations_date_range IS 'Speeds up date range queries for donation analytics';
COMMENT ON INDEX idx_donations_date_amount IS 'Optimizes revenue aggregation queries';
COMMENT ON INDEX idx_volunteer_hours_date_hours IS 'Improves volunteer hours trend analysis';
COMMENT ON INDEX idx_event_reg_event_status IS 'Accelerates event attendance calculations';
COMMENT ON INDEX idx_cases_status_priority IS 'Enhances case management analytics';
