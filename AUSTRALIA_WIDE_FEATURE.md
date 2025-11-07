# Australia-Wide Lead Search with State Exclusion

## Overview
This feature allows users to run lead searches across all of Australia while optionally excluding specific states (e.g., search everywhere but Victoria).

## Problem Solved
Previously, users could only search one city at a time. To cover all major Australian cities, they would need to create multiple runs. This was inefficient and made it difficult to get a comprehensive nationwide view.

Additionally, searching by postcodes would be too granular and create performance issues.

## Solution
Instead of using postcodes, we leverage major city centers across all states. This provides comprehensive coverage without overwhelming the system.

### Supported Cities
- **NSW**: Sydney (72 suburbs)
- **VIC**: Melbourne (68 suburbs)  
- **QLD**: Brisbane (18 suburbs)
- **WA**: Perth (35 suburbs)
- **SA**: Adelaide (34 suburbs)
- **ACT**: Canberra (16 suburbs)
- **TAS**: Hobart (16 suburbs)

## Changes Made

### 1. Database Schema (`supabase/migrations/add_excluded_states_to_runs.sql`)
- Added `excluded_states` TEXT[] column to `runs` table
- Stores array of state codes (NSW, VIC, QLD, WA, SA, ACT, TAS) to exclude

### 2. Suburb Configurations (`lib/config/suburbs.ts`)
- Added suburb configurations for Perth, Adelaide, Canberra, and Hobart
- Added helper functions:
  - `getAllCityConfigs()`: Returns all 7 city configurations
  - `getCityConfigsExcludingStates(excludedStates)`: Returns cities filtered by excluded states
- Exported `SuburbSearchConfig` type for proper TypeScript support

### 3. Backend Create Run Action (`lib/actions/create-run.ts`)
- Added `excludedStates?: string[]` parameter to `CreateRunParams`
- Passes excluded states to database and Inngest workflow

### 4. Inngest Workflow (`lib/inngest/functions.ts`)
- Detects Australia-wide searches by checking if location includes "australia"
- When Australia-wide:
  - Gets all city configs excluding specified states
  - Iterates through each city configuration
  - Distributes target lead count across cities (e.g., 1000 leads / 7 cities ≈ 143 per city)
- Added progress logging:
  - `australia_wide_search`: Logs which cities will be searched
  - `scraping_city`: Logs each city as it's being searched

### 5. Progress Logger (`lib/utils/progress-logger.ts`)
- Added new event types:
  - `australia_wide_search`
  - `scraping_city`

### 6. UI Components (`components/dashboard/create-run-modal.tsx`)
- Added "🇦🇺 All Australia" quick-select button
- Shows state exclusion checkboxes when location contains "Australia"
- Displays all 7 states (NSW, VIC, QLD, WA, SA, ACT, TAS) as checkboxes
- Updated placeholder text and help text
- Dynamic guidance for target count based on location type

## Usage

### Creating an Australia-Wide Run
1. Click "Create New Research Run"
2. Click the "🇦🇺 All Australia" button (or type "Australia" in location field)
3. Optionally check states to exclude (e.g., check "VIC" to exclude Victoria)
4. Set your business type and target lead count
5. Click "Start Research"

### Example Use Cases

**Example 1: All of Australia**
- Location: "Australia"
- Excluded States: (none)
- Result: Searches Sydney, Melbourne, Brisbane, Perth, Adelaide, Canberra, Hobart

**Example 2: All Australia except Victoria**
- Location: "Australia"  
- Excluded States: VIC
- Result: Searches Sydney, Brisbane, Perth, Adelaide, Canberra, Hobart (skips Melbourne)

**Example 3: Only Eastern States**
- Location: "Australia"
- Excluded States: WA, SA, TAS
- Result: Searches Sydney, Melbourne, Brisbane, Canberra

## Technical Details

### Location Detection
```typescript
const isAustraliaWide = 
  location.toLowerCase().includes("australia") && 
  !location.toLowerCase().includes("south australia");
```

### Target Distribution
For Australia-wide searches, the target count is distributed across cities:
```typescript
limit: isAustraliaWide 
  ? Math.ceil(targetCount / cityConfigs.length) 
  : targetCount
```

For example, with 1000 target leads across 7 cities: ~143 leads per city.

### Deduplication
The system still performs place_id-based deduplication across all results, so if a business appears in multiple city searches, it will only be included once.

## Migration Notes

### Database Migration
The migration file has been created but needs to be applied to your database:
```bash
psql $DATABASE_URL < supabase/migrations/add_excluded_states_to_runs.sql
```

Or apply via Supabase dashboard SQL editor.

## Performance Considerations

1. **Suburb Count**: Each city uses existing suburb configurations (16-72 suburbs per city)
2. **API Calls**: Distributes target across cities to avoid overwhelming any single location
3. **Deduplication**: Uses place_id Set to efficiently deduplicate across all cities
4. **Early Exit**: Stops searching once target count is reached

## Future Enhancements

Possible future improvements:
- Add more regional centers (e.g., Newcastle, Gold Coast, Geelong)
- Allow custom city selection (not just exclude by state)
- Add "exclude metro only" option to focus on regional areas
- State-level configuration of per-suburb limits based on population density

## Files Modified

1. ✅ `supabase/migrations/add_excluded_states_to_runs.sql` (new)
2. ✅ `lib/config/suburbs.ts`
3. ✅ `lib/actions/create-run.ts`
4. ✅ `lib/inngest/functions.ts`
5. ✅ `lib/utils/progress-logger.ts`
6. ✅ `components/dashboard/create-run-modal.tsx`
7. ✅ `AUSTRALIA_WIDE_FEATURE.md` (this file)

## Testing

Build completed successfully with no errors:
```
✓ Compiled successfully
ƒ Middleware                                     66.9 kB
```

To test the feature:
1. Start the dev server: `npm run dev`
2. Navigate to dashboard
3. Click "Create New Research Run"
4. Click "🇦🇺 All Australia" button
5. Optionally exclude some states
6. Submit and monitor progress logs
