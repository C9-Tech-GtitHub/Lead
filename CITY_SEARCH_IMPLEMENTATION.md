# City Search & Manual Research Implementation

## Overview
This implementation adds multi-suburb city search with duplicate detection and manual research controls to the lead generation system.

## Features Implemented

### 1. Multi-Suburb City Search
**Files Created:**
- `lib/services/city-search.ts` - Core city search service with duplicate detection
- `lib/config/suburbs.ts` - Suburb configurations for Sydney, Melbourne, and Brisbane

**How It Works:**
- **Hybrid Search Mode** (default): Performs a city-wide search first, then supplements with suburb-specific searches
- **Duplicate Detection**: Uses `place_id` from Google Maps API to prevent duplicate businesses
- **Configurable Limits**: Set overall limits and per-suburb limits
- **Progress Logging**: Detailed console logging of search progress

**Supported Cities:**
- **Sydney, NSW**: 60+ suburbs covering Inner City, Eastern Suburbs, Inner West, North Shore, Northern Beaches, etc.
- **Melbourne, VIC**: 70+ suburbs covering Inner City, Inner North, Inner South, Inner East, Inner West, etc.
- **Brisbane, QLD**: 18+ suburbs (ready for expansion)

**Search Modes:**
- `city-wide`: Single search for entire city (fast, fewer API calls)
- `suburbs`: Only suburb-by-suburb searches (thorough, more coverage)
- `hybrid`: City-wide first, then suburb searches to fill gaps (RECOMMENDED)

### 2. Manual Research Controls

#### Database Changes
**Migration Created:**
- `supabase/migrations/add_ready_status.sql`
- Added `ready` status to runs table
- Status flow: `pending` → `scraping` → `ready` → `researching` → `completed`

#### Inngest Function Updates
**Modified:** `lib/inngest/functions.ts`
- **processLeadRun**: Now stops after scraping, sets status to `ready`
- **New Function: triggerResearchAll**: Manually triggers research for all pending leads in a run
- Research is NO LONGER automatic - user must click buttons to start

#### UI Updates

**Run Details Page** (`components/runs/run-details.tsx`):
- Added "🔬 Research All Leads" button when status is `ready`
- Button triggers all pending leads to be researched
- Real-time status updates via Supabase subscriptions

**Leads List** (`components/runs/leads-list.tsx`):
- Added "Research" button on each individual lead card
- Only shows for leads with `pending` status
- Allows selective research of specific leads
- Prevents duplicate clicks with loading state

**New Run Modal** (`components/dashboard/create-run-modal.tsx`):
- Added quick-select buttons for Sydney and Melbourne
- Visual indicators showing multi-suburb support
- Updated placeholder text and help text

#### API Endpoints Created
- `app/api/inngest/trigger-research-all/route.ts` - Triggers research for all leads
- `app/api/inngest/trigger-research-single/route.ts` - Triggers research for one lead

Both endpoints include:
- User authentication checks
- Run ownership verification
- Status validation
- Proper error handling

## User Workflow

### Creating a Run
1. Click "New Research Run"
2. Enter business type (e.g., "realtors")
3. Click "Sydney" or "Melbourne" quick button (or type any location)
4. Set number of leads (5-50)
5. Click "Start Research"

### After Scraping Completes
**Run Status Changes to "Ready"**

**Option 1: Research All Leads**
- Click "🔬 Research All Leads" button in run details
- All pending leads will be researched automatically
- Status changes to "researching"
- Progress updates in real-time

**Option 2: Research Leads Selectively**
- Browse the leads list
- Click "Research" button on individual leads
- Only selected leads will be researched
- Other leads remain "pending" for later

### Monitoring Progress
- Real-time status updates via Supabase subscriptions
- Progress log shows detailed events
- Grade distribution updates as research completes

## Technical Details

### Duplicate Detection Algorithm
```typescript
// Uses place_id as unique identifier
const seenPlaceIds = new Set<string>();

// Extract place_id from multiple possible fields
function extractPlaceId(result: any): string | null {
  return result.place_id
    || result.data_id
    || extractFromUrl(result.url)
    || `coord_${result.latitude}_${result.longitude}`;
}

// Skip duplicates during suburb searches
if (!seenPlaceIds.has(placeId)) {
  seenPlaceIds.add(placeId);
  results.push(result);
}
```

### Search Performance
- **Hybrid Mode** (recommended):
  - City-wide: 1 API call (gets ~40 results)
  - Suburbs: Variable (stops when target reached)
  - Average: 5-10 API calls for 50 leads

- **Suburbs Mode**:
  - More thorough coverage
  - Higher API usage
  - Best for comprehensive searches

### Rate Limiting
- 500ms delay between suburb searches
- Configurable in `city-search.ts`
- Prevents API rate limiting issues

## Configuration

### Adding More Cities
Edit `lib/config/suburbs.ts`:

```typescript
export const BRISBANE_SUBURBS: SuburbSearchConfig = {
  city: 'Brisbane',
  state: 'QLD',
  suburbs: [
    'Brisbane CBD',
    'Fortitude Valley',
    // Add more suburbs...
  ]
};

// Update getSuburbConfig function
export function getSuburbConfig(cityName: string) {
  if (cityName.toLowerCase().includes('brisbane'))
    return BRISBANE_SUBURBS;
  // ...
}
```

### Adjusting Search Parameters
In `lib/inngest/functions.ts`:

```typescript
const searchResults = await searchCity({
  query: businessType,
  config: suburbConfig,
  limit: targetCount,
  perSuburbLimit: 20, // Adjust this
  mode: 'hybrid' // Change to 'city-wide' or 'suburbs'
});
```

## Testing

### Test Scenarios

1. **Sydney Multi-Suburb Search**
   - Location: "Sydney"
   - Should search 60+ suburbs
   - Verify duplicate detection works

2. **Melbourne Multi-Suburb Search**
   - Location: "Melbourne"
   - Should search 70+ suburbs
   - Check for location-specific results

3. **Manual Research All**
   - Create run → Wait for "ready" status
   - Click "Research All Leads"
   - Verify all leads are researched

4. **Selective Research**
   - Create run → Wait for "ready" status
   - Click "Research" on 2-3 individual leads
   - Verify only selected leads are researched

5. **Non-Supported City**
   - Location: "Perth" or "Adelaide"
   - Should fall back to single-location search
   - Still works, just no suburb subdivision

## Future Enhancements

- [ ] Add Perth, Adelaide suburb lists
- [ ] Configurable search mode in UI
- [ ] Pause/resume research capability
- [ ] Research queue with priority
- [ ] Batch export of pending leads
- [ ] Custom suburb list per run
- [ ] API usage tracking and limits
- [ ] Search result caching

## Troubleshooting

**Issue: Research not starting**
- Check run status is "ready"
- Verify Inngest is running
- Check browser console for errors

**Issue: No leads found**
- Verify SCRAPINGDOG_API_KEY is set
- Check API quota/limits
- Try different business type or location

**Issue: Duplicate leads appearing**
- Check if place_id extraction is working
- Verify duplicate detection logic
- May need to adjust extractPlaceId function

**Issue: Research button not showing**
- Verify lead status is "pending"
- Check real-time subscriptions are active
- Refresh page to sync state

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify environment variables are set
3. Check Inngest dashboard for function execution
4. Review Supabase logs for database issues
