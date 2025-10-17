# Pause/Resume Functionality Setup

This feature allows you to pause and resume large research runs to manage costs and API rate limits.

## What's Been Implemented

✅ **Database Schema** - Migration file created with new columns
✅ **API Endpoints** - `/api/runs/pause` and `/api/runs/resume`
✅ **Inngest Functions** - Updated to check pause status before processing leads
✅ **UI Components** - Pause/Resume buttons in the runs list

## Setup Instructions

### 1. Apply Database Migration

You need to manually run the SQL migration in Supabase. Here's how:

1. Open the Supabase SQL Editor:
   https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql

2. Copy and paste the SQL from `supabase/migrations/add_pause_resume.sql`

3. Click "Run" to execute

The migration adds:
- `is_paused` (boolean) - Tracks if run is paused
- `paused_at` (timestamp) - When the run was paused
- `resumed_at` (timestamp) - When the run was last resumed

### 2. Verify Migration

After running the migration, verify it worked:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rnbqqwmbblykvriitgxf.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/apply-pause-migration-simple.ts
```

## How to Use

### In the UI

1. **Start a Research Run** - Click "Research All" as normal
2. **Pause** - While researching, click the "⏸ Pause" button
   - Currently processing leads will complete
   - New leads won't start processing
   - Status badge shows "⏸ Paused"
3. **Resume** - Click "▶ Resume" to continue
   - Automatically re-queues all pending leads
   - Research continues where it left off

### Via API

**Pause a run:**
```bash
curl -X POST http://localhost:3000/api/runs/pause \
  -H "Content-Type: application/json" \
  -d '{"runId": "your-run-id"}'
```

**Resume a run:**
```bash
curl -X POST http://localhost:3000/api/runs/resume \
  -H "Content-Type: application/json" \
  -d '{"runId": "your-run-id"}'
```

## How It Works

### Pause Flow
1. User clicks "Pause" button
2. API sets `is_paused = true` on the run
3. Inngest functions check `is_paused` before processing each lead
4. If paused, function returns early with `reason: "run-paused"`
5. Already-running leads complete normally

### Resume Flow
1. User clicks "Resume" button
2. API sets `is_paused = false` on the run
3. API fetches all pending leads for the run
4. API sends Inngest events to re-trigger pending leads
5. Research continues from where it stopped

## Benefits

- 💰 **Cost Control** - Pause expensive API calls anytime
- ⏱️ **Rate Limit Management** - Avoid hitting API limits
- 🎯 **Flexible Workflow** - Review partial results before continuing
- 🔄 **Safe Resume** - Automatically picks up where you left off
- 📊 **Progress Tracking** - View pause/resume timestamps

## Status Badge Colors

- 🟣 **Researching** - Purple (actively processing)
- 🟠 **Paused** - Orange (paused by user)
- 🟢 **Completed** - Green (all done)

## Notes

- Pausing only works when status is "researching"
- Currently processing leads will complete before fully pausing
- Resume automatically re-triggers all pending leads
- Progress logs track pause/resume events
