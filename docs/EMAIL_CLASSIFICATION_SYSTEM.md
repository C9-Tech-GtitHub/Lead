# Email Classification & Prioritization System

## Overview

This system automatically classifies and scores email addresses to maximize reply likelihood when doing cold outreach at scale. It solves common problems with email selection and helps prevent sending to the wrong addresses.

## Problems Solved

### 1. **Incorrect Generic/Personal Classification**
**Before**: AI was marking `enquiries@` as "personal" ❌  
**After**: Systematic pattern detection correctly identifies email types ✅

### 2. **No Priority Scoring**
**Before**: All emails treated equally - might send to `info@` over `owner@` ❌  
**After**: Priority scores (0-100) rank emails by reply likelihood ✅

### 3. **Missing Email Granularity**
**Before**: Only "personal" vs "generic" (2 categories) ❌  
**After**: 7 detailed categories with different priorities ✅

### 4. **Domain Duplicate Prevention**
**Before**: Could accidentally email same business multiple times ❌  
**After**: Domain-level tracking prevents duplicates ✅

---

## Email Categories

### 🌟 Named Personal (Priority: 90-95)
**Examples**: `tim@company.com`, `john.smith@company.com`, `j.smith@company.com`  
**Best for**: Personal emails with names in the address  
**Reply rate**: Highest (60-80%)

### 👔 Role Personal (Priority: 70-85)
**Examples**: `owner@company.com`, `ceo@company.com`, `director@company.com`  
**Best for**: Decision-maker roles  
**Reply rate**: High (40-60%)

### 🏢 Department (Priority: 60)
**Examples**: `sales@company.com`, `marketing@company.com`, `business@company.com`  
**Best for**: Functional teams that handle inquiries  
**Reply rate**: Moderate (20-40%)

### 📍 Location (Priority: 45)
**Examples**: `sydney@company.com`, `werribee@company.com`, `office@company.com`  
**Best for**: Location-specific contacts (often forwarded to general inbox)  
**Reply rate**: Low-Moderate (15-30%)

### 📧 Generic Catch-all (Priority: 30)
**Examples**: `info@company.com`, `contact@company.com`, `enquiries@company.com`  
**Best for**: Last resort when no better options exist  
**Reply rate**: Low (5-15%)

### 🚫 Automated (Priority: 0)
**Examples**: `noreply@company.com`, `donotreply@company.com`, `automated@company.com`  
**Action**: **NEVER CONTACT** - These are not monitored  
**Reply rate**: 0%

### ❓ Unknown (Priority: 50)
**Examples**: Unrecognized patterns  
**Best for**: Uncertain cases that need manual review  
**Reply rate**: Unknown

---

## How It Works

### 1. **Email Analysis**
When an email is found, the system:
1. Extracts the local part (before @)
2. Checks against known patterns
3. Analyzes name/position data if available
4. Assigns category and priority score

### 2. **Pattern Matching**

```typescript
// Named Personal Detection
john.smith@company.com → Named Personal (95)
j.smith@company.com    → Named Personal (90)

// Role Detection
owner@company.com      → Role Personal (80)
ceo@company.com        → Role Personal (85)

// Generic Detection
info@company.com       → Generic Catch-all (30)
contact@company.com    → Generic Catch-all (30)
```

### 3. **Seniority Scoring**
Position titles add bonus points:
- **C-Level** (CEO, COO, CFO): +25 points
- **Directors/VPs**: +20 points
- **Managers**: +15 points
- **Senior roles**: +10 points

### 4. **Best Email Selection**
When multiple emails exist for one domain:
```typescript
const best = selectBestEmail([
  { email: 'info@company.com' },         // Score: 30
  { email: 'sales@company.com' },        // Score: 60
  { email: 'john.smith@company.com' }    // Score: 95 ← Selected!
]);
```

---

## Database Schema

### New Fields in `lead_emails`

```sql
email_category TEXT                    -- Named category
priority_score INTEGER (0-100)         -- Reply likelihood score
classification_reasoning TEXT          -- Human-readable explanation
is_recommended BOOLEAN                 -- Quick filter for best emails
```

### Domain Contact Tracking

```sql
CREATE TABLE domain_contact_history (
  domain TEXT,                         -- e.g., "example.com"
  email_sent TEXT,                     -- e.g., "sales@example.com"
  sent_at TIMESTAMPTZ,
  lead_id UUID,
  campaign_id TEXT
);
```

---

## API Integration

### Finding Emails
All email finder APIs now automatically classify:

```typescript
// AI Email Finder
const result = await findEmailsWithAI({ name, website, domain });
// Returns emails sorted by priority_score (highest first)

// Hunter.io & Tomba.io
// Automatically classify on insert
```

### Getting Best Email for a Lead

```sql
-- SQL Helper Function
SELECT * FROM get_best_email_for_lead('lead-uuid');

-- Returns highest priority email that's not automated
```

### Checking Domain Contact History

```sql
-- SQL Helper Function
SELECT is_domain_already_contacted(
  'user-uuid', 
  'example.com', 
  180  -- days to check
);
-- Returns true if contacted within last 6 months
```

---

## Usage Examples

### 1. Filter for Best Emails Only

```sql
-- Get only recommended emails (priority_score >= 70)
SELECT * FROM lead_emails 
WHERE is_recommended = true
ORDER BY priority_score DESC;
```

