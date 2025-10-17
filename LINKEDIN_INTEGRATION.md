# LinkedIn Company Research Integration

## Overview

This feature adds LinkedIn company profile scraping to your lead research application using ScrapingDog's API. You can now research company structure, find key team members, and understand organizational hierarchy.

## Features

### 1. Company Profile Data
- Company name, description, and about information
- Industry and specialties
- Company size and employee count
- Headquarters location
- Founded year
- LinkedIn follower count
- Company website

### 2. Team Structure Discovery
Automatically categorizes employees into:
- **Executive Team**: CEOs, CTOs, CFOs, founders, directors, VPs
- **Management & Leadership**: Managers, team leads, senior staff
- **Team Members**: General staff and employees

### 3. Person Details
For each team member found:
- Full name
- Current position/title
- Headline/bio
- Profile photo
- LinkedIn profile URL
- Email (if publicly available)

## How It Works

### User Flow

1. **Initiate Search**
   - Click the blue "💼 LinkedIn" button on any completed lead card
   - A modal opens prompting for the LinkedIn company ID

2. **Enter Company ID**
   - Enter the company identifier (e.g., "stripe")
   - Or paste a full LinkedIn URL (e.g., "https://www.linkedin.com/company/stripe")
   - The system automatically extracts the company ID

3. **Scraping Process**
   - API calls ScrapingDog LinkedIn Profile endpoint
   - Retrieves company data and employee list
   - Saves everything to Supabase database
   - Data is cached for instant future access

4. **View Results**
   - Company information displays at the top
   - Team members are organized by seniority
   - Each person shows photo, name, position
   - Links to LinkedIn profiles for deeper research

### Data Persistence

All LinkedIn data is saved to your Supabase database:
- Company profile stored in `leads.linkedin_company_data` (JSONB)
- Team members stored in `lead_linkedin_people` table
- Real-time updates when data changes
- Button shows team count badge after scraping

## API Integration

### ScrapingDog LinkedIn API

**Endpoint**: `https://api.scrapingdog.com/profile/`

**Parameters**:
- `api_key`: Your ScrapingDog API key
- `type`: "company" (for company profiles)
- `id`: LinkedIn company identifier
- `premium`: Optional boolean for premium proxies

**Rate Limits**: Check your ScrapingDog plan for limits

### Internal API Route

**POST** `/api/linkedin/scrape-company`

**Request Body**:
```json
{
  "linkedinCompanyId": "stripe",
  "leadId": "uuid-of-lead"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "Stripe",
      "description": "...",
      "industry": "Financial Services",
      "companySize": "1001-5000",
      "website": "https://stripe.com",
      "headquarters": "San Francisco, CA",
      "founded": "2010",
      "specialties": ["Payments", "APIs", "..."],
      "followerCount": 500000
    },
    "employees": [
      {
        "id": "patrick-collison",
        "name": "Patrick Collison",
        "position": "CEO & Co-founder",
        "headline": "CEO at Stripe",
        "profileUrl": "https://linkedin.com/in/patrick-collison",
        "imageUrl": "...",
        "email": null
      }
    ],
    "totalEmployees": 872
  }
}
```

## Database Schema

### New Columns on `leads` Table

```sql
linkedin_company_url TEXT           -- Full LinkedIn company URL
linkedin_company_id TEXT            -- Company identifier
linkedin_scraped_at TIMESTAMPTZ     -- When data was last scraped
linkedin_company_data JSONB         -- Full company profile data
```

### New `lead_linkedin_people` Table

```sql
CREATE TABLE lead_linkedin_people (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES leads(id),
  user_id UUID REFERENCES profiles(id),
  
  -- LinkedIn profile info
  linkedin_profile_id TEXT,
  linkedin_profile_url TEXT,
  
  -- Person details
  full_name TEXT NOT NULL,
  headline TEXT,
  position TEXT,
  profile_image_url TEXT,
  email TEXT,
  
  -- Full profile data as JSONB
  profile_data JSONB,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(lead_id, linkedin_profile_id)
);
```

## UI Components

### 1. LinkedIn Button (Lead Card)
- Location: `components/runs/leads-list.tsx`
- Shows "💼 LinkedIn" by default
- Shows "💼 Team (X)" after scraping where X = number of people
- Blue color to distinguish from email button

