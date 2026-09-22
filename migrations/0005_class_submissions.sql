CREATE TABLE IF NOT EXISTS class_submissions (
  submission_id TEXT PRIMARY KEY,
  cohort_key TEXT NOT NULL,
  student_name TEXT NOT NULL,
  dog_name TEXT,
  answers_json TEXT NOT NULL,
  final_style TEXT NOT NULL,
  permissive_mean REAL NOT NULL,
  authoritative_mean REAL NOT NULL,
  authoritarian_mean REAL NOT NULL,
  overall_experience INTEGER NOT NULL,
  clarity INTEGER NOT NULL,
  result_usefulness INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_pps_class_submissions_cohort ON class_submissions(cohort_key, created_at);
