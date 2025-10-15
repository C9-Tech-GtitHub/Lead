# Lead Research SaaS Platform

A powerful SaaS platform for discovering, researching, and grading local businesses using AI. Built with Next.js, Supabase, and GPT-5.

## Features

- **City-Wide Business Search**: Scrape entire cities (Melbourne, Sydney, etc.) for specific business types
- **Automated Website Scraping**: Extract content from business websites, about pages, and team pages
- **AI-Powered Analysis**: GPT-5 mini analyzes businesses and provides compatibility grades (A-F)
- **Real-Time Updates**: Watch your leads being researched in real-time with Supabase Realtime
- **Smart Grading**: Get actionable insights with suggested outreach hooks, pain points, and opportunities
- **Background Processing**: Inngest handles all heavy lifting asynchronously

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Background Jobs**: Inngest
- **AI**: OpenAI GPT-5 mini
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project (free tier available - no credit card required)
- API keys for:
  - Serpdog (Google Maps scraping)
  - Firecrawl (website scraping)
  - OpenAI (GPT-5 access)
  - Inngest (optional for local dev)

> **Free Plan**: This project works perfectly on Supabase's free plan (500MB database, 2GB storage, 5GB bandwidth/month)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Lead
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   a. Create a new project at [supabase.com](https://supabase.com)

   b. Run the database schema:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Execute the SQL

   c. Enable Realtime:
   - Go to Database → Replication
   - Enable replication for `runs` and `leads` tables

4. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Update the following in `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase publishable key (new `sb_publishable_...` format recommended) or legacy anon key
   - `SCRAPINGDOG_API_KEY`: Your Serpdog API key
   - `FIRECRAWL_API_KEY`: Your Firecrawl API key
   - `OPENAI_API_KEY`: Your OpenAI API key

   > **New API Keys**: Supabase now offers improved `sb_publishable_...` keys with better security and rotation. Both new and legacy keys work until late 2026. See [SUPABASE-SETUP.md](./SUPABASE-SETUP.md) for migration details.

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Set up Inngest (for background jobs)**

   For local development:
   ```bash
   npx inngest-cli@latest dev
   ```

   This starts the Inngest Dev Server at [http://localhost:8288](http://localhost:8288)

## Usage

### Creating a Research Run

1. Sign up / Log in to the platform
2. Click "New Research Run"
3. Enter:
   - **Business Type**: e.g., "realtors", "dentists", "law firms"
   - **Location**: e.g., "Melbourne, Australia"
   - **Number of Leads**: 5-50 leads
4. Click "Start Research"

The platform will:
1. Scrape Google Maps for businesses matching your criteria
2. Extract content from each business's website
3. Analyze with GPT-5 mini following best practices
4. Grade each lead (A-F) with detailed reasoning
5. Provide outreach suggestions, pain points, and opportunities

### Viewing Results

- **Dashboard**: See all your research runs with progress and grade distribution
- **Run Details**: Click a run to see all leads with filtering by grade
- **Lead Details**: Click a lead to see full AI analysis, contact info, and actionable insights

### Real-Time Updates

All progress updates happen in real-time:
- Run status changes (pending → scraping → researching → completed)
- Progress percentage updates
- New leads appearing
- Lead analysis completions
- Grade distributions

## GPT-5 Integration

This project uses **GPT-5 mini** following best practices outlined in `GPT5-BEST-PRACTICES.md`:

- ✅ `model: 'gpt-5-mini'`
- ✅ `reasoning_effort: 'low'` - Optimal for structured tasks
- ✅ `verbosity: 'medium'` - Balanced output
- ✅ `max_completion_tokens: 2000` - Sufficient for reports
- ❌ No `temperature` or `top_p` (not supported in GPT-5)

**Cost**: ~$0.0125 per lead analyzed

See [GPT5-BEST-PRACTICES.md](./GPT5-BEST-PRACTICES.md) for detailed information.

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure environment variables (copy from `.env`)
   - Deploy

3. **Configure Inngest for Production**
   - Go to [app.inngest.com](https://app.inngest.com)
   - Create an account and project
   - Get your Event Key and Signing Key
   - Add them to Vercel environment variables:
     - `INNGEST_EVENT_KEY`
     - `INNGEST_SIGNING_KEY`
   - Register your Inngest endpoint: `https://your-domain.vercel.app/api/inngest`

4. **Update Supabase Auth Settings**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel domain to "Site URL" and "Redirect URLs"

## Project Structure

```
Lead/
├── app/                      # Next.js App Router pages
│   ├── auth/                 # Authentication pages
│   ├── dashboard/            # Main dashboard
│   │   └── runs/[id]/        # Individual run details
│   ├── api/
│   │   └── inngest/          # Inngest webhook endpoint
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/               # React components
│   ├── auth/                 # Login, signup forms
│   ├── dashboard/            # Dashboard components
│   └── runs/                 # Run and lead components
├── lib/                      # Core business logic
│   ├── supabase/             # Supabase clients
│   ├── inngest/              # Inngest functions
│   ├── scrapers/             # Google Maps & website scrapers
│   └── ai/                   # GPT-5 integration
├── supabase/
│   └── schema.sql            # Database schema
├── GPT5-BEST-PRACTICES.md    # GPT-5 implementation guide
├── .env.example              # Environment template
└── README.md
```

## Database Schema

### Tables

- **profiles**: User profiles (extends Supabase Auth)
- **runs**: Research run metadata and progress tracking
- **leads**: Individual business leads with AI analysis

See `supabase/schema.sql` for the complete schema with RLS policies.

## API Integrations

### Serpdog (Google Maps)
- Endpoint: `https://api.scrapingdog.com/google_maps`
- Used for: Scraping business listings from Google Maps
- Cost: ~$0.0025 per result

### Firecrawl
- Endpoint: `https://api.firecrawl.dev/v1/scrape`
- Used for: Extracting clean content from websites
- Cost: ~$0.001 per page

### OpenAI GPT-5
- Model: `gpt-5-mini`
- Used for: Analyzing and grading businesses
- Cost: $0.25/1M input tokens, $2.00/1M output tokens (~$0.0125 per lead)

## Troubleshooting

### "No response from GPT-5"
- Check your `OPENAI_API_KEY` is valid
- Ensure you have GPT-5 access enabled

### "Serpdog API error"
- Verify `SCRAPINGDOG_API_KEY` is correct
- Check your Serpdog account has credits

### Real-time updates not working
- Ensure Realtime is enabled in Supabase for `runs` and `leads` tables
- Check RLS policies are correctly configured

### Inngest functions not triggering
- For local dev: Ensure `npx inngest-cli dev` is running
- For production: Verify Inngest keys are set in Vercel
- Check Inngest dashboard for function logs

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## API Best Practices

We've created comprehensive best practices guides for all APIs used in this platform:

- **[API Best Practices Summary](./API-BEST-PRACTICES-SUMMARY.md)** - Quick reference for all APIs
- **[ScrapingDog Best Practices](./SCRAPINGDOG-BEST-PRACTICES.md)** - Google Maps scraping optimization
- **[Firecrawl Best Practices](./FIRECRAWL-BEST-PRACTICES.md)** - Website scraping best practices
- **[GPT-5 Best Practices](./GPT5-BEST-PRACTICES.md)** - AI analysis optimization

These guides cover:
- ✅ Optimal configuration parameters
- ✅ Cost optimization strategies
- ✅ Error handling and retries
- ✅ Rate limiting best practices
- ✅ Performance tuning
- ✅ Security considerations

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the relevant API best practices guide:
   - Google Maps issues → [SCRAPINGDOG-BEST-PRACTICES.md](./SCRAPINGDOG-BEST-PRACTICES.md)
   - Website scraping issues → [FIRECRAWL-BEST-PRACTICES.md](./FIRECRAWL-BEST-PRACTICES.md)
   - AI analysis issues → [GPT5-BEST-PRACTICES.md](./GPT5-BEST-PRACTICES.md)
3. Check [API-BEST-PRACTICES-SUMMARY.md](./API-BEST-PRACTICES-SUMMARY.md) for quick reference
4. Open an issue on GitHub

---

Built with ❤️ using Next.js, Supabase, and GPT-5
