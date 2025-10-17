# Multi-Query Search Feature

## Overview

The multi-query search feature allows you to search for multiple business types or search terms in a single run, with automatic deduplication across all queries. This is perfect for finding businesses that might rank under different search terms.

## Use Case Example

**Scenario:** You want to find artificial grass businesses in Melbourne.

**Single Query (Old Way):**
- Search: "Artificial Grass"
- Results: 100 businesses

**Multi-Query (New Way):**
- Search: "Artificial Grass, Fake Turf, Synthetic Lawn"
- Results: 150 unique businesses (deduplicated)
- Benefits: Captures businesses that rank for different search terms

## How It Works

### 1. Input Multiple Queries

In the "Create New Research Run" modal:
- Enter multiple search terms separated by commas
- Example: `Artificial Grass, Fake Turf, Synthetic Lawn`

### 2. Automated Search Process

For each query, the system:
1. Searches all suburbs in the area (for Melbourne/Sydney)
2. Collects results with place_id tracking
3. Deduplicates across ALL queries using place_id
4. Continues until target count is reached or all queries are exhausted

### 3. Deduplication Strategy

**Primary Key:** Google Maps `place_id`
- Ensures the same business isn't counted twice
- Works across different search terms
- Works across different suburbs

**Fallback Keys:**
- `data_id` if place_id unavailable
- Coordinate-based ID: `coord_{lat}_{lng}`

### 4. Progress Tracking

Watch real-time progress with detailed logging:
- Query-by-query progress
- New vs. duplicate counts per query
- Total unique businesses found
- Target achievement notifications

## Architecture

### Database Schema

**New Columns in `runs` table:**
```sql
business_types TEXT[]      -- Array of search queries
queries_count INTEGER       -- Number of queries (auto-calculated)
business_type TEXT          -- Display string (for backward compatibility)
```

**Example:**
```json
{
  "business_types": ["Artificial Grass", "Fake Turf", "Synthetic Lawn"],
  "queries_count": 3,
  "business_type": "Artificial Grass, Fake Turf, Synthetic Lawn"
}
```

### Search Flow

```
1. User enters: "Artificial Grass, Fake Turf, Synthetic Lawn"
   ↓
2. Parse into array: ["Artificial Grass", "Fake Turf", "Synthetic Lawn"]
   ↓
3. For each query:
   ├─ Search city-wide (if Melbourne/Sydney/Brisbane)
   ├─ Search each suburb
   ├─ Track unique businesses by place_id
   ├─ Log progress (new vs duplicates)
   └─ Stop if target reached
   ↓
4. Return consolidated, deduplicated list
```

### Code Components

| Component | File | Purpose |
|-----------|------|---------|
| **UI Input** | `components/dashboard/create-run-modal.tsx` | Accepts comma-separated queries |
| **Server Action** | `lib/actions/create-run.ts` | Parses queries, creates run |
| **Workflow** | `lib/inngest/functions.ts` | Multi-query search orchestration |
| **Search Service** | `lib/services/city-search.ts` | Suburb search with deduplication |
| **Migration** | `supabase/migrations/add_multi_query_support.sql` | Database schema update |

## Usage Examples

### Example 1: Artificial Grass Businesses in Melbourne
```
Business Types: Artificial Grass, Fake Turf, Synthetic Lawn
Location: Melbourne
Target: 200 leads

Result: 
- Query 1 "Artificial Grass": 120 new (5 duplicates)
- Query 2 "Fake Turf": 45 new (80 duplicates) 
- Query 3 "Synthetic Lawn": 35 new (90 duplicates)
- Total: 200 unique businesses
```

### Example 2: Real Estate in Sydney
```
Business Types: Real Estate Agent, Property Manager, Realtor
Location: Sydney
Target: 500 leads

Result:
- Searches all Sydney suburbs for each query
- Deduplicates across all results
- Returns 500 unique real estate businesses
```