### 2. LinkedIn Company Modal
- Location: `components/runs/linkedin-company-modal.tsx`
- Full-screen overlay modal
- Company info card at top
- Team structure sections below
- Categorized by role (Executives, Management, Staff)
- Profile cards with photos and links
- Caches data - loads instantly on reopen

### 3. Lead Detail Modal Enhancement
- Location: `components/runs/lead-detail-modal.tsx`
- New "Team Structure" section
- Shows company info summary
- Grid of team member cards
- Appears between "Contact Emails" and "SEO Snapshot"

## Helper Functions

### `extractLinkedInCompanyId(input: string)`
Extracts company ID from various formats:
- Full URLs: `https://www.linkedin.com/company/stripe` → `stripe`
- Partial URLs: `linkedin.com/company/stripe` → `stripe`
- Direct IDs: `stripe` → `stripe`

### `guessLinkedInCompanyId(companyName: string)`
Converts company name to likely LinkedIn ID:
- `"Stripe Inc."` → `stripe-inc`
- Lowercases, removes special chars, replaces spaces with hyphens

### `findLinkedInCompanyUrl(htmlContent: string)`
Searches HTML content for LinkedIn company URLs:
- Useful for auto-detecting LinkedIn profiles from website scrapes
- Regex-based extraction

### `categorizePeople(people: any[])`
Organizes people by seniority:
- Returns `{ executives, management, staff }`
- Based on title keywords (CEO, Manager, etc.)

## Best Practices

### 1. Finding Company IDs
- Check the company's LinkedIn page URL
- The ID is in the URL: `/company/{id}`
- Try company name in lowercase with hyphens
- Common format: `company-name` not `companyname`

### 2. Handling Rate Limits
- ScrapingDog has rate limits based on your plan
- Cache data in database to minimize API calls
- Show existing data immediately while updating in background
- Implement retry logic with exponential backoff

### 3. Privacy Considerations
- Only scrape publicly available LinkedIn data
- Respect LinkedIn's Terms of Service
- Use data responsibly for outreach purposes
- Don't store sensitive information

### 4. Error Handling
- Private company profiles may return limited data
- Some companies restrict employee visibility
- Handle missing fields gracefully (e.g., no profile photos)
- Show helpful error messages to users

## Example Use Cases

### 1. Sales Outreach
- Identify decision makers (executives)
- Find department heads for targeted pitches
- Understand company size and structure
- Personalize outreach based on roles

### 2. Partnership Development
- Find business development contacts
- Identify relevant department leads
- Research company background and focus
- Multi-threading outreach across teams

### 3. Competitive Analysis
- Understand competitor team structure
- Identify hiring patterns (growth areas)
- Track executive movements
- Benchmark team sizes

### 4. Recruitment
- Find potential candidates at target companies
- Understand team composition
- Identify hiring needs (gaps in team)
- Research company culture indicators

## Troubleshooting

### "Company not found"
- Verify the company ID is correct
- Try the company's exact LinkedIn slug
- Some companies may not have public profiles

### "No employees found"
- Company may restrict employee visibility
- Small companies may not list employees publicly
- Try enabling `premium: true` for better access

### "Rate limit exceeded"
- You've hit your ScrapingDog API limit
- Wait for limit reset or upgrade plan
- Implement caching to reduce API calls

### Slow scraping
- LinkedIn pages can be large (many employees)
- ScrapingDog processes pages server-side
- Consider adding loading indicators
- Implement background job for large companies

## Future Enhancements

Potential improvements:
- Auto-detect LinkedIn URL from website scraping
- Scrape individual employee profiles for deeper data
- Track changes over time (new hires, departures)
- Integration with email finder to match people to emails
- Org chart visualization
- Department-based filtering and search
- Export to CRM systems
- Automated periodic re-scraping

## Cost Considerations

### ScrapingDog Pricing
- Free tier: Limited requests per month
- Paid plans: Based on request volume
- Premium proxies: Additional cost
- LinkedIn pages count as company profile requests

### Optimization Tips
- Cache aggressively (data doesn't change often)
- Only rescrape when user explicitly requests
- Limit employee list to top 50 per company
- Use standard proxies first, premium only if needed

## Resources

- **ScrapingDog Docs**: https://www.scrapingdog.com/documentation
- **LinkedIn Profile API**: Check ScrapingDog's LinkedIn scraping guide
- **Rate Limits**: See your ScrapingDog dashboard
- **Support**: Contact ScrapingDog for API issues
