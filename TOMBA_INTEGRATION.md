# Tomba.io Integration

This document describes the Tomba.io email lookup integration added to the Lead Generation application.

## Overview

Tomba.io has been integrated as a secondary email lookup service alongside Hunter.io, giving users the flexibility to choose between two providers for finding business emails.

## Features

- **Dual Provider Support**: Users can choose between Hunter.io and Tomba.io for email lookups
- **Domain Search**: Find all emails associated with a specific domain
- **Bulk Search**: Process multiple leads at once
- **Provider Tracking**: Each email is tagged with its source provider
- **Unified Storage**: Both providers' results are stored in the same database schema

## Files Created/Modified

### New Files

1. **`app/api/tomba/domain-search/route.ts`**
   - API endpoint for single domain email search using Tomba.io
   - Mirrors the functionality of Hunter.io domain search
   - Stores results with `provider: 'tomba'` flag

2. **`app/api/tomba/bulk-search/route.ts`**
   - API endpoint for bulk email search across multiple leads
   - Processes leads with rate limiting (1 second delay between requests)
   - Updates lead metadata with Tomba-specific fields

3. **`supabase/migrations/add_email_provider_field.sql`**
   - Adds `provider` column to `lead_emails` table
   - Adds Tomba-specific metadata columns to `leads` table:
     - `tomba_searched_at`
     - `tomba_organization`
     - `tomba_email_pattern`
     - `tomba_total_emails`
   - Creates index on provider field for efficient filtering

### Modified Files

1. **`components/runs/email-finder-modal.tsx`**
   - Added provider selection UI (Hunter.io vs Tomba.io)
   - Dynamic API endpoint selection based on provider
   - Provider badge display on each email
   - Updated footer to show active provider

2. **`components/leads/bulk-email-finder-modal.tsx`**
   - Added provider selection buttons
   - Dynamic API routing based on selected provider
   - Updated "How it works" section to reflect selected provider

3. **`.env.example`**
   - Added `TOMBA_API_KEY` environment variable documentation

## Database Schema Changes

### `lead_emails` Table
```sql
-- New column
provider TEXT CHECK (provider IN ('hunter', 'tomba')) DEFAULT 'hunter'

-- New index
CREATE INDEX idx_lead_emails_provider ON lead_emails(provider)
```

### `leads` Table
```sql
-- New columns for Tomba metadata
tomba_searched_at TIMESTAMPTZ
tomba_organization TEXT
tomba_email_pattern TEXT
tomba_total_emails INTEGER
```

## Setup Instructions

### 1. Get Tomba.io API Key

1. Visit https://tomba.io/dashboard
2. Sign up for a free account (50 requests/month)
3. Navigate to API Keys section
4. Copy your API key

### 2. Configure Environment Variables

Add to your `.env.local` file:
```bash
TOMBA_API_KEY=your-tomba-api-key-here
```

### 3. Run Database Migration

The migration file `supabase/migrations/add_email_provider_field.sql` needs to be applied to your database.

**For Supabase Cloud:**
```bash
npx supabase db push
```

**For Local Development:**
```bash
npx supabase migration up
```

**Manual Migration (if needed):**
Run the SQL directly in your Supabase SQL editor:
```sql
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('hunter', 'tomba')) DEFAULT 'hunter';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_searched_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_organization TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_email_pattern TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tomba_total_emails INTEGER;
CREATE INDEX IF NOT EXISTS idx_lead_emails_provider ON lead_emails(provider);
```

## Usage

### Single Lead Email Search

1. Navigate to a lead's detail page
2. Click "Find Emails"
3. Select your preferred provider (Hunter.io or Tomba.io)
4. Click "Search for Emails"
5. View results with provider badges

### Bulk Email Search

1. Select multiple leads from your leads dashboard
2. Click "Bulk Find Emails"
3. Choose your email provider
4. Configure search options (only missing, etc.)
5. Click "Start Search"
6. Monitor progress for each lead

## API Endpoints

### Domain Search
- **Hunter.io**: `POST /api/hunter/domain-search`
- **Tomba.io**: `POST /api/tomba/domain-search`

Request body:
```json
{
  "domain": "example.com",
  "leadId": "uuid-here"
}
```

### Bulk Search
- **Hunter.io**: `POST /api/hunter/bulk-search`
- **Tomba.io**: `POST /api/tomba/bulk-search`

Request body:
```json
{
  "leadIds": ["uuid-1", "uuid-2"],
  "onlyMissing": true
}
```

## Tomba.io API Response Format

Tomba.io returns email data in a slightly different format than Hunter.io:

```json
{
  "data": {
    "domain": "example.com",
    "organization": "Example Inc",
    "pattern": "{first}.{last}@example.com",
    "emails": [
      {
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "position": "CEO",
        "department": "Executive",
        "type": "personal",
        "score": 95,
        "verification": {
          "status": "valid",
          "date": "2024-01-01"
        },
        "sources": [...]
      }
    ]
  },
  "meta": {
    "total": 10
  }
}
```

Key differences from Hunter.io:
- Uses `score` instead of `confidence`
- Uses `email` instead of `value`
- Uses `type: "personal"` or `type: "generic"` directly

## Rate Limits

- **Hunter.io Free**: 25 requests/month
- **Tomba.io Free**: 50 requests/month

By using both services, you get 75 total free requests per month!

## Benefits of Dual Provider Support

1. **Increased Coverage**: Different providers may have different data sources
2. **Higher Free Tier**: Combine free tiers from both services
3. **Redundancy**: If one service is down or rate-limited, use the other
4. **Data Comparison**: Compare results from multiple sources for verification
5. **Cost Optimization**: Use the more cost-effective provider for your use case

## Future Enhancements

- Add automatic fallback to secondary provider if primary fails
- Merge results from multiple providers for the same lead
- Add provider preference settings at user level
- Track provider performance metrics (success rate, response time)
- Add more email lookup providers (e.g., Apollo.io, Snov.io)
