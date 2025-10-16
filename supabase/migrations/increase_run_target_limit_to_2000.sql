ALTER TABLE runs
  DROP CONSTRAINT IF EXISTS runs_target_count_check;

ALTER TABLE runs
  ADD CONSTRAINT runs_target_count_check
  CHECK (target_count >= 5 AND target_count <= 2000);
