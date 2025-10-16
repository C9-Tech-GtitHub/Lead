# ABN Checker Feature

The ABN (Australian Business Number) checker automatically extracts and verifies ABN numbers from business websites during the lead research process.

## Overview

When Firecrawl scrapes a business website, the system will:

1. **Extract ABN** - Search the website content for ABN numbers using pattern matching
2. **Validate Checksum** - Verify the ABN is valid using the official checksum algorithm
3. **Lookup Business Details** - Query the Australian Business Register (ABR) for:
   - Registered entity name
   - ABN status (Active/Cancelled)
   - Registration date
   - Business age (calculated from registration date)
   - GST status
   - Entity type

## Setup

### 1. Get a FREE ABN Lookup API Key

1. Visit [ABR Web Services Registration](https://abr.business.gov.au/Tools/WebServices)
2. Register for a free GUID (takes 1-2 minutes)
3. You'll receive a GUID that looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2. Add to Environment Variables

Add to your `.env.local` file:

```bash
ABN_LOOKUP_API_KEY=your-guid-here
```

### 3. Run Database Migration

Apply the migration to add ABN fields to your database:

```bash
# Run the migration script (create this or apply via Supabase dashboard)
npx supabase db push
```

Or manually run the SQL in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/add_abn_fields_to_leads.sql
```

## Database Schema

The following fields are added to the `leads` table:

- `abn` (TEXT) - The 11-digit ABN number
- `abn_entity_name` (TEXT) - Registered entity name from ABR
- `abn_status` (TEXT) - ABN status (Active, Cancelled, etc.)
- `abn_registered_date` (TIMESTAMPTZ) - Date when ABN was registered
- `business_age_years` (INTEGER) - Years since ABN registration

## How It Works

### Extraction Process

The ABN extractor can find ABN numbers in various formats:

- `ABN: 51 824 753 556`
- `ABN 51824753556`
- `ABN is 51 824 753 556`
- `Australian Business Number 51 824 753 556`

### Validation

Each extracted ABN is validated using the official checksum algorithm:

1. Subtract 1 from first digit
2. Multiply each digit by weighting factors: [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
3. Sum all products
4. Check if divisible by 89

### Lookup

If validation passes, the system queries the ABR API to get:

- Official registered name
- Current status
- Registration history
- Business age

## Testing

Run the test script to verify ABN extraction and lookup:

```bash
npx tsx scripts/test-abn-checker.ts
```

This will test:
- ABN extraction from various text formats
- Checksum validation
- ABR API lookup (if API key is configured)

## Code Structure

```
lib/
├── utils/
│   └── abn-extractor.ts       # ABN pattern matching and validation
├── services/
│   └── abn-lookup.ts          # ABR API integration
└── scrapers/
    └── website.ts             # Integration point - extracts ABN during scraping

scripts/
└── test-abn-checker.ts        # Test suite
```

## API Cost

**The ABN Lookup API is completely FREE** with no rate limits for reasonable use.

## Example Usage

The ABN checker runs automatically as part of the website scraping process:

```typescript
import { scrapeWebsite } from '@/lib/scrapers/website';

const data = await scrapeWebsite('https://example.com.au');

console.log(data.abn);              // "51824753556"
console.log(data.abnData?.entityName);     // "EXAMPLE PTY LTD"
console.log(data.abnData?.businessAge);    // 15 (years)
```

## Benefits for Lead Research

Having ABN data enhances lead qualification:

1. **Business Verification** - Confirms the business is registered and legitimate
2. **Business Age** - Indicates stability and maturity
3. **Entity Type** - Understand if it's a company, trust, partnership, etc.
4. **Active Status** - Ensure the business is currently operating

This data can be used in AI analysis to better qualify leads and understand business maturity.

## Legal Compliance

This implementation complies with the [ABN Lookup Web Services Agreement](https://abr.business.gov.au/Tools/WebServices):

- ✅ Commercial use is permitted
- ✅ Providing ABN data to third parties (your users) is allowed
- ✅ No usage fees or rate limits
- ✅ Service is provided "as is" with appropriate error handling

**Recommended UI Disclaimer**: When displaying ABN data in your app, include:

```
ABN information sourced from the Australian Business Register.
Data provided "as is" - verify critical information independently.
```

This is not legally required but is good practice for clarity.

## Troubleshooting

### No ABN Found

- Not all Australian businesses have ABNs (some use ACN only)
- ABN might not be displayed on the website
- The website might use an image or non-standard format

### ABN Lookup Fails

- Check your API key is correct
- Ensure you have internet connectivity
- Verify the ABN is registered (try looking it up manually at [ABN Lookup](https://abr.business.gov.au/))

### Rate Limits

The free ABR API has no published rate limits, but be reasonable with requests. Our implementation automatically caches results and only looks up each ABN once.
