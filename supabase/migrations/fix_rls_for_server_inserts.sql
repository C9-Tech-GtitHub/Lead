-- ============================================
-- FIX RLS POLICIES FOR SERVER-SIDE OPERATIONS
-- ============================================
-- This migration allows server-side operations (like Inngest functions)
-- to insert/update data even when there's no authenticated user context

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can insert own leads" ON leads;
DROP POLICY IF EXISTS "Users can update own leads" ON leads;
DROP POLICY IF EXISTS "Users can view own leads" ON leads;
DROP POLICY IF EXISTS "Users can insert own runs" ON runs;
DROP POLICY IF EXISTS "Users can update own runs" ON runs;
DROP POLICY IF EXISTS "Users can view own runs" ON runs;

-- Leads table: Allow service role to bypass RLS
-- Users can view their own leads
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

-- Allow inserts with matching user_id OR service role
CREATE POLICY "Service can insert leads" ON leads
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Allow updates with matching user_id OR service role
CREATE POLICY "Service can update leads" ON leads
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Runs table: Allow service role to bypass RLS
-- Users can view their own runs
CREATE POLICY "Users can view own runs" ON runs
  FOR SELECT USING (auth.uid() = user_id);

-- Allow inserts with matching user_id OR service role
CREATE POLICY "Service can insert runs" ON runs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Allow updates with matching user_id OR service role
CREATE POLICY "Service can update runs" ON runs
  FOR UPDATE USING (
    auth.uid() = user_id OR
    auth.jwt() ->> 'role' = 'service_role'
  );
