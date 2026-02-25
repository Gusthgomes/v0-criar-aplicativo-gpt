ALTER TABLE stops ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tests_work_number ON tests(work_number);
CREATE INDEX IF NOT EXISTS idx_tests_bench ON tests(bench);
CREATE INDEX IF NOT EXISTS idx_tests_employee_id ON tests(employee_id);
