# Vercel Deployment Guide

## Quick Start

### 1. Install Vercel CLI (Optional but Recommended)
```bash
npm i -g vercel
```

### 2. Deploy from CLI
```bash
vercel
```

Or for production:
```bash
vercel --prod
```

### 3. Deploy from GitHub (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Click "Deploy"

---

## Environment Variables Setup

**CRITICAL:** You must configure these environment variables in Vercel Dashboard:

### Required Variables

Go to: Project Settings → Environment Variables

Add the following variables for **Production**, **Preview**, and **Development** environments:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://rnbqqwmbblykvriitgxf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### API Keys
```
SCRAPINGDOG_API_KEY=your-scrapingdog-api-key
FIRECRAWL_API_KEY=your-firecrawl-api-key
OPENAI_API_KEY=your-openai-api-key
ABN_LOOKUP_API_KEY=your-abn-lookup-guid
HUNTER_API_KEY=your-hunter-api-key
```

#### Inngest Configuration
```
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key
```

**Note:** Get your Inngest keys from https://app.inngest.com after connecting your Vercel project

---

## Post-Deployment Configuration

### 1. Configure Inngest

After your first deployment:

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Click "Apps" → "Connect App"
3. Select your Vercel project or enter your deployment URL
4. The URL should be: `https://your-app.vercel.app/api/inngest`
5. Inngest will automatically sync and provide your signing keys
6. Add the signing keys to Vercel environment variables
7. Redeploy for the keys to take effect

### 2. Update Supabase Configuration

In your Supabase dashboard:

1. Go to Authentication → URL Configuration
2. Add your Vercel deployment URL to "Site URL"
3. Add `https://your-app.vercel.app/**` to "Redirect URLs"

### 3. Configure CORS (if needed)

If you have CORS issues, update your API routes or Supabase settings to allow your Vercel domain.

---

## Vercel Configuration

Your `vercel.json` is already configured:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## Deployment Checklist

- [ ] Push latest code to GitHub
- [ ] Connect GitHub repository to Vercel
- [ ] Add all environment variables in Vercel Dashboard
- [ ] Deploy to production
- [ ] Configure Inngest with deployment URL
- [ ] Add Inngest signing keys to Vercel
- [ ] Update Supabase redirect URLs
- [ ] Test the deployment
- [ ] Monitor build logs for any errors

---

## Troubleshooting

### Build Fails
- Check Vercel build logs for errors
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Functions Timeout
- Vercel has a 10s timeout on Hobby plan, 60s on Pro
- Consider upgrading if your functions need more time
- Or refactor long-running tasks to use background jobs

### Inngest Not Working
- Verify Inngest signing keys are correct
- Check that `/api/inngest` endpoint is accessible
- Review Inngest dashboard for error logs
- Make sure you redeploy after adding Inngest keys

### Environment Variables Not Loading
- Ensure variables are set for correct environment (Production/Preview/Development)
- Redeploy after adding new variables
- Check for typos in variable names

---

## Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy to **Preview** on every push to non-main branches
- Deploy to **Production** on every push to `main` branch

To disable auto-deployment:
- Go to Project Settings → Git
- Toggle off automatic deployments

---

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Update Supabase and Inngest configurations with new domain

---

## Monitoring & Logs

- **Build Logs:** Available in Deployments tab
- **Function Logs:** Go to Project → Logs
- **Analytics:** Available in Analytics tab (Pro plan)
- **Speed Insights:** Enable in Project Settings

---

## Cost Considerations

**Vercel Pricing:**
- **Hobby (Free):** 100GB bandwidth, 6000 build minutes/month
- **Pro ($20/month):** More bandwidth, longer function timeout, better analytics

**API Costs (as configured in your app):**
- Serpdog/Scrapingdog: ~$0.0025 per search
- Firecrawl: ~$0.001 per page
- OpenAI GPT-4: Variable based on tokens
- Hunter.io: 25 free requests/month, then paid
- ABN Lookup: FREE
- Supabase: Free tier up to 500MB DB
- Inngest: Free tier available

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Inngest Docs:** https://www.inngest.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
