-- Migration: Allow all authenticated users to access all runs and leads
-- This enables team collaboration by removing user-specific restrictions

-- Drop existing restrictive policies for RUNS
DROP POLICY IF EXISTS "Users can view own runs" ON runs;
DROP POLICY IF EXISTS "Users can create own runs" ON runs;
DROP POLICY IF EXISTS "Users can update own runs" ON runs;
DROP POLICY IF EXISTS "Users can delete own runs" ON runs;

-- Create new permissive policies for RUNS (all authenticated users)
CREATE POLICY "Authenticated users can view all runs" ON runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create runs" ON runs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all runs" ON runs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all runs" ON runs
  FOR DELETE
  TO authenticated
  USING (true);

-- Drop existing restrictive policies for LEADS
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can create own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON leads;

-- Create new permissive policies for LEADS (all authenticated users)
CREATE POLICY "Authenticated users can view all leads" ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create leads" ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all leads" ON leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all leads" ON leads
  FOR DELETE
  TO authenticated
  USING (true);

-- Also update progress_logs if needed (for team visibility)
DROP POLICY IF EXISTS "Users can view own progress" ON progress_logs;
DROP POLICY IF EXISTS "Users can create progress" ON progress_logs;

CREATE POLICY "Authenticated users can view all progress" ON progress_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create progress" ON progress_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
