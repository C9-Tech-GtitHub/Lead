# Interactive Leads Map Feature

This document explains the new interactive map feature that visualizes all your generated leads on a map.

## Features

- **Interactive Map**: View all your leads on an interactive OpenStreetMap
- **Color-Coded Markers**: Leads are marked with colors based on their compatibility grade:
  - Green (A): Excellent Match
  - Blue (B): Good Match
  - Yellow (C): Average Match
  - Orange (D): Below Average
  - Red (F): Poor Match
  - Gray: Not yet graded
- **Popup Details**: Click on any marker to see lead details including:
  - Business name
  - Address
  - Phone number
  - Website link
  - Google Maps link
  - Compatibility grade and reasoning
- **Auto-Zoom**: The map automatically adjusts to show all your leads
- **Statistics Dashboard**: View grade distribution at a glance

## Setup Instructions

### 1. Run the Database Migration

To enable the map feature, you need to add latitude and longitude columns to your database:

```bash
# Option A: Using Supabase CLI (recommended)
npx supabase db push

# Option B: Run the migration SQL directly in Supabase Dashboard
# Go to: Supabase Dashboard > SQL Editor
# Copy and paste the contents of: supabase/migrations/add_coordinates_to_leads.sql
# Click "Run"
```

The migration adds:
- `latitude` column (DOUBLE PRECISION)
- `longitude` column (DOUBLE PRECISION)
- Spatial index for efficient location queries

### 2. Update Existing Schema (if needed)

The main schema file has also been updated. If you're setting up a fresh database, just run:

```bash
# In Supabase SQL Editor, run the updated schema.sql file
cat supabase/schema.sql
```

### 3. Install Dependencies

The required map libraries have already been installed:
```bash
npm install leaflet react-leaflet @types/leaflet --legacy-peer-deps
```

## Usage

### Accessing the Map

1. Log in to your dashboard
2. Click on the **"Map View"** tab in the navigation header
3. The map will display all your leads with location data

### For New Leads

All leads generated **after** running the migration will automatically include GPS coordinates from Google Maps.

### For Existing Leads

Existing leads in your database **will not** have coordinates until you:
1. Run a new lead research run, OR
2. Manually add coordinates to existing leads (requires custom script)

## Technical Details

### Data Flow

1. **Google Maps Scraper** ([lib/scrapers/google-maps.ts](lib/scrapers/google-maps.ts)):
   - Receives GPS coordinates from Scrapingdog API
   - Extracts `latitude` and `longitude` from the response
   - Returns coordinates along with business details

2. **Lead Processing** ([lib/inngest/functions.ts](lib/inngest/functions.ts)):
   - Saves coordinates to the database when creating new leads
   - Stores in `leads.latitude` and `leads.longitude` columns

3. **Map Component** ([components/map/leads-map.tsx](components/map/leads-map.tsx)):
   - Uses React Leaflet to render an interactive map
   - Filters leads with valid coordinates
   - Creates custom markers based on compatibility grades
   - Displays detailed popups on marker click

4. **Map Page** ([app/dashboard/map/page.tsx](app/dashboard/map/page.tsx)):
   - Fetches all leads for the authenticated user
   - Displays statistics and grade legend
   - Renders the LeadsMap component

### Database Schema

```sql
-- Added to leads table
ALTER TABLE leads
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Index for performance
CREATE INDEX idx_leads_coordinates
ON leads(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### Map Libraries

- **Leaflet**: Open-source JavaScript library for interactive maps
- **React Leaflet**: React components for Leaflet
- **OpenStreetMap**: Free tile provider (no API key required)

## Troubleshooting

### Map Not Showing

1. **No leads with coordinates**: Run a new lead research run to generate leads with location data
2. **Client-side rendering issue**: The map only renders on the client side. If you see "Loading map...", refresh the page
3. **CSS not loading**: Make sure `leaflet/dist/leaflet.css` is imported in the component

### Migration Issues

If the migration fails:
```sql
-- Check if columns already exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('latitude', 'longitude');

-- If they don't exist, run the migration manually
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

### Marker Icons Not Showing

The component includes a fix for default Leaflet marker icons in Next.js. If icons are missing, check that the CDN URLs are accessible:
- https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png
- https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png
- https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png

## Future Enhancements

Possible improvements:
- [ ] Filter leads by grade on the map
- [ ] Cluster markers when zoomed out
- [ ] Search/filter by location or business name
- [ ] Export visible leads to CSV
- [ ] Add heatmap view for lead density
- [ ] Integration with routing services for territory planning
- [ ] Mobile-responsive map controls

## Files Modified/Created

### Created Files:
- `supabase/migrations/add_coordinates_to_leads.sql` - Database migration
- `components/map/leads-map.tsx` - Interactive map component
- `app/dashboard/map/page.tsx` - Map page
- `MAP_FEATURE.md` - This documentation

### Modified Files:
- `supabase/schema.sql` - Added latitude/longitude columns
- `lib/scrapers/google-maps.ts` - Added coordinate extraction
- `lib/inngest/functions.ts` - Save coordinates when creating leads
- `components/dashboard/header.tsx` - Added Map View navigation
- `package.json` - Added map dependencies

## Support

If you encounter any issues with the map feature, please check:
1. Database migration has been run successfully
2. Leads have been generated after the migration
3. Browser console for any JavaScript errors
4. Network tab for failed API requests
