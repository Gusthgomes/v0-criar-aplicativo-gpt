-- Add pause/resume capability to tests
ALTER TABLE tests ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS elapsed_seconds_at_pause INTEGER DEFAULT 0;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;

-- Set all existing finished tests as complete
UPDATE tests SET is_complete = TRUE WHERE finished_at IS NOT NULL;

-- Index for finding incomplete tests by work_number
CREATE INDEX IF NOT EXISTS idx_tests_work_incomplete
  ON tests(work_number) WHERE finished_at IS NOT NULL AND is_complete = FALSE;
