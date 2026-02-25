CREATE TABLE IF NOT EXISTS tests (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(8) NOT NULL,
  work_number VARCHAR(6) NOT NULL,
  model VARCHAR(10) NOT NULL,
  bench INTEGER NOT NULL CHECK (bench >= 1 AND bench <= 8),
  expected_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS stops (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  stop_type VARCHAR(100) NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_test_id ON stops(test_id);
CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at);
CREATE INDEX IF NOT EXISTS idx_tests_model ON tests(model);
