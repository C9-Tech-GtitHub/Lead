-- ============================================
-- PROGRESS LOGS TABLE
-- ============================================
-- Tracks detailed progress events for runs

CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Log entry details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'run_started',
    'scraping_started',
    'scraping_completed',
    'lead_created',
    'lead_research_started',
    'lead_research_completed',
    'lead_failed',
    'run_completed',
    'run_failed',
    'status_update'
  )),
  message TEXT NOT NULL,
  details JSONB, -- Additional context/metadata

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on progress_logs
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Progress logs policies
CREATE POLICY "Users can view own progress logs" ON progress_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress logs" ON progress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_logs_run_id ON progress_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_created_at ON progress_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_logs_event_type ON progress_logs(event_type);

-- Enable realtime for progress_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE progress_logs;