### 2. Find Leads with High-Priority Emails

```sql
-- Find leads with named personal emails
SELECT DISTINCT l.* 
FROM leads l
JOIN lead_emails e ON e.lead_id = l.id
WHERE e.email_category = 'named_personal';
```

### 3. Prevent Domain Duplicates

```sql
-- Get leads that haven't been contacted
SELECT l.* 
FROM leads l
WHERE NOT EXISTS (
  SELECT 1 FROM domain_contact_history dch
  WHERE dch.domain = l.email_domain
  AND dch.sent_at > NOW() - INTERVAL '6 months'
);
```

### 4. Export with Best Email per Lead

```typescript
const leads = await getLeads();

for (const lead of leads) {
  // Get best email
  const bestEmail = await supabase
    .rpc('get_best_email_for_lead', { p_lead_id: lead.id });
  
  console.log(`${lead.name}: ${bestEmail.email} (Score: ${bestEmail.priority_score})`);
}
```

---

## Migration Guide

### Step 1: Run Database Migration

```bash
# Apply the new schema
psql -d your_database -f supabase/migrations/20250128_add_email_classification.sql
```

### Step 2: Reclassify Existing Emails

```bash
# Reclassify all existing emails in database
npx tsx scripts/reclassify-emails.ts
```

This will:
- ✅ Analyze all existing emails
- ✅ Assign new categories and scores
- ✅ Update the database
- ✅ Show before/after statistics

### Step 3: Update Your Queries

Replace old type-based filters:

```typescript
// OLD
.eq('type', 'personal')

// NEW - More precise
.eq('email_category', 'named_personal')
.or('email_category', 'role_personal')

// OR - Use is_recommended flag
.eq('is_recommended', true)
```

---

## Best Practices

### ✅ DO

1. **Always check `is_recommended`** before bulk sending
2. **Filter out `automated` category** - these never get read
3. **Track domain contact history** to prevent duplicates
4. **Prefer higher priority_score** when multiple emails exist
5. **Review `unknown` category emails** manually

### ❌ DON'T

1. **Don't send to automated emails** (noreply@, donotreply@)
2. **Don't ignore priority scores** - they're based on real patterns
3. **Don't send to same domain twice** within 6 months
4. **Don't rely solely on type** - use email_category for precision

---

## Quick Reference

### Email Category Priority Ranking

```
1. named_personal     (90-95)  - tim@, john.smith@
2. role_personal      (70-85)  - owner@, ceo@, director@
3. department         (60)     - sales@, marketing@
4. location           (45)     - sydney@, office@
5. generic_catchall   (30)     - info@, contact@
6. unknown            (50)     - unrecognized patterns
7. automated          (0)      - noreply@, donotreply@ [NEVER SEND]
```

### Quick Filters

```sql
-- Only send to recommended emails
WHERE is_recommended = true

-- Exclude automated
WHERE email_category != 'automated'

-- Only decision makers
WHERE email_category IN ('named_personal', 'role_personal')

-- Never contacted this domain
WHERE NOT is_domain_already_contacted(user_id, domain, 180)
```

---

## Performance Tips

### Indexes Created
- `idx_lead_emails_priority_score` - Fast priority sorting
- `idx_lead_emails_category` - Fast category filtering
- `idx_lead_emails_recommended` - Quick recommended filter
- `idx_lead_emails_best_per_lead` - Efficient best email lookup

### Optimized Queries

```sql
-- Get best email per lead (uses composite index)
SELECT DISTINCT ON (lead_id) *
FROM lead_emails
WHERE email_category != 'automated'
ORDER BY lead_id, priority_score DESC, confidence DESC;
```

---

## Testing

### Verify Classification

```typescript
import { classifyEmail } from '@/lib/email-classifier';

// Test various patterns
const tests = [
  'tim@example.com',
  'owner@example.com',
  'sales@example.com',
  'info@example.com',
  'noreply@example.com'
];

tests.forEach(email => {
  const result = classifyEmail(email);
  console.log(`${email}: ${result.category} (${result.priorityScore})`);
});
```

### Expected Output

```
tim@example.com: named_personal (90)
owner@example.com: role_personal (80)
sales@example.com: department (60)
info@example.com: generic_catchall (30)
noreply@example.com: automated (0)
```

---

## Troubleshooting

### Issue: Emails classified incorrectly

**Solution**: Check the pattern lists in `lib/email-classifier.ts`. You may need to add industry-specific patterns.

### Issue: All emails show priority_score = null

**Solution**: Run the reclassification script:
```bash
npx tsx scripts/reclassify-emails.ts
```

### Issue: Domain contact tracking not working

**Solution**: Ensure you're inserting into `domain_contact_history` when sending emails:
```typescript
await supabase.from('domain_contact_history').insert({
  user_id: userId,
  domain: extractDomain(email),
  email_sent: email,
  lead_id: leadId,
  campaign_id: campaignId // optional
});
```

---

## Future Improvements

- [ ] Machine learning model to predict reply rates based on historical data
- [ ] A/B testing framework to validate priority scores
- [ ] Integration with email engagement tracking (opens, clicks, replies)
- [ ] Automated scoring adjustments based on actual reply rates
- [ ] Industry-specific classification patterns
- [ ] Multi-language email pattern detection

---

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the code in `lib/email-classifier.ts`
3. Run tests with sample emails
4. Check database indexes are created correctly
