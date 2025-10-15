# Supabase Setup Guide

Complete guide for setting up Supabase with your Lead Research SaaS platform, including the new API key format and free tier details.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Free Tier Details](#free-tier-details)
3. [Creating Your Project](#creating-your-project)
4. [Understanding API Keys](#understanding-api-keys)
5. [API Key Migration Guide](#api-key-migration-guide)
6. [Database Setup](#database-setup)
7. [Realtime Configuration](#realtime-configuration)
8. [Authentication Setup](#authentication-setup)
9. [Troubleshooting](#troubleshooting)

## Quick Start

**TL;DR**: Create free project → Run schema → Enable Realtime → Copy new `sb_publishable_...` key → Done!

```bash
# 1. Visit https://supabase.com and create a free project
# 2. Run supabase/schema.sql in SQL Editor
# 3. Enable Realtime for runs and leads tables
# 4. Copy Project URL and Publishable key (sb_publishable_...)
# 5. Add to .env:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

## Free Tier Details

Supabase offers a generous free tier perfect for development and small-scale production:

### What's Included (Free Forever)

- **Database**: 500 MB PostgreSQL database
- **Storage**: 2 GB file storage
- **Bandwidth**: 5 GB bandwidth per month
- **Realtime**: Unlimited WebSocket connections
- **Authentication**: Unlimited users
- **API Requests**: Unlimited
- **Edge Functions**: 500k invocations/month
- **Daily Backups**: Not included (manual export only)

### Is It Enough?

**Yes!** For this Lead Research SaaS:

- **Database**: Each lead is ~5KB. 500MB = ~100,000 leads
- **Bandwidth**: Perfect for 100-1000 monthly active users
- **Realtime**: Unlimited connections for live updates
- **Auth**: Unlimited users

### When to Upgrade

Consider upgrading to Pro ($25/month) when you need:
- Daily automatic backups
- More than 500 MB database storage
- More than 5 GB bandwidth/month
- Priority support

## Creating Your Project

### Step 1: Sign Up

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. **No credit card required** for free tier

### Step 2: Create Organization

1. Enter an organization name (e.g., "My Company")
2. Choose "Free" plan
3. Click "Create Organization"

### Step 3: Create Project

1. Click "New Project"
2. Enter project details:
   - **Name**: `lead-research` (or your choice)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free
3. Click "Create new project"
4. Wait 2-3 minutes for project initialization

## Understanding API Keys

Supabase is transitioning from JWT-based keys to new, more secure API keys.

### API Key Types

| Type | Format | Privileges | Use Case | Status |
|------|--------|-----------|----------|--------|
| **Publishable key** | `sb_publishable_...` | Low | Frontend apps, mobile apps, CLIs | **New (Recommended)** |
| **Secret key** | `sb_secret_...` | Elevated | Backend servers, Edge Functions | **New (Recommended)** |
| **anon key** | JWT (long) | Low | Frontend apps | Legacy (until late 2026) |
| **service_role key** | JWT (long) | Elevated | Backend servers | Legacy (until late 2026) |

### Why the Change?

The new API keys offer significant improvements:

1. **Zero-downtime rotation** - Rotate keys without app downtime
2. **Instant revocation** - Delete compromised keys immediately
3. **Individual tracking** - See which key is used in Audit Logs
4. **Better security** - Shorter keys, no JWT parsing vulnerabilities
5. **Browser safety** - Secret keys blocked in browsers (prevents leaks)
6. **Longer connections** - Realtime connections last 24 hours

### Which Key Should I Use?

**For this Lead Research SaaS**: Use the **Publishable key** (`sb_publishable_...`)

This is a frontend application that uses Row Level Security (RLS) for data access control, so the publishable key (low privilege) is perfect.

## API Key Migration Guide

### Current Status (2025)

- ✅ **Early access**: New API keys available on all projects
- ✅ **Both work**: Legacy and new keys work side-by-side
- ⚠️ **Migration recommended**: Before November 2025
- 🔴 **Legacy removal**: Late 2026 (TBC)

### Migration Timeline

| Date | Event | Action Needed |
|------|-------|---------------|
| **June 2025** | Early preview launched | Try new keys (optional) |
| **July 2025** | Full feature launch | Migrate recommended |
| **November 2025** | Monthly migration reminders begin | Highly encouraged to migrate |
| **Late 2026** | Legacy keys removed | **Must migrate** |

### How to Get New API Keys

#### Option 1: Automatic Generation (New Projects)

New projects automatically get both legacy and new keys.

#### Option 2: Manual Generation (Existing Projects)

1. Go to Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Look for "New API Keys" section
4. Click "Generate Publishable Key"
5. Copy the `sb_publishable_...` key

### Migration Steps

#### For Development

1. **Get new key**: Copy `sb_publishable_...` from Settings → API
2. **Update .env**: Replace old key with new key
   ```env
   # Before
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

   # After
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
   ```
3. **Test locally**: `npm run dev` and verify everything works
4. **No code changes needed**: Supabase client libraries support both formats

#### For Production

1. **Get new key**: Copy `sb_publishable_...` from Settings → API
2. **Update Vercel env vars**:
   - Go to Vercel → Project Settings → Environment Variables
   - Edit `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Replace with new `sb_publishable_...` key
   - Save changes
3. **Redeploy**: Trigger a new deployment
4. **Test production**: Verify login, data access, and Realtime work

#### Rollback Plan

If issues occur:
1. Switch back to legacy key in environment variables
2. Redeploy
3. Report issues to Supabase: https://github.com/supabase/supabase/discussions/29260

### Compatibility

The new API keys are compatible with:
- ✅ All versions of Supabase client libraries
- ✅ supabase-js v2.x and newer
- ✅ All authentication flows
- ✅ Row Level Security (RLS)
- ✅ Realtime subscriptions
- ✅ Storage uploads/downloads

## Database Setup

### Step 1: Access SQL Editor

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"

### Step 2: Run Schema

1. Open `supabase/schema.sql` in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click "Run" or press `Cmd/Ctrl + Enter`

### What Gets Created

The schema creates:

#### Tables
- **profiles**: User profiles (extends auth.users)
- **runs**: Research run metadata and progress
- **leads**: Individual business leads with AI analysis

#### Row Level Security (RLS)
- Users can only read/write their own data
- Automatic user_id assignment via triggers

#### Indexes
- Optimized queries for `user_id`, `status`, `grade`
- Fast lookups for common dashboard queries

#### Triggers
- Automatic timestamps (created_at, updated_at)
- Auto-profile creation on user signup

### Step 3: Verify Schema

1. Go to **Database** → **Tables**
2. Confirm you see: `profiles`, `runs`, `leads`
3. Click on each table to verify columns

## Realtime Configuration

Realtime enables live updates in your dashboard without polling.

### Enable Realtime

1. Go to **Database** → **Replication**
2. Find **runs** table
3. Toggle **Realtime** to **ON**
4. Find **leads** table
5. Toggle **Realtime** to **ON**

### What This Enables

- ✅ Live progress bar updates
- ✅ New leads appearing instantly
- ✅ Grade distribution updates in real-time
- ✅ Status changes without page refresh

### Realtime Limitations (New API Keys)

With the new API keys:
- Connections last **24 hours** when no user is signed in
- Connections last **indefinitely** when user is signed in
- This is a security improvement (legacy keys had no limit)

**For this app**: No impact, since users are always signed in when viewing dashboards.

## Authentication Setup

### Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email settings:
   - **Enable Email Confirmations**: OFF (for development)
   - **Secure Email Change**: ON (recommended)
   - **Enable Phone Confirmations**: OFF

### Configure Auth URLs

**For Development:**
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000`
3. Add to **Redirect URLs**: `http://localhost:3000/**`

**For Production:**
1. Set **Site URL**: `https://your-domain.vercel.app`
2. Add to **Redirect URLs**: `https://your-domain.vercel.app/**`

### Email Templates (Optional)

Customize email templates at **Authentication** → **Email Templates**:
- Confirmation email
- Reset password email
- Magic link email

## Troubleshooting

### "Invalid login credentials"

**Cause**: Incorrect Supabase URL or API key

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` matches your project URL
2. Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct (check for extra spaces)
3. Restart dev server: `npm run dev`

### "Schema not found"

**Cause**: Schema SQL not executed

**Solution**:
1. Go to **SQL Editor** in Supabase
2. Copy and paste entire contents of `supabase/schema.sql`
3. Run the query
4. Verify tables exist: **Database** → **Tables**

### "Realtime not working"

**Cause**: Realtime not enabled for tables

**Solution**:
1. Go to **Database** → **Replication**
2. Enable Realtime for `runs` table
3. Enable Realtime for `leads` table
4. Refresh your app

### "Row Level Security policy violation"

**Cause**: User not properly authenticated or RLS policies not set up

**Solution**:
1. Verify user is logged in
2. Check that schema was executed correctly
3. Verify RLS policies exist: **Authentication** → **Policies**
4. Make sure `user_id` column matches `auth.uid()`

### "New API keys not visible"

**Cause**: Early access not yet available on your project

**Solution**:
1. New keys rolling out to all projects by July 2025
2. Use legacy `anon` key until then (it works fine!)
3. Check back in Settings → API in a few weeks

### "Connection limit exceeded"

**Cause**: Too many database connections (free tier: 60 connections)

**Solution**:
1. Check for connection leaks in your code
2. Ensure Supabase clients are reused (not created per request)
3. Consider upgrading to Pro for 200 connections

### "Storage limit exceeded"

**Cause**: Database over 500MB (free tier limit)

**Solution**:
1. Check database size: **Database** → **Database** → Size shown at top
2. Clean up old or test data
3. Consider upgrading to Pro ($25/month for 8GB)

## Best Practices

### Security

1. ✅ Always use RLS policies (included in schema)
2. ✅ Use new `sb_publishable_...` keys when available
3. ✅ Never expose `service_role` or `sb_secret_...` keys in frontend
4. ✅ Rotate API keys if compromised
5. ✅ Enable email confirmation in production

### Performance

1. ✅ Use Realtime for live updates (not polling)
2. ✅ Index commonly queried columns (included in schema)
3. ✅ Use `.select('column1, column2')` to fetch only needed fields
4. ✅ Implement pagination for large result sets

### Cost Management

1. ✅ Monitor database size: **Database** → **Database**
2. ✅ Monitor bandwidth: **Project Settings** → **Usage**
3. ✅ Delete old test data regularly
4. ✅ Optimize queries to reduce bandwidth

### Development

1. ✅ Use local development environment (this setup)
2. ✅ Test new API keys in development first
3. ✅ Keep schema files in version control
4. ✅ Use migrations for schema changes (Supabase CLI)

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **API Key Migration Discussion**: https://github.com/supabase/supabase/discussions/29260
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Community Discord**: https://discord.supabase.com
- **Client Libraries**: https://supabase.com/docs/reference/javascript/introduction

## Support

Having issues?

1. Check this troubleshooting section above
2. Review [QUICKSTART.md](./QUICKSTART.md) for basic setup
3. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production issues
4. Check Supabase Dashboard logs: **Logs Explorer**
5. Post in Supabase Discord: https://discord.supabase.com

## Summary

- ✅ Use Supabase **free tier** for development and small production
- ✅ Use new **`sb_publishable_...`** keys when available (recommended)
- ✅ Legacy `anon` keys work until late 2026 (migration recommended by Nov 2025)
- ✅ Enable **Realtime** for `runs` and `leads` tables
- ✅ Run **schema.sql** to set up database with RLS
- ✅ Configure **Auth URLs** for your environment
- ✅ Monitor **usage** to stay within free tier limits

---

**You're all set!** Your Supabase backend is ready for real-time lead research. 🚀
