ALTER TABLE pps_sessions ADD COLUMN participant_code TEXT;
ALTER TABLE class_feedback ADD COLUMN participant_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pps_sessions_participant_code
  ON pps_sessions(participant_code)
  WHERE participant_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pps_feedback_participant_code
  ON class_feedback(participant_code)
  WHERE participant_code IS NOT NULL;
