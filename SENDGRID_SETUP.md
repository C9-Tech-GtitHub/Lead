# SendGrid Integration Setup Guide

This guide walks you through setting up the **read-only** SendGrid integration for email tracking and suppression list management.

## Important Safety Notice

🔒 **THIS INTEGRATION NEVER SENDS EMAILS**

- We only READ data from SendGrid
- You manually send emails through SendGrid UI
- Our app syncs bounce/unsubscribe data to prevent future contact with suppressed emails
- 6-month contact cadence is enforced per domain

---

## Step 1: Create SendGrid Account

1. Go to [SendGrid Sign Up](https://signup.sendgrid.com/)
2. Choose the **Free Plan** (up to 100 emails/day for 60 days)
3. Complete email verification
4. Enable **Two-Factor Authentication** (required)

---

## Step 2: Create Read-Only API Key

**CRITICAL: Follow these steps exactly to create a safe, read-only API key**

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `Lead App - Read Only`
5. Select **Restricted Access**

### Configure Permissions (IMPORTANT)

Set these permissions **exactly**:

#### ✅ READ Access (Enable these):
- **Suppressions** → Read Access
- **Stats** → Read Access (optional)
- **Email Activity** → Read Access (optional)

#### ✅ WRITE Access (Only ONE):
- **Suppressions** → Full Access (to add emails to suppression list)

#### ❌ BLOCKED (NEVER enable these):
- **Mail Send** → **No Access** ⚠️ CRITICAL
- **Templates** → No Access
- **Marketing Campaigns** → No Access
- **API Keys** → No Access
- **Teammates** → No Access

6. Click **Create & View**
7. **COPY THE API KEY** - you'll only see it once!

---

## Step 3: Add API Key to Your App

1. Open your `.env.local` file
2. Add this line:

```bash
SENDGRID_API_KEY=SG.your_actual_api_key_here
```

3. Save the file
4. Restart your development server:

```bash
npm run dev
```

---

## Step 4: Install SendGrid Client Package

```bash
npm install --save @sendgrid/client
```

**DO NOT install @sendgrid/mail** - that package is for sending emails, which we never do.

---

## Step 5: Run Database Migration

Apply the email tracking schema to your Supabase database:

```bash
npm run migrate
```

Or manually run the migration:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rnbqqwmbblykvriitgxf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npx tsx scripts/run-migration.ts
```

Then apply the SendGrid migration:

```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/add_sendgrid_email_tracking.sql
```

This creates:
- `email_suppression` table
- `email_send_history` table
- `domain_contact_tracking` table
- `sendgrid_sync_log` table
- Adds email tracking columns to `leads` table
- Inserts 4 permanent suppression emails

---

## Step 6: Verify Setup

### Check Database Tables

In Supabase SQL Editor:

```sql
-- Check suppression list was created
SELECT * FROM email_suppression;

-- Should show 4 permanent emails:
-- info@unlimitedroofing.com.au
-- sales@swiftaircon.com.au
-- contactus@ritepartyhire.com.au
-- info@instantcanopy.com.au
```

### Test API Connection

```bash
# Test the sync endpoint
curl -X POST http://localhost:3000/api/sendgrid/sync
```

You should see a response like:

```json
{
  "success": true,
  "message": "SendGrid sync completed",
  "results": {
    "bounces": { "synced": 0, "errors": 0 },
    "unsubscribes": { "synced": 0, "errors": 0 }
  }
}
```

---

## Step 7: Add Permanent Suppression Emails to SendGrid

To ensure these emails are never contacted, also add them to SendGrid:

1. Go to SendGrid dashboard
2. Navigate to **Suppressions** → **Global Unsubscribes**
3. Click **Add Email to Global Unsubscribe List**
4. Add each email:
   - info@unlimitedroofing.com.au
   - sales@swiftaircon.com.au
   - contactus@ritepartyhire.com.au
   - info@instantcanopy.com.au

---

## How to Use

### 1. Manual Sync (Pull Data from SendGrid)

Navigate to the Suppression Manager page:

```
http://localhost:3000/dashboard/sendgrid
```

Click **"Sync SendGrid Data"** to:
- Pull bounces from last 30 days
- Pull unsubscribes from last 30 days
- Update local database
- Mark affected leads as suppressed

### 2. Check Email Before Contacting

Use the email checker:

1. Enter email address
2. Click "Check"
3. See if email is safe to contact

The checker will tell you:
- ✅ Email is safe to contact
- ❌ Email is suppressed (with reason)
- ⚠️ Domain was contacted recently (6 month cadence)

### 3. Export Leads for Manual Email Campaign

When exporting leads, the system will automatically:
- Filter out suppressed emails
- Filter out domains contacted in last 6 months
- Mark emails as `can_contact: true/false`

You then manually:
1. Download CSV of safe-to-contact leads
2. Upload to SendGrid contacts
3. Create campaign in SendGrid UI
4. Manually send email
5. Next day, run sync to update your database

---

## Workflow Example

### Week 1: Initial Outreach

1. **Export leads** from your app
   - App filters out suppressed emails
   - App filters out recently contacted domains (6 months)
   - CSV includes only safe-to-contact leads

2. **Manual SendGrid campaign** (YOU do this)
   - Upload CSV to SendGrid
   - Create email campaign in SendGrid UI
   - Review and send manually
   - SendGrid tracks sends/bounces/unsubscribes

3. **Next day: Sync back**
   - Click "Sync SendGrid Data" in your app
   - Bounces are added to suppression list
   - Unsubscribes are added to suppression list
   - Domains are marked as contacted (6 month timer starts)

### 6 Months Later: Follow-up Campaign

1. **Export leads again**
   - App now allows contacting domains from 6+ months ago
   - Still filters out bounces/unsubscribes
   
2. **Repeat manual campaign**

---

## Monitoring & Maintenance

### Weekly Tasks

1. Run manual sync after any email campaign
2. Review sync logs:

```sql
SELECT * FROM sendgrid_sync_log
ORDER BY created_at DESC
LIMIT 10;
```

### Monthly Tasks

1. Review suppression list growth:

```sql
SELECT source, COUNT(*) 
FROM email_suppression 
GROUP BY source;
```

2. Check domain contact stats:

```sql
SELECT 
  COUNT(*) as total_domains,
  COUNT(*) FILTER (WHERE can_contact_after > NOW()) as on_cooldown,
  COUNT(*) FILTER (WHERE can_contact_after <= NOW()) as can_contact
FROM domain_contact_tracking;
```

---

## Troubleshooting

### API Key Errors

**Error:** `SENDGRID_API_KEY environment variable is not set`

**Fix:** 
- Check `.env.local` has `SENDGRID_API_KEY=SG...`
- Restart dev server: `npm run dev`

---

### Permission Denied Errors

**Error:** `403 Forbidden` when syncing

**Fix:**
- Verify API key has **Suppressions - Read Access**
- Regenerate API key with correct permissions

---

### No Data Synced

**Issue:** Sync returns 0 records

**Possible causes:**
- No bounces/unsubscribes in last 30 days (normal if you haven't sent emails)
- Check SendGrid dashboard to verify you have sent emails
- Try checking a specific email with the email checker

---

### Migration Failed

**Error:** Database migration errors

**Fix:**
```bash
# Check Supabase connection
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('leads').select('count');
console.log(data, error);
"
```

---

## Security Best Practices

1. **Never commit API keys** to git
   - `.env.local` is in `.gitignore`
   - Keep API keys secret

2. **Rotate API keys monthly**
   - Create new key in SendGrid
   - Update `.env.local`
   - Delete old key

3. **Monitor sync logs**
   - Check for failed syncs
   - Investigate errors immediately

4. **Review suppression list**
   - Audit manual additions
   - Ensure permanent suppressions stay suppressed

---

## API Endpoints

### POST /api/sendgrid/sync
Manually sync bounces and unsubscribes from SendGrid

**Request:**
```bash
curl -X POST http://localhost:3000/api/sendgrid/sync
```

**Response:**
```json
{
  "success": true,
  "results": {
    "bounces": { "synced": 5, "errors": 0 },
    "unsubscribes": { "synced": 2, "errors": 0 }
  }
}
```

---

### POST /api/sendgrid/check-suppression
Check if an email can be contacted

**Request:**
```bash
curl -X POST http://localhost:3000/api/sendgrid/check-suppression \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Response:**
```json
{
  "email": "test@example.com",
  "domain": "example.com",
  "canContact": true,
  "suppression": {
    "isSuppressed": false
  },
  "cadence": {
    "canContact": true
  }
}
```

---

## Files Created

```
supabase/migrations/
  └── add_sendgrid_email_tracking.sql   # Database schema

lib/sendgrid/
  └── client.ts                         # Read-only API client

app/api/sendgrid/
  ├── sync/route.ts                     # Manual sync endpoint
  └── check-suppression/route.ts        # Email checker endpoint

components/sendgrid/
  └── suppression-manager.tsx           # UI component

SENDGRID_SAFETY_RULES.md                # Safety guidelines
SENDGRID_SETUP.md                       # This file
```

---

## Questions?

If you encounter issues:

1. Check the safety rules: `SENDGRID_SAFETY_RULES.md`
2. Review sync logs in database
3. Verify API key permissions in SendGrid dashboard
4. Ensure `.env.local` is loaded

---

**Last Updated:** 2025-10-23  
**Contact Cadence:** 6 months  
**Safety Status:** ✅ Read-only, never sends emails
