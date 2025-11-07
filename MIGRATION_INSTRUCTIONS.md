# Database Migration Instructions

## Australia-Wide Search Feature Migration

To enable the full Australia-wide search functionality with state exclusion, you need to apply the database migration that adds the `excluded_states` column to the `runs` table.

### ⚠️ Current Status

**The feature will work in limited mode without the migration:**
- ✅ UI will show the "All Australia" button and state exclusion checkboxes
- ✅ Backend will accept the excluded states parameter
- ✅ Searches will work but **state exclusion will be ignored**
- ❌ Excluded states will not be saved to the database
- ❌ State exclusion filtering will not work until migration is applied

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the following SQL:

```sql
-- Add excluded_states field to runs table for Australia-wide searches
-- This allows users to search "All Australia" while excluding specific states (e.g., everything but VIC)

ALTER TABLE runs
ADD COLUMN IF NOT EXISTS excluded_states TEXT[] DEFAULT NULL;

COMMENT ON COLUMN runs.excluded_states IS 'Array of state codes (NSW, VIC, QLD, WA, SA, ACT, TAS) to exclude from Australia-wide searches';
```

5. Click **Run** to execute the migration

### Option 2: Apply via psql Command Line

If you have direct database access:

```bash
psql $DATABASE_URL < supabase/migrations/add_excluded_states_to_runs.sql
```

Or connect to your database and run:

```bash
psql $DATABASE_URL
```

Then paste the SQL from the migration file.

### Option 3: Apply via Supabase CLI

If you're using Supabase local development:

```bash
supabase db push
```

Or manually:

```bash
supabase migration up
```

### Verification

After applying the migration, verify it worked:

```sql
-- Check if the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'runs' AND column_name = 'excluded_states';
```

Expected output:
```
column_name     | data_type | is_nullable
----------------+-----------+-------------
excluded_states | ARRAY     | YES
```

### Testing the Feature

Once the migration is applied:

1. Create a new lead run
2. Click "🇦🇺 All Australia"
3. Check one or more states to exclude (e.g., VIC)
4. Submit the run
5. Verify in the database that `excluded_states` column contains the excluded state codes

### Rollback (if needed)

To remove the column:

```sql
ALTER TABLE runs DROP COLUMN IF EXISTS excluded_states;
```

⚠️ **Warning**: This will delete all saved state exclusion data.

### Migration File Location

The migration file is located at:
```
supabase/migrations/add_excluded_states_to_runs.sql
```
