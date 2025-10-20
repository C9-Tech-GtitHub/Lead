# Database Migration: Add research_depth Column

## Quick Fix to Get Lightweight Research Working

Run this SQL in your **Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

```sql
-- Add research_depth column to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS research_depth TEXT 
CHECK (research_depth IN ('none', 'lightweight', 'deep')) 
DEFAULT 'none';

-- Add index for filtering by research depth
CREATE INDEX IF NOT EXISTS idx_leads_research_depth ON leads(research_depth);

-- Update existing completed leads to 'deep' (they used the old deep research method)
UPDATE leads 
SET research_depth = 'deep' 
WHERE research_status = 'completed' AND (research_depth IS NULL OR research_depth = 'none');
```

## Verify It Worked

After running the SQL, check that the column exists:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'research_depth';
```

You should see:
- column_name: `research_depth`
- data_type: `text`
- is_nullable: `YES`

## Then Restart Your Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

Now lightweight research should work! 🎉

---

## What This Does

1. **Adds `research_depth` column** - Tracks whether a lead was researched with:
   - `'none'` - Not researched yet
   - `'lightweight'` - Fast analysis without web search (~1,500 tokens)
   - `'deep'` - Comprehensive analysis with web search (~27,000 tokens)

2. **Creates an index** - Improves query performance when filtering by research depth

3. **Updates existing leads** - Marks all previously completed leads as "deep" since they used the old comprehensive research method

## Why The Migration Failed

The TypeScript migration runner couldn't execute multi-statement SQL properly due to Supabase's RPC limitations. Running it directly in the SQL Editor works perfectly.
