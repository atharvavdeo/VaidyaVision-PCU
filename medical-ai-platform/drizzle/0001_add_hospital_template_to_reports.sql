-- PR1: Add hospital template, release, and delivery columns to reports
-- Additive only: ALTER TABLE ADD COLUMN. No drops, renames, or rebuilds.

ALTER TABLE reports ADD COLUMN hospital_template_id integer REFERENCES hospital_report_templates(id);
ALTER TABLE reports ADD COLUMN released_at integer;
ALTER TABLE reports ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending';

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_reports_hospital_template ON reports(hospital_template_id);
CREATE INDEX IF NOT EXISTS idx_reports_delivery_status ON reports(delivery_status);
