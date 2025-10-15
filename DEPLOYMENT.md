# Deployment Guide

This guide walks you through deploying your Lead Research SaaS platform to production.

## Prerequisites

Before deploying, ensure you have:
- ✅ A GitHub account (for version control)
- ✅ A Vercel account (for hosting - free tier available)
- ✅ A Supabase project (for database and auth - free tier available, no credit card required)
- ✅ An Inngest account (for background jobs - 50k runs/month free)
- ✅ API keys for all services (Serpdog, Firecrawl, OpenAI)

> **Free Tier Friendly**: This entire stack can run on free tiers for development and small-scale production!

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose an organization and enter project details
4. Wait for the project to be created

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute

This will create:
- `profiles` table (user profiles)
- `runs` table (research runs)
- `leads` table (individual leads)
- RLS policies for security
- Triggers for automatic updates

### 1.3 Enable Realtime

1. Go to **Database** → **Replication**
2. Find the `runs` table and toggle **Realtime** to ON
3. Find the `leads` table and toggle **Realtime** to ON

### 1.4 Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_...` - recommended) OR **anon public** key (legacy JWT format)

> **Important**: Supabase is transitioning to new API keys. Use the new `sb_publishable_...` format for improved security with zero-downtime rotation. Legacy keys still work but migration is recommended by November 2025. See [SUPABASE-SETUP.md](./SUPABASE-SETUP.md) for details.

### 1.5 Configure Auth URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your production domain to:
   - **Site URL**: `https://your-domain.vercel.app`
   - **Redirect URLs**: `https://your-domain.vercel.app/**`

## Step 2: Set Up Inngest

### 2.1 Create Inngest Account

