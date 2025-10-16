# Re-Research Feature Implementation

## Overview
Added the ability to re-research leads that have already been completed or failed. This feature re-scrapes the website and updates all data including ABN lookup.

## Features Added

### 1. Re-Research Button for Individual Leads

**Location**: Lead cards in `/dashboard/runs/[id]`

**Appears For**: Leads with status `completed` or `failed`

**What It Does**:
- Re-scrapes the website using Firecrawl
- Re-extracts ABN from content
- Re-looks up ABN in Australian Business Register
- Updates business age and all metadata
- Re-runs AI analysis with GPT
- Updates grade and all research data

**How to Use**:
1. Navigate to a run detail page
2. Find a completed lead
3. Click the "🔄 Re-research" button
4. Confirm the action
5. Lead status changes to `pending` → `scraping` → `analyzing` → `completed`
6. All data is refreshed including ABN lookup

### 2. Research All Button on Runs List

**Location**: Dashboard runs list (`/dashboard`)

**Appears For**: Runs with status `ready`

**What It Does**:
- Triggers research for ALL pending leads in the run
- Convenient way to start research from the dashboard
- No need to open the individual run

**How to Use**:
1. Navigate to dashboard (`/dashboard`)
2. Find a run with "Ready" status
3. Click "🔬 Research All" button
4. Confirm the action
5. All pending leads will be researched

## Technical Implementation

### API Endpoints

#### `/api/inngest/trigger-re-research`
- **Method**: POST
- **Body**: `{ leadId, runId }`
- **Authentication**: Required (checks user owns the run)
- **Action**: Resets lead to `pending` status and triggers research Inngest function

### Component Updates

#### `components/runs/leads-list.tsx`
- Added `handleReResearchLead()` function
- Added `researchingLeads` state to track which leads are being re-researched
- Added re-research button UI with confirmation dialog
- Button shows for leads with status `completed` or `failed`

#### `components/dashboard/runs-list.tsx`
- Added `handleResearchAll()` function
- Added `researchingRuns` state to track which runs are starting research
- Added "Research All" button for runs with `ready` status
- Button appears next to status badge and delete button

### Database Flow

**Re-Research Process**:
1. API receives request
2. Validates user owns the run
3. Resets lead: `UPDATE leads SET research_status = 'pending', error_message = NULL WHERE id = leadId`
4. Triggers Inngest event: `lead/research.triggered`
5. Inngest function runs (same as initial research):
   - Searches for website if missing
   - Scrapes website with Firecrawl
   - Extracts ABN from content
   - Looks up ABN in ABR
   - Calculates business age
   - Runs AI analysis
   - Updates all fields in database

## Use Cases

### 1. Website Updated
Business updated their website with new information:
- Click re-research to get latest data
- ABN might now be visible
- Team size might have changed
- New services might be listed

### 2. ABN Lookup Failed
First research failed to find ABN:
- Re-research to try again
- Maybe website was down temporarily
- Maybe ABN was added to footer since then

### 3. Improve Lead Grade
Lead got a low grade but you think they're good:
- Check their website manually
- If website looks better now, re-research
- Get updated AI analysis

### 4. Technical Error
First research failed due to error:
- Review error message
- Re-research to try again
- Fresh attempt at scraping and analysis

## User Interface

### Lead Card with Re-Research Button
```
┌─────────────────────────────────────────┐
│ SnapTrek Hiking Gear                  B │
│                                         │
│ Factory 136/45 Gilby Rd                │
│ Mount Waverley VIC 3149                │
│ +61 xxx xxx xxx                        │
│ https://www.snaptrek.com.au/           │
│                                         │
│ [completed] [🔄 Re-research]           │
└─────────────────────────────────────────┘
```

### Dashboard Run Card with Research All
```
┌─────────────────────────────────────────┐
│ Camping Gear in Melbourne              │
│ Target: 10 leads • Created 2 hours ago │
│                                         │
│ [Ready] [🔬 Research All] [🗑️]         │
│                                         │
│ Progress: ████████████░░░ 80%          │
│ A: 2  B: 3  C: 1  D: 0  F: 2           │
└─────────────────────────────────────────┘
```

## Testing

### Test Re-Research
1. Create a run and let it complete
2. Find a completed lead (e.g., SnapTrek)
3. Click "🔄 Re-research"
4. Confirm
5. Watch status change: completed → pending → scraping → analyzing → completed
6. Verify data updates (check ABN, business age, grade)

### Test Research All from Dashboard
1. Create a run
2. Wait for scraping to complete (status: "ready")
3. From dashboard, click "🔬 Research All"
4. Confirm
5. Status changes to "researching"
6. All leads are researched

## Notes

- **Confirmation Required**: Both actions require user confirmation to prevent accidental clicks
- **Loading States**: Buttons show "Re-researching..." or "Starting..." while processing
- **Real-time Updates**: Status updates via Supabase real-time subscriptions
- **No Data Loss**: Previous research data is overwritten (intentional)
- **Same Process**: Re-research uses exact same Inngest function as initial research
- **ABN Lookup**: Always attempts ABN lookup on re-research (uses your GUID: `009d19cf-559d-4ec4-9113-8423202c49a1`)

## Files Modified

1. `components/runs/leads-list.tsx` - Added re-research button
2. `components/dashboard/runs-list.tsx` - Added research all button
3. `app/api/inngest/trigger-re-research/route.ts` - New API endpoint
4. `RE-RESEARCH_FEATURE.md` - This documentation

## Future Enhancements

- [ ] Batch re-research (select multiple leads)
- [ ] Schedule re-research (auto-refresh weekly)
- [ ] Compare before/after data
- [ ] Show what changed in UI
- [ ] Re-research only specific fields (e.g., just ABN lookup)
