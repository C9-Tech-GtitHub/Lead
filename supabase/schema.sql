-- ============================================
-- Lead Research SaaS - Database Schema
-- ============================================
-- This schema supports city-wide business scraping,
-- AI-powered lead research, and real-time updates
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends Supabase Auth users with profile info
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RUNS TABLE
-- ============================================
-- Tracks each lead research run with progress
CREATE TABLE IF NOT EXISTS runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Run configuration
  business_type TEXT NOT NULL,
  location TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count >= 5 AND target_count <= 200),

  -- Progress tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scraping', 'researching', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  -- Results summary
  total_leads INTEGER DEFAULT 0,
  grade_a_count INTEGER DEFAULT 0,
  grade_b_count INTEGER DEFAULT 0,
  grade_c_count INTEGER DEFAULT 0,
  grade_d_count INTEGER DEFAULT 0,
  grade_f_count INTEGER DEFAULT 0,

  -- Metadata
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on runs
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Runs policies
CREATE POLICY "Users can view own runs" ON runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own runs" ON runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs" ON runs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs" ON runs
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

-- ============================================
-- LEADS TABLE
-- ============================================
-- Stores individual business leads with AI research
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Business information
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  google_maps_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Business size indicators
  has_multiple_locations BOOLEAN DEFAULT FALSE,
  team_size TEXT, -- e.g., "small", "medium", "large", or specific number range

  -- AI Research data
  research_status TEXT NOT NULL DEFAULT 'pending' CHECK (research_status IN ('pending', 'scraping', 'analyzing', 'completed', 'failed')),
  about_content TEXT, -- Scraped "About" page content
  team_content TEXT, -- Scraped "Team" page content
  website_content TEXT, -- Main website content

  -- AI Analysis results (following GPT-5 best practices)
  ai_report TEXT, -- Full AI-generated research report
  compatibility_grade TEXT CHECK (compatibility_grade IN ('A', 'B', 'C', 'D', 'F')),
  grade_reasoning TEXT, -- Why this grade was assigned

  -- Outreach suggestions
  suggested_hooks JSONB, -- Array of outreach angles
  pain_points JSONB, -- Identified business pain points
  opportunities JSONB, -- Growth opportunities identified

  -- Metadata
  error_message TEXT,
  researched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON leads
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_run_id ON leads(run_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_research_status ON leads(research_status);
CREATE INDEX IF NOT EXISTS idx_leads_grade ON leads(compatibility_grade);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update run statistics when leads are updated
CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update grade counts
  UPDATE runs SET
    total_leads = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id
    ),
    grade_a_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'A'
    ),
    grade_b_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'B'
    ),
    grade_c_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'C'
    ),
    grade_d_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'D'
    ),
    grade_f_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'F'
    ),
    progress = LEAST(100, ROUND(
      (SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND research_status IN ('completed', 'failed'))::NUMERIC /
      (SELECT target_count FROM runs WHERE id = NEW.run_id)::NUMERIC * 100
    ))
  WHERE id = NEW.run_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_run_stats_on_lead_change
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_run_stats();

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
-- Enable realtime for runs and leads tables
ALTER PUBLICATION supabase_realtime ADD TABLE runs;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ============================================
-- INITIAL DATA / SEED (Optional)
-- ============================================
-- No seed data needed for now

-- ============================================
-- NOTES FOR DEPLOYMENT
-- ============================================
-- 1. Run this schema in your Supabase SQL Editor
-- 2. Ensure RLS policies are enabled (they are by default)
-- 3. Configure Realtime to listen to runs and leads tables
-- 4. Set up proper indexes for performance (done above)
-- 5. Consider adding rate limiting at application level