1. Go to [app.inngest.com](https://app.inngest.com)
2. Sign up or log in
3. Create a new project

### 2.2 Get Event Keys

1. Go to your project settings
2. Copy:
   - **Event Key** (starts with `inngest_`)
   - **Signing Key** (starts with `signkey_`)

### 2.3 Test Locally (Optional)

```bash
npx inngest-cli@latest dev
```

This starts a local Inngest dev server at http://localhost:8288

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Lead Research SaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 3.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - Leave build settings as default

### 3.3 Add Environment Variables

In Vercel project settings, add these environment variables:

#### Required - Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# Use new publishable key (recommended) OR legacy anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx  # New format (recommended)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...           # Legacy format (still works)
```

#### Required - API Keys
```
SCRAPINGDOG_API_KEY=your-serpdog-api-key
FIRECRAWL_API_KEY=your-firecrawl-api-key
OPENAI_API_KEY=your-openai-api-key
```

#### Required - Inngest (Production)
```
INNGEST_EVENT_KEY=inngest_xxxxx
INNGEST_SIGNING_KEY=signkey_xxxxx
```

### 3.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 4: Register Inngest Endpoint

After your Vercel deployment is live:

1. Go to [app.inngest.com](https://app.inngest.com)
2. Navigate to your project → **Apps**
3. Click "Register App"
4. Enter your Inngest endpoint:
   ```
   https://your-project.vercel.app/api/inngest
   ```
5. Click "Register"

Inngest will verify the endpoint and sync your functions.

## Step 5: Verify Deployment

### 5.1 Test Authentication

1. Visit your deployed site
2. Click "Sign Up"
3. Create an account
4. Check if you're redirected to the dashboard

### 5.2 Test Lead Research

1. Click "New Research Run"
2. Enter:
   - Business type: "cafes"
   - Location: "Collingwood, VIC, Australia"
   - Leads: 5
3. Click "Start Research"
4. Watch the real-time progress
5. Check Inngest dashboard for function executions

### 5.3 Verify Real-time Updates

- Progress bar should update live
- Leads should appear as they're processed
- Grade counts should update automatically

## Troubleshooting

### Build Fails

**Error**: Missing environment variables
- **Solution**: Ensure all required env vars are set in Vercel

**Error**: Type errors
- **Solution**: Run `npm run build` locally first to catch issues

### Authentication Not Working

**Error**: "Invalid login credentials"
- **Solution**: Check Supabase URL and anon key are correct
- Verify RLS policies are enabled

**Error**: Redirect loop after login
- **Solution**: Add your Vercel domain to Supabase Auth URLs

### Inngest Functions Not Running

**Error**: Functions don't trigger
- **Solution**: Verify Inngest endpoint is registered
- Check Event Key and Signing Key in Vercel
- View logs in Inngest dashboard

**Error**: "Invalid signature"
- **Solution**: Ensure Signing Key matches between Vercel and Inngest

### Scraping Fails

**Error**: Google Maps returns no results
- **Solution**: Check Serpdog API key has credits
- Verify query format: "business type in Location"

**Error**: Website scraping fails
- **Solution**: Check Firecrawl API key is valid
- Some websites may block scrapers

### Real-time Updates Not Working

**Error**: Progress doesn't update live
- **Solution**: Verify Realtime is enabled in Supabase
- Check browser console for WebSocket errors

## Performance Optimization

### 1. Database Indexing

The schema includes indexes on:
- `runs.user_id`
- `runs.status`
- `leads.run_id`
- `leads.compatibility_grade`

Monitor query performance in Supabase → Database → Logs

### 2. Caching

Consider adding:
- API response caching (Vercel Edge Cache)
- Database query caching (Supabase Realtime)

### 3. Rate Limiting

Implement rate limiting for:
- Creating new runs (prevent abuse)
- API calls to external services (stay within limits)

### 4. Cost Monitoring

Track costs for:
- **Supabase**: Database size, bandwidth
- **Vercel**: Function executions, bandwidth
- **Inngest**: Function runs (first 50k/month free)
- **Serpdog**: API calls (~$0.0025 per result)
- **Firecrawl**: Page scrapes (~$0.001 per page)
- **OpenAI**: Token usage (~$0.015 per lead)

Expected cost per lead: ~$0.02

## Scaling

### Handling More Traffic

1. **Upgrade Supabase plan** for more connections
2. **Increase Inngest concurrency** in function config
3. **Add API caching** to reduce external calls

### Processing More Leads

1. Adjust `concurrency` limit in Inngest functions
2. Implement queue batching for large runs
3. Consider regional deployment for lower latency

## Monitoring

### Key Metrics to Track

1. **User signups** (Supabase → Auth → Users)
2. **Runs created** (Supabase → Database → runs table)
3. **Function executions** (Inngest dashboard)
4. **API errors** (Vercel → Logs)
5. **Build times** (Vercel → Deployments)

### Set Up Alerts

- **Vercel**: Enable Slack/Discord notifications for failed deploys
- **Inngest**: Set up alerts for function failures
- **Supabase**: Monitor database size approaching limits

## Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Environment variables secured in Vercel
- ✅ API keys rotated regularly
- ✅ Auth URLs configured in Supabase
- ✅ HTTPS enforced (automatic with Vercel)
- ✅ Rate limiting implemented (recommended)

## Backup Strategy

### Database Backups

Supabase automatically backs up your database:
- **Paid plans**: Daily backups with point-in-time recovery
- **Free plan**: No automatic backups (manual exports recommended)

To manually export:
```bash
# From Supabase dashboard
Database → Backups → Export
```

## Custom Domain (Optional)

To use your own domain:

1. In Vercel → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update Supabase Auth URLs with new domain

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review Inngest function logs
3. Check Supabase query logs
4. Review this deployment guide

---

## Quick Reference

### Production URLs
- **App**: https://your-project.vercel.app
- **Inngest Endpoint**: https://your-project.vercel.app/api/inngest
- **Supabase**: https://xxxxx.supabase.co

### Commands
```bash
# Local development
npm run dev

# Local Inngest dev server
npx inngest-cli@latest dev

# Build for production
npm run build

# Deploy to Vercel
git push origin main
```

### Environment Variables Required
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SCRAPINGDOG_API_KEY`
- ✅ `FIRECRAWL_API_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `INNGEST_EVENT_KEY`
- ✅ `INNGEST_SIGNING_KEY`

---

**Congratulations!** Your Lead Research SaaS is now live in production. 🚀
