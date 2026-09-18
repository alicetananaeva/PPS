CREATE TABLE IF NOT EXISTS completion_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  completion_code TEXT NOT NULL UNIQUE,
  class_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_completion_codes_created_at
  ON completion_codes(created_at);

CREATE INDEX IF NOT EXISTS idx_completion_codes_class_key
  ON completion_codes(class_key);