### Example 3: Single Query (Backward Compatible)
```
Business Types: Dentist
Location: Brisbane
Target: 100 leads

Result:
- Works exactly like before
- Single query, deduplicated results
```

## Migration Guide

### Step 1: Apply Database Migration

**Option A: Using Script (Recommended)**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url \
SUPABASE_SERVICE_ROLE_KEY=your_key \
npx tsx scripts/apply-multi-query-migration.ts
```

**Option B: Manual (Supabase SQL Editor)**
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/add_multi_query_support.sql`
3. Execute the SQL

### Step 2: Verify Migration

Check that new columns exist:
```sql
SELECT business_types, queries_count, business_type 
FROM runs 
LIMIT 1;
```

### Step 3: Test Multi-Query Search

1. Open your app
2. Click "Create New Run"
3. Enter: `Artificial Grass, Fake Turf`
4. Location: `Melbourne`
5. Target: `100`
6. Click "Start Research"

## Benefits

✅ **Better Coverage**: Find businesses ranking under different terms  
✅ **No Duplicates**: Automatic deduplication by place_id  
✅ **Smart Search**: Combines city-wide + suburb searches  
✅ **Progress Tracking**: See results per query in real-time  
✅ **Backward Compatible**: Single queries still work perfectly  
✅ **Flexible**: Works with any location (suburb search if supported)

## Technical Details

### Deduplication Algorithm

```typescript
// Track unique businesses across ALL queries
const seenPlaceIds = new Set<string>();
const allResults: any[] = [];

for (const query of queries) {
  const queryResults = await searchCity({ query, ... });
  
  for (const result of queryResults) {
    const placeId = extractPlaceId(result);
    
    if (!seenPlaceIds.has(placeId)) {
      seenPlaceIds.add(placeId);
      allResults.push(result);
    }
  }
}
```

### Performance Considerations

- Each query searches independently
- Deduplication happens in-memory (fast)
- Stops early if target count reached
- Logging provides transparency

### Supported Locations

**Multi-Suburb Search:**
- Sydney, NSW (50+ suburbs)
- Melbourne, VIC (60+ suburbs)
- Brisbane, QLD (18 suburbs)

**Single-Location Search:**
- Any other Australian location
- Falls back to standard Google Maps search

## Monitoring

### Progress Logs

Track multi-query progress in the `progress_logs` table:

```sql
-- View multi-query search progress
SELECT 
  event_type,
  message,
  details,
  created_at
FROM progress_logs
WHERE run_id = 'your-run-id'
ORDER BY created_at DESC;
```

### Key Events

- `scraping_started`: Multi-query search begins
- `scraping_query`: Starting search for specific query
- `scraping_suburbs`: Suburb search for query
- `scraping_query_completed`: Query results with dedup stats
- `scraping_target_reached`: Target count achieved
- `scraping_completed`: All queries complete

## Troubleshooting

### Issue: Migration Fails

**Solution**: Apply manually via Supabase SQL Editor
1. Copy `supabase/migrations/add_multi_query_support.sql`
2. Paste in SQL Editor
3. Execute

### Issue: Old Runs Show Null for business_types

**Solution**: Run migration step 2 again
```sql
UPDATE runs 
SET business_types = ARRAY[business_type],
    queries_count = 1
WHERE business_types IS NULL;
```

### Issue: Too Many Duplicates

**Cause**: Queries are very similar (e.g., "Dentist", "Dental Clinic")  
**Solution**: Use more distinct search terms

### Issue: Not Reaching Target Count

**Cause**: Not enough businesses for combined queries  
**Solution**: Add more related search terms

## Future Enhancements

Potential improvements:
- Query relevance scoring
- Smart query suggestions based on industry
- Query performance analytics
- Duplicate prediction before search
- Multi-language query support

---

**Questions?** Check the implementation in:
- UI: `components/dashboard/create-run-modal.tsx:80`
- Logic: `lib/inngest/functions.ts:56`
- Search: `lib/services/city-search.ts:35`
