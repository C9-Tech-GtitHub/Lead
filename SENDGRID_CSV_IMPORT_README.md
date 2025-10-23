# SendGrid CSV Import - Quick Start

## What We Built

A CSV import system that lets you import your historical email send data from SendGrid into your app's database. This enables contact tracking and 6-month cadence enforcement.

---

## Quick Start (3 Steps)

### 1. Export Your Email Activity from SendGrid

1. Go to https://app.sendgrid.com
2. Click **Activity** → **Export CSV**
3. Check your email for the download link
4. Download the CSV file

### 2. Run the Import Script

```bash
cd /Users/merrickallen/Documents/GitHub/Lead

NEXT_PUBLIC_SUPABASE_URL=https://rnbqqwmbblykvriitgxf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npx tsx scripts/import-sendgrid-activity-csv.ts ~/Downloads/email-activity.csv
```

### 3. View Results in Dashboard

Go to: http://localhost:3002/sendgrid

You'll now see:
- ✅ **Contacted Domains** stat (should show > 0)
- ✅ **Contact Tracking** tab with domain history
- ✅ 6-month contact cadence enforced

---

## What It Does

### Email Send History
- Imports all sent emails with status (delivered, opened, clicked, bounced)
- Tracks message IDs, timestamps, and delivery events
- Stored in `email_send_history` table

### Domain Contact Tracking
- Extracts domains from recipient emails
- Records first contact, last contact, and total contacts
- Sets "can contact after" date (6 months from last successful delivery)
- Stored in `domain_contact_tracking` table

### Smart Event Processing
The script combines multiple events for the same email:
- `processed` → Email sent
- `delivered` → Successfully delivered
- `open` → Recipient opened
- `click` → Recipient clicked
- `bounce` → Failed delivery

Only successfully delivered emails count toward the 6-month hold.

---

## Files Created

1. **`scripts/import-sendgrid-activity-csv.ts`** - Main import script
2. **`scripts/apply-sendgrid-constraint.ts`** - Database migration helper
3. **`scripts/sample-sendgrid-activity.csv`** - Sample data for testing
4. **`SENDGRID_CSV_IMPORT_GUIDE.md`** - Detailed documentation
5. **`supabase/migrations/add_sendgrid_msg_id_unique_constraint.sql`** - Database migration

---

## Database Changes

Added unique constraint to `email_send_history.sendgrid_msg_id`:
- Prevents duplicate imports
- Allows safe re-running of import script
- Enables upsert operations

---

## Verification Scripts

Check your data after import:

```bash
# Check email send history
npx tsx scripts/check-send-history.ts

# Check domain contact tracking
npx tsx scripts/check-contact-history.ts
```

---

## UI Changes

Contact tracking is now **enabled** in the dashboard:
- Set `ENABLE_CONTACT_TRACKING = true` in `sendgrid-dashboard.tsx`
- Shows "Contacted Domains" stat card
- Shows "Contact Tracking" tab with domain list

To disable it (if you haven't imported data yet):
- Change to `ENABLE_CONTACT_TRACKING = false` in line 45

---

## CSV Format

The script expects SendGrid's standard CSV export with these fields:
- `processed` - Unix timestamp
- `message_id` - Unique message identifier
- `event` - Event type (processed, delivered, open, click, bounce)
- `email` - Recipient email address
- `subject` - Email subject
- `from` - Sender address
- `reason` - Bounce/drop reason (optional)
- `type` - Bounce type (hard/soft) (optional)

All other fields are optional and preserved in the import.

---

## Safe to Re-Run

The import script uses **upsert** logic:
- ✅ New emails are inserted
- ✅ Existing emails are updated
- ✅ No duplicates created
- ✅ Domain contact counts are incremented correctly

You can export a new CSV and run the import again to add more data.

---

## Next Steps

1. **Import your real data** - Export from SendGrid and import
2. **Set up webhooks** (optional) - Automatically track future sends
3. **Verify contact tracking** - Check the dashboard shows correct data
4. **Use the cadence** - The system will now prevent contacting domains too frequently

---

## Need Help?

See the full guide: `SENDGRID_CSV_IMPORT_GUIDE.md`

Or check the example output from running the import on sample data:
```
📧 SendGrid Email Activity CSV Importer
────────────────────────────────────────────────────────────
✅ Total CSV rows: 8
📧 Unique messages: 3
💾 Messages inserted/updated: 3
🌐 Unique domains contacted: 2
✨ No errors! Import completed successfully.
```
