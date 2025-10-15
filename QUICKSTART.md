# Quick Start Guide

Get your Lead Research SaaS running locally in under 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Terminal/command line access

## 1. Clone & Install (2 minutes)

```bash
cd /Users/merrickallen/Documents/GitHub/Lead
npm install
```

## 2. Set Up Supabase (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a **free project** (no credit card required)
2. In Supabase dashboard → **SQL Editor**, paste contents of `supabase/schema.sql` and run it
3. Go to **Database** → **Replication** and enable Realtime for `runs` and `leads` tables
4. Go to **Settings** → **API** and copy your credentials:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **API Key**: Use the new **Publishable key** (`sb_publishable_...`) or legacy **anon key** (JWT format)

> **Note**: Supabase is transitioning to new API keys. Both the new `sb_publishable_...` keys and legacy `anon` keys work. New keys offer better security with zero-downtime rotation. Migration recommended by November 2025. See [SUPABASE-SETUP.md](./SUPABASE-SETUP.md) for details.

## 3. Configure Environment (2 minutes)

Update your `.env` file with Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# Use new publishable key (recommended) OR legacy anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx  # New format (recommended)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...           # Legacy format (still works)
```

Your other API keys are already configured:
- ✅ Serpdog (Google Maps scraping)
- ✅ Firecrawl (website scraping)
- ✅ OpenAI (AI analysis)

> **Free Tier Note**: Supabase free plan includes 500MB database, 2GB file storage, and 5GB bandwidth - perfect for testing!

## 4. Run Development Server (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Start Inngest Dev Server (30 seconds)

In a new terminal window:

```bash
npx inngest-cli@latest dev
```

This runs the background job processor at [http://localhost:8288](http://localhost:8288)

## 6. Test It Out! (2 minutes)

1. Sign up at http://localhost:3000
2. Create a new research run:
   - Business type: `cafes`
   - Location: `Melbourne, Australia`
   - Leads: `5`
3. Watch the magic happen in real-time!

## What Happens Next?

The platform will:
1. 🔍 Scrape Google Maps for cafes in Melbourne
2. 🌐 Visit each business's website
3. 🤖 Analyze with AI (GPT-4o-mini)
4. 📊 Grade each lead A-F
5. 💡 Provide outreach suggestions

All updates happen in real-time on your dashboard!

## Troubleshooting

### "Invalid login credentials"
- Check your Supabase URL and anon key in `.env`
- Ensure you ran the schema SQL in Supabase

### "Inngest functions not running"
- Make sure `npx inngest-cli dev` is running
- Check terminal for Inngest logs

### "No leads appearing"
- Verify API keys in `.env` are valid
- Check Inngest dashboard at http://localhost:8288 for errors

## Next Steps

- Read [README.md](./README.md) for full documentation
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to production
- Check [GPT5-BEST-PRACTICES.md](./GPT5-BEST-PRACTICES.md) for AI optimization

## Architecture Overview

```
User creates run
      ↓
Inngest workflow triggered
      ↓
1. Scrape Google Maps → Find businesses
      ↓
2. Save leads to Supabase
      ↓
3. For each lead:
   - Scrape website (Firecrawl)
   - Analyze with AI (OpenAI)
   - Save results
      ↓
4. Real-time updates via Supabase
      ↓
User sees results live!
```

## File Structure

```
Lead/
├── app/                    # Next.js pages
│   ├── auth/              # Login, signup
│   ├── dashboard/         # Main dashboard
│   └── api/inngest/       # Background jobs endpoint
├── components/            # React components
├── lib/                   # Core logic
│   ├── supabase/         # Database client
│   ├── inngest/          # Job definitions
│   ├── scrapers/         # Google Maps & website scrapers
│   └── ai/               # GPT integration
├── supabase/schema.sql   # Database schema
└── .env                  # Your API keys
```

## API Keys You Need

Your `.env` already has:
- ✅ `SCRAPINGDOG_API_KEY` (Google Maps)
- ✅ `FIRECRAWL_API_KEY` (Website scraping)
- ✅ `OPENAI_API_KEY` (AI analysis)

You need to add:
- 📝 `NEXT_PUBLIC_SUPABASE_URL`
- 📝 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Cost Per Lead

Approximate costs:
- Google Maps scraping: $0.0025
- Website scraping: $0.001
- AI analysis: $0.015
- **Total**: ~$0.02 per lead

Processing 50 leads = ~$1.00

## Support

Having issues? Check:
1. All API keys are set correctly
2. Supabase schema is created
3. Both dev servers are running
4. Browser console for errors

---

**You're all set!** Start finding and grading leads with AI. 🚀
