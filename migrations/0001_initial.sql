CREATE TABLE IF NOT EXISTS pps_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  app_version TEXT NOT NULL,
  consented_research INTEGER NOT NULL CHECK (consented_research = 1),
  answers_json TEXT NOT NULL,
  permissive_mean REAL NOT NULL,
  authoritative_mean REAL NOT NULL,
  authoritarian_mean REAL NOT NULL,
  final_style TEXT NOT NULL CHECK (
    final_style IN ('Authoritarian', 'Authoritative', 'Permissive')
  ),
  z_scores_json TEXT NOT NULL,
  percentiles_json TEXT NOT NULL,
  effective_distances_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pps_sessions_created_at
  ON pps_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_pps_sessions_final_style
  ON pps_sessions(final_style);
