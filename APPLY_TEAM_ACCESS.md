# Apply Team Access Migration

This migration allows all authenticated users to access all runs and leads, enabling team collaboration.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new
2. Copy the contents of `supabase/migrations/allow_all_users_access.sql`
3. Paste into the SQL editor
4. Click "Run"

## Option 2: Via Command Line

Run this command to apply the migration:

```bash
psql "postgresql://postgres:[password]@db.rnbqqwmbblykvriitgxf.supabase.co:5432/postgres" -f supabase/migrations/allow_all_users_access.sql
```

Replace `[password]` with your database password from Supabase settings.

## What This Does

- ✅ Removes user-specific restrictions on `runs` table
- ✅ Removes user-specific restrictions on `leads` table  
- ✅ Removes user-specific restrictions on `progress_logs` table
- ✅ All authenticated users can now view, create, update, and delete all records
- ✅ Enables team collaboration - everyone sees the same data

## After Running

1. Refresh your browser
2. You should now see all runs (including the "Artificial Grass" run owned by tech@)
3. You can restart any run regardless of who created it
