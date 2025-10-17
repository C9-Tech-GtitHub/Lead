# Lead Research Enhancement Migration Guide

## Overview
This migration adds two powerful features to your lead research application:
1. **Hunter.io Email Discovery**: Find and save business emails for each lead
2. **LinkedIn Company Research**: Scrape company structure and team members from LinkedIn

## What's New

### Email Discovery Features
- **lead_emails table**: Stores emails with contact details, verification status, and metadata
- **Lead card badges**: Shows email count on each lead card  
- **Email persistence**: Automatically saves emails when searched
- **Email display**: Shows saved emails in lead detail modal and email finder modal

### LinkedIn Research Features
- **lead_linkedin_people table**: Stores team members and their roles from LinkedIn
- **LinkedIn company data**: Company profile, industry, size, headquarters, etc.
- **Team structure display**: Organized by executives, management, and staff
- **LinkedIn button**: Blue button on lead cards to research company structure
- **Integrated display**: Team members appear in lead detail modal

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase/migrations/add_lead_emails.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" - this is expected!

### Option 2: Run Both Migrations

You need to run TWO migration files:
1. `supabase/migrations/add_lead_emails.sql` - For email features
2. `supabase/migrations/add_linkedin_company_data.sql` - For LinkedIn features

Run them in order, one after the other.

### Option 3: Quick Copy-Paste (All-in-One)

Copy this complete SQL and run it in your Supabase SQL Editor:

\`\`\`sql
-- Create lead_emails table
CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  email TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'generic')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  department TEXT,
  seniority TEXT,
  
  verification_status TEXT CHECK (verification_status IN ('valid', 'accept_all', 'unknown')),
  verification_date TIMESTAMPTZ,
  
  sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lead_id, email)
);

-- Enable RLS
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own lead emails" ON lead_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lead emails" ON lead_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead emails" ON lead_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead emails" ON lead_emails
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_user_id ON lead_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_type ON lead_emails(type);
CREATE INDEX IF NOT EXISTS idx_lead_emails_created_at ON lead_emails(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_lead_emails_updated_at BEFORE UPDATE ON lead_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE lead_emails;

-- Add columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_io_searched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_organization TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_email_pattern TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hunter_total_emails INTEGER;

-- ============================================
-- LINKEDIN COMPANY DATA TABLES
-- ============================================

-- Add LinkedIn company data columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_scraped_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_company_data JSONB;

-- Store key people/employees from LinkedIn
CREATE TABLE IF NOT EXISTS lead_linkedin_people (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  linkedin_profile_id TEXT,
  linkedin_profile_url TEXT,
  full_name TEXT NOT NULL,
  headline TEXT,
  position TEXT,
  profile_image_url TEXT,
  email TEXT,
  profile_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lead_id, linkedin_profile_id)
);

-- Enable RLS
ALTER TABLE lead_linkedin_people ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own linkedin people" ON lead_linkedin_people
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own linkedin people" ON lead_linkedin_people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linkedin people" ON lead_linkedin_people
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linkedin people" ON lead_linkedin_people
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_lead_id ON lead_linkedin_people(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_user_id ON lead_linkedin_people(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_linkedin_people_created_at ON lead_linkedin_people(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_linkedin_company_id ON leads(linkedin_company_id);

-- Trigger
CREATE TRIGGER update_lead_linkedin_people_updated_at BEFORE UPDATE ON lead_linkedin_people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE lead_linkedin_people;
\`\`\`

## Verify Migration Success

After running the migration, verify it worked:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see TWO new tables:
   - **lead_emails** (for Hunter.io emails)
   - **lead_linkedin_people** (for LinkedIn team members)
3. Click on the **leads** table
4. Scroll right - you should see 8 new columns:
   - **Hunter.io columns:**
     - hunter_io_searched_at
     - hunter_organization
     - hunter_email_pattern
     - hunter_total_emails
   - **LinkedIn columns:**
     - linkedin_company_url
     - linkedin_company_id
     - linkedin_scraped_at
     - linkedin_company_data

## Testing the Features

### Testing Email Discovery

1. Start your dev server: `npm run dev`
2. Navigate to a research run with completed leads
3. Click the green "📧 Find Emails" button on any lead card
4. Click "🔍 Search for Emails" in the modal
5. The emails should appear and be saved automatically
6. Close and reopen the modal - emails should still be there
7. The button should now show "📧 Emails (X)" where X is the count
8. Click on a lead card to open the detail modal - emails should appear there too

### Testing LinkedIn Company Research

1. On any completed lead card, click the blue "💼 LinkedIn" button
2. Enter a LinkedIn company ID (e.g., "stripe" or full URL)
3. Click "🔍 Scrape Company Profile"
4. You should see:
   - Company information (industry, size, headquarters, etc.)
   - Team structure organized by role (Executives, Management, Team Members)
   - Profile photos and positions for each person
5. Close and reopen the modal - data should be cached
6. The button should now show "💼 Team (X)" where X is the number of people found
7. Open the lead detail modal - team structure should appear there as well

## Troubleshooting

### "relation 'lead_emails' already exists"
This is fine! It means the table was already created. The migration is idempotent and can be run multiple times safely.

### "function 'update_updated_at_column' does not exist"
The function should already exist from the initial schema. If not, run the full `supabase/schema.sql` file first.

### Emails not showing up
1. Check the browser console for errors
2. Verify the migration ran successfully in Supabase
3. Check that your Hunter.io API key is set correctly in `.env.local`
4. Make sure you're on a completed lead with a valid website

### LinkedIn scraping not working
1. Verify your ScrapingDog API key is set in `.env.local`
2. Check that the LinkedIn company ID is correct (try the company slug, e.g., "stripe")
3. Some companies may have limited public data on LinkedIn
4. Check the browser console and network tab for specific error messages
5. ScrapingDog has rate limits - wait a few minutes if you hit the limit

## Rollback (if needed)

If you need to remove this feature:

\`\`\`sql
-- Remove the tables
DROP TABLE IF EXISTS lead_emails CASCADE;
DROP TABLE IF EXISTS lead_linkedin_people CASCADE;

-- Remove Hunter.io columns from leads
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_io_searched_at;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_organization;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_email_pattern;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_total_emails;

-- Remove LinkedIn columns from leads
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_company_url;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_company_id;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_scraped_at;
ALTER TABLE leads DROP COLUMN IF EXISTS linkedin_company_data;
\`\`\`

## API Keys Required

Make sure these are set in your `.env.local`:

\`\`\`bash
# Hunter.io API Key (for email discovery)
HUNTER_API_KEY=your-hunter-api-key

# ScrapingDog API Key (for LinkedIn scraping)
SCRAPINGDOG_API_KEY=your-scrapingdog-api-key
\`\`\`

## Code Reference

### Email Discovery
- API Route: `app/api/hunter/domain-search/route.ts`
- Email Modal: `components/runs/email-finder-modal.tsx`
- Lead Cards: `components/runs/leads-list.tsx`
- Detail Modal: `components/runs/lead-detail-modal.tsx`

### LinkedIn Research
- API Route: `app/api/linkedin/scrape-company/route.ts`
- LinkedIn Modal: `components/runs/linkedin-company-modal.tsx`
- Helper Functions: `lib/utils/linkedin-helpers.ts`
- Lead Cards: `components/runs/leads-list.tsx`
- Detail Modal: `components/runs/lead-detail-modal.tsx`
