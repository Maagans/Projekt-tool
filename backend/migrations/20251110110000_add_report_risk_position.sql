ALTER TABLE report_risks ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_report_risks_position ON report_risks (report_id, position);

