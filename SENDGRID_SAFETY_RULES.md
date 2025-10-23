# SendGrid Integration - Safety Rules & Guidelines

## Core Safety Principle
**THIS APP NEVER SENDS EMAILS AUTOMATICALLY**

SendGrid integration is **READ-ONLY** - we only sync data, never send.

---

## Integration Purpose

### What We DO:
1. ✅ Check suppression lists before you manually send emails
2. ✅ Sync bounce/unsubscribe data to mark leads as invalid
3. ✅ Track send history (when YOU sent emails via SendGrid)
4. ✅ Prevent duplicate outreach to same domain
5. ✅ Maintain permanent suppression list

### What We DON'T DO:
1. ❌ Send emails automatically
2. ❌ Use SendGrid's email sending API
3. ❌ Bulk email operations
4. ❌ Any write operations to SendGrid (except suppression list management)

---

## Technical Implementation

### Language/Stack
- **Node.js/TypeScript** (Next.js API routes)
- **@sendgrid/client** package (NOT @sendgrid/mail) - for Web API v3
- **SendGrid v3 Web API** - REST API for reading data
- **Supabase** for local data storage
- **Inngest** for background sync jobs

### API Access Levels

#### Scoped API Key (Recommended)
Create a SendGrid API key with **ONLY** these permissions:

**READ permissions:**
- ✅ Bounces - Read Access
- ✅ Suppressions - Read Access
- ✅ Email Activity - Read Access
- ✅ Stats - Read Access

**WRITE permissions (limited):**
- ✅ Suppressions - Full Access (to add emails to suppression list only)

**BLOCKED permissions (CRITICAL):**
- ❌ Mail Send - No Access (NEVER enable this)
- ❌ Templates - No Access
- ❌ Marketing Campaigns - No Access
- ❌ API Keys - No Access
- ❌ Teammates - No Access

### Code Safety Guards

```typescript
// ❌ NEVER import this package - it's for SENDING emails
// import sgMail from '@sendgrid/mail';

// ✅ ONLY use @sendgrid/client for reading data via Web API v3
import client from '@sendgrid/client';

// Set API key from environment variable
client.setApiKey(process.env.SENDGRID_API_KEY);

// Example: GET request to read suppressions (SAFE)
const request = {
  method: 'GET',
  url: '/v3/suppression/bounces'
};

// All API functions must be prefixed with "sync" or "check"
// Examples: syncBounces(), checkSuppressionList(), getSendHistory()
// NEVER: sendEmail(), createCampaign(), mailSend()
```

### Package Installation (For Reference Only - Don't Install Yet)

```bash
# ❌ NEVER install this
# npm install --save @sendgrid/mail

# ✅ ONLY install this
npm install --save @sendgrid/client
```

---

## Suppression List Management

### Permanent Suppression List
These emails/domains must NEVER be contacted:

```
info@unlimitedroofing.com.au
sales@swiftaircon.com.au
contactus@ritepartyhire.com.au
info@instantcanopy.com.au
```

### Database Storage
- `email_suppression` table stores all suppressed emails
- `source` column tracks: 'manual', 'bounce', 'unsubscribe', 'spam_report'
- `created_at` timestamp for audit trail

### Sync Strategy
1. **On app startup:** Sync SendGrid suppression groups to local DB
2. **Daily job:** Pull new bounces/unsubscribes via API
3. **Webhook (optional):** Real-time updates for bounces/unsubscribes
4. **Before export:** Check all lead emails against suppression list

---

## Email Send Workflow (Manual)

### Current Process (Safe)
1. User exports leads from our app (CSV)
2. CSV includes safety flag: `can_contact` (true/false)
3. User manually uploads contacts to SendGrid
4. User manually creates campaign in SendGrid UI
5. User manually sends email

### Future Enhanced Process
1. User clicks "Prepare for SendGrid" in our app
2. App filters out:
   - Suppressed emails
   - Recently contacted (within X days)
   - Same domain as previously contacted
   - Invalid/bounced emails
3. App exports "safe to contact" CSV
4. User manually sends via SendGrid UI
5. App syncs send data back (next day)

---

## Domain Matching Rules

### Problem
Same business might have multiple emails:
- info@business.com.au
- sales@business.com.au
- contact@business.com.au

### Solution
1. Extract domain from email address
2. Track `last_contacted_domain` in database
3. Before export, check if domain was contacted recently
4. Flag: `domain_recently_contacted` (boolean)

### Cadence Rules
- Default: Don't contact same domain within **90 days**
- User configurable per export
- Override available with manual confirmation

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│                  SendGrid                       │
│  (You manually send emails here)                │
│                                                 │
│  Stores:                                        │
│  - Send history                                 │
│  - Bounces                                      │
│  - Unsubscribes                                 │
│  - Spam reports                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Read-only API (sync)
                  │ Webhooks (events)
                  ▼
