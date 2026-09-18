ALTER TABLE pps_sessions ADD COLUMN cohort_key TEXT;

CREATE INDEX IF NOT EXISTS idx_pps_sessions_cohort_key
  ON pps_sessions(cohort_key);

CREATE TABLE IF NOT EXISTS class_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feedback_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cohort_key TEXT NOT NULL,
  enjoyment INTEGER NOT NULL CHECK (enjoyment BETWEEN 1 AND 5),
  clarity INTEGER NOT NULL CHECK (clarity BETWEEN 1 AND 5),
  result_usefulness INTEGER NOT NULL CHECK (result_usefulness BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_pps_feedback_cohort_key
  ON class_feedback(cohort_key);
