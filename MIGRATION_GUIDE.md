# Email Feature Migration Guide

## Overview
This migration adds the ability to save and display emails found via Hunter.io for each lead.

## What's New
- **lead_emails table**: Stores emails with contact details, verification status, and metadata
- **Lead card badges**: Shows email count on each lead card
- **Email persistence**: Automatically saves emails when searched
- **Email display**: Shows saved emails in lead detail modal and email finder modal

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase/migrations/add_lead_emails.sql`
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" - this is expected!

### Option 2: Quick Copy-Paste

Copy this SQL and run it in your Supabase SQL Editor:

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
\`\`\`

## Verify Migration Success

After running the migration, verify it worked:

1. In Supabase Dashboard, go to **Table Editor**
2. You should see a new table called **lead_emails**
3. Click on the **leads** table
4. Scroll right - you should see 4 new columns:
   - hunter_io_searched_at
   - hunter_organization
   - hunter_email_pattern
   - hunter_total_emails

## Testing the Feature

1. Start your dev server: `npm run dev`
2. Navigate to a research run with completed leads
3. Click the green "📧 Find Emails" button on any lead card
4. Click "🔍 Search for Emails" in the modal
5. The emails should appear and be saved automatically
6. Close and reopen the modal - emails should still be there
7. The button should now show "📧 Emails (X)" where X is the count
8. Click on a lead card to open the detail modal - emails should appear there too

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

## Rollback (if needed)

If you need to remove this feature:

\`\`\`sql
-- Remove the table
DROP TABLE IF EXISTS lead_emails CASCADE;

-- Remove columns from leads
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_io_searched_at;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_organization;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_email_pattern;
ALTER TABLE leads DROP COLUMN IF EXISTS hunter_total_emails;
\`\`\`

## Questions?

Check the Hunter.io integration at:
- API Route: `app/api/hunter/domain-search/route.ts`
- Email Modal: `components/runs/email-finder-modal.tsx`
- Lead Cards: `components/runs/leads-list.tsx`
- Detail Modal: `components/runs/lead-detail-modal.tsx`