┌─────────────────────────────────────────────────┐
│              Our App (Node.js)                  │
│                                                 │
│  Background Jobs:                               │
│  - Sync bounces (daily)                         │
│  - Sync unsubscribes (daily)                    │
│  - Sync send history (daily)                    │
│  - Update suppression list                      │
└─────────────────┬───────────────────────────────┘
                  │
                  │ Store locally
                  ▼
┌─────────────────────────────────────────────────┐
│             Supabase Database                   │
│                                                 │
│  Tables:                                        │
│  - leads (with email_status)                    │
│  - email_suppression                            │
│  - email_send_history                           │
│  - email_sync_log                               │
└─────────────────────────────────────────────────┘
```

---

## Error Handling & Monitoring

### Rate Limiting
- SendGrid API: 500 requests/second (we'll never hit this)
- Our sync jobs: Max 100 requests/minute
- Exponential backoff on failures

### Logging
All SendGrid API calls logged to database:
- Timestamp
- Endpoint called
- Response status
- Records synced
- Errors (if any)

### Alerts
Notify admin if:
- Sync fails 3 times in a row
- Suppression list sync fails
- API key expires/revokes
- Webhook delivery fails

---

## Testing Strategy

### Safe Testing Environment
1. **Use SendGrid test API key** (sandbox mode)
2. **Test data only:** fake@example.com emails
3. **Never use real customer data in tests**

### Pre-deployment Checklist
- [ ] Confirm API key is read-only scoped
- [ ] Verify @sendgrid/mail is NOT imported anywhere
- [ ] Test suppression list checking with known emails
- [ ] Confirm no email sending functions exist
- [ ] Review all SendGrid API calls (should be GET only, except suppression POST)

---

## Deployment

### Environment Variables
```bash
# Required
SENDGRID_API_KEY=SG.xxx_read_only_key

# Optional
SENDGRID_SYNC_ENABLED=true
SENDGRID_WEBHOOK_SECRET=xxx
EMAIL_CONTACT_CADENCE_DAYS=90
```

### Initial Setup
1. Create SendGrid account
2. Generate scoped API key (read-only + suppression write)
3. Add permanent suppression list to SendGrid
4. Run initial sync to populate database
5. Set up webhook endpoint (optional)
6. Configure daily sync job

---

## Maintenance

### Daily Tasks (Automated)
- Sync new bounces from SendGrid
- Sync new unsubscribes from SendGrid
- Update lead email_status based on sync

### Weekly Tasks (Manual)
- Review sync logs for errors
- Check suppression list growth
- Audit any manual additions to suppression list

### Monthly Tasks (Manual)
- Review domain contact cadence
- Update suppression rules if needed
- Rotate API key (security best practice)

---

## Emergency Procedures

### If API Key is Compromised
1. Immediately revoke key in SendGrid dashboard
2. Generate new scoped key (same permissions)
3. Update .env.local
4. Redeploy app
5. Verify sync resumes

### If Accidental Email Sent
(This should be impossible, but just in case)
1. Document what happened
2. Review code for how it was possible
3. Add additional safety guards
4. Send apology email manually if needed

---

## Questions Before Implementation

1. **SendGrid Account Status**
   - Do you have a SendGrid account already?
   - What tier/plan? (Free tier works fine for read-only)

2. **Contact Cadence**
   - How many days between contacts to same domain? (suggest 90)
   - Should this be configurable per export?

3. **Email Matching**
   - Should info@business.com and sales@business.com be treated as same business?
   - Match by domain only, or exact email?

4. **Webhook Setup**
   - Real-time bounce/unsubscribe updates via webhook?
   - Or just daily sync job? (simpler)

5. **Suppression Groups**
   - One master suppression list?
   - Or multiple lists (bounces, unsubscribes, manual, etc.)?

---

## Next Steps

1. ✅ Review this safety guide
2. ⏳ Create SendGrid account with read-only API key
3. ⏳ Design database schema for email tracking
4. ⏳ Build read-only API sync client
5. ⏳ Add suppression list checking to CSV export
6. ⏳ Set up daily sync job
7. ⏳ (Optional) Configure webhooks for real-time updates

---

## Code Review Checklist

Before merging any SendGrid code:

- [ ] No imports of @sendgrid/mail package
- [ ] All API calls use @sendgrid/client
- [ ] No functions named "send*" or "*send*"
- [ ] All API calls are GET (except suppression list POST)
- [ ] Suppression list check runs before any export
- [ ] Domain matching logic is tested
- [ ] Rate limiting is implemented
- [ ] Error handling is comprehensive
- [ ] Logs are detailed and searchable

---

**Last Updated:** 2025-10-23
**Owner:** Merrick Allen
**Review Schedule:** Before each SendGrid feature deployment
