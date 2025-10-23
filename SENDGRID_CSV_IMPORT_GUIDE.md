# SendGrid Email Activity CSV Import Guide

## Overview

This guide walks you through importing your historical SendGrid email activity data using the CSV export feature.

## Why Import Historical Data?

Importing your email send history allows you to:
- ✅ Track which domains you've already contacted
- ✅ Enforce 6-month contact cadence automatically
- ✅ Avoid contacting the same businesses too frequently
- ✅ See complete email history in your dashboard

---

## Step 1: Export CSV from SendGrid

1. **Log in to SendGrid Dashboard**
   - Go to https://app.sendgrid.com

2. **Navigate to Email Activity**
   - Click **"Activity"** in the left sidebar

3. **Export the Data**
   - Click **"Export CSV"** button
   - SendGrid will email you a download link
   - Download the CSV file (usually named something like `email-activity.csv`)

4. **Save the File**
   - Save it somewhere accessible, like `~/Downloads/email-activity.csv`

---

## Step 2: Run the Import Script

Open your terminal and run:

```bash
cd /Users/merrickallen/Documents/GitHub/Lead

NEXT_PUBLIC_SUPABASE_URL=https://rnbqqwmbblykvriitgxf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npx tsx scripts/import-sendgrid-activity-csv.ts ~/Downloads/email-activity.csv
```

**Replace** `~/Downloads/email-activity.csv` with the actual path to your downloaded CSV file.

---

## Step 3: What the Script Does

The import script will:

1. **Parse the CSV** - Reads all email events from the file
2. **Group by Message** - Combines multiple events (sent, delivered, opened, clicked) for the same email
3. **Insert into Database** - Saves to `email_send_history` table
4. **Track Domains** - Updates `domain_contact_tracking` with contact dates
5. **Enforce Cadence** - Sets "can contact after" date to 6 months from last contact

### What Gets Imported

The script processes these email events:
- ✅ **processed** - Email was sent
- ✅ **delivered** - Email was successfully delivered
- ✅ **open** - Recipient opened the email
- ✅ **click** - Recipient clicked a link
- ✅ **bounce** - Email bounced (hard or soft)
- ✅ **dropped** - SendGrid dropped the email

### What Gets Tracked for Contact Cadence

Only **successfully delivered** emails count toward the 6-month contact cadence:
- ✅ Delivered
- ✅ Opened
- ✅ Clicked

Bounced or dropped emails are recorded but **don't** trigger the contact hold.

---

## Step 4: Verify the Import

After running the import, check the results:

### Check Email Send History
```bash
npx tsx scripts/check-send-history.ts
```

### Check Domain Contact Tracking
```bash
npx tsx scripts/check-contact-history.ts
```

---

## Step 5: View in Dashboard

1. Go to your app: http://localhost:3002/sendgrid
2. You should now see:
   - **Contact Tracking tab** showing contacted domains
   - **Contacted Domains** stat showing the count

---

## Understanding the Output

When you run the import, you'll see:

```
📧 SendGrid Email Activity CSV Importer
────────────────────────────────────────────────────────────
📁 Reading CSV file: ~/Downloads/email-activity.csv

✅ Parsed 8 rows from CSV

🔄 Processing email events...

📊 Found 3 unique messages

💾 Inserting into database...

────────────────────────────────────────────────────────────
📊 IMPORT SUMMARY

✅ Total CSV rows: 8
📧 Unique messages: 3
💾 Messages inserted/updated: 3
🌐 Unique domains contacted: 2
🔄 Domain contact records updated: 0

✨ No errors! Import completed successfully.
```

### What Each Number Means

- **Total CSV rows** - Number of event records in the CSV
- **Unique messages** - Number of distinct emails (a single email can have multiple events)
- **Messages inserted/updated** - Emails saved to database
- **Unique domains contacted** - Domains that were successfully contacted
- **Domain contact records updated** - Existing domain records that were updated

---

## Troubleshooting

### Error: "File not found"
- Make sure the file path is correct
- Use absolute path: `/Users/yourname/Downloads/email-activity.csv`
- Or relative path: `~/Downloads/email-activity.csv`

### Error: "Failed to insert"
- Check that your Supabase credentials are correct
- Verify the database migration was applied (unique constraint)

### No Domains Tracked
- This is normal if all your emails bounced or were dropped
- Only successfully delivered emails are tracked for contact cadence

---

## Running Imports Multiple Times

The script is **safe to run multiple times**! It uses upsert logic, so:
- New emails are inserted
- Existing emails are updated
- No duplicates are created

If you export a new CSV with more recent data, just run the import again.

---

## Next Steps

After importing historical data:

1. **Set Up Webhooks** (optional) - To track future sends automatically
2. **Sync Suppressions** - Click "Sync SendGrid" in dashboard to update bounce/unsubscribe lists
3. **Review Contact Tracking** - Check which domains are on hold in the SendGrid dashboard

---

## Support

If you encounter any issues:
1. Check the error messages in the terminal
2. Verify your CSV file format matches SendGrid's export
3. Ensure database migrations are applied
4. Check Supabase credentials are correct

The script provides detailed error messages to help diagnose issues.
