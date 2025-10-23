import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendGridActivityRow {
  processed: string;
  message_id: string;
  event: string;
  api_key_id?: string;
  recv_message_id?: string;
  credential_id?: string;
  subject?: string;
  from?: string;
  email: string;
  asm_group_id?: string;
  template_id?: string;
  originating_ip?: string;
  reason?: string;
  outbound_ip?: string;
  outbound_ip_type?: string;
  mx?: string;
  attempt?: string;
  url?: string;
  user_agent?: string;
  type?: string;
  is_unique?: string;
  username?: string;
  categories?: string;
  marketing_campaign_id?: string;
  marketing_campaign_name?: string;
  marketing_campaign_split_id?: string;
  marketing_campaign_version?: string;
  unique_args?: string;
}

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string {
  const parts = email.toLowerCase().split('@');
  return parts[1] || '';
}

/**
 * Convert UNIX timestamp to ISO date string
 */
function unixToISO(unixTimestamp: string): string {
  return new Date(parseInt(unixTimestamp) * 1000).toISOString();
}

/**
 * Import SendGrid Email Activity CSV
 */
async function importSendGridActivityCSV(csvFilePath: string) {
  console.log('📧 SendGrid Email Activity CSV Importer\n');
  console.log('─'.repeat(60));

  // Validate file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: File not found: ${csvFilePath}`);
    console.log('\nUsage: npx tsx scripts/import-sendgrid-activity-csv.ts <path-to-csv>');
    console.log('Example: npx tsx scripts/import-sendgrid-activity-csv.ts ~/Downloads/email-activity.csv');
    process.exit(1);
  }

  console.log(`📁 Reading CSV file: ${csvFilePath}\n`);

  // Read and parse CSV
  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SendGridActivityRow[];

  console.log(`✅ Parsed ${records.length} rows from CSV\n`);

  // Statistics
  let emailsInserted = 0;
  let domainsTracked = new Set<string>();
  let errors: string[] = [];

  // Track unique sends (by message_id) to avoid duplicates
  const processedMessages = new Map<string, {
    email: string;
    domain: string;
    sentAt: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    bouncedAt?: Date;
    status: string;
    bounceReason?: string;
  }>();

  // Process each row
  console.log('🔄 Processing email events...\n');

  for (const row of records) {
    try {
      const email = row.email.toLowerCase();
      const domain = extractDomain(email);
      const messageId = row.message_id || row.recv_message_id || '';
      const eventTimestamp = new Date(parseInt(row.processed) * 1000);

      if (!email || !domain) {
        errors.push(`Skipping row: No email address found`);
        continue;
      }

      // Initialize or update message tracking
      if (!processedMessages.has(messageId)) {
        processedMessages.set(messageId, {
          email,
          domain,
          sentAt: eventTimestamp,
          status: 'sent',
        });
      }

      const message = processedMessages.get(messageId)!;

      // Update message based on event type
      switch (row.event) {
        case 'processed':
          // Email was processed by SendGrid
          if (!message.sentAt || eventTimestamp < message.sentAt) {
            message.sentAt = eventTimestamp;
          }
          break;

        case 'delivered':
          message.deliveredAt = eventTimestamp;
          message.status = 'delivered';
          break;

        case 'open':
          message.openedAt = eventTimestamp;
          message.status = 'opened';
          break;

        case 'click':
          message.clickedAt = eventTimestamp;
          message.status = 'clicked';
          break;

        case 'bounce':
          message.bouncedAt = eventTimestamp;
          message.status = 'bounced';
          message.bounceReason = row.reason;
          break;

        case 'dropped':
          message.status = 'dropped';
          message.bounceReason = row.reason;
          break;

        case 'deferred':
          // Temporary delivery issue, don't change status
          break;

        case 'spam report':
        case 'unsubscribe':
        case 'group unsubscribe':
          // These should already be in suppression list from sync
          break;
      }
    } catch (err: any) {
      errors.push(`Error processing row: ${err.message}`);
    }
  }

  console.log(`📊 Found ${processedMessages.size} unique messages\n`);

  // Insert into database
  console.log('💾 Inserting into database...\n');

  let insertCount = 0;
  let updateCount = 0;

  for (const [messageId, message] of processedMessages) {
    try {
      // Insert into email_send_history
      const { error: insertError } = await supabase
        .from('email_send_history')
        .upsert({
          email: message.email,
          domain: message.domain,
          sendgrid_msg_id: messageId,
          sent_at: message.sentAt.toISOString(),
          delivered_at: message.deliveredAt?.toISOString(),
          opened_at: message.openedAt?.toISOString(),
          clicked_at: message.clickedAt?.toISOString(),
          bounced_at: message.bouncedAt?.toISOString(),
          status: message.status,
          bounce_reason: message.bounceReason,
          synced_from_sendgrid: true,
        }, {
          onConflict: 'sendgrid_msg_id',
        });

      if (insertError) {
        errors.push(`Failed to insert ${message.email}: ${insertError.message}`);
        continue;
      }

      insertCount++;
      domainsTracked.add(message.domain);

      // Only track successfully delivered emails in domain_contact_tracking
      if (message.status === 'delivered' || message.status === 'opened' || message.status === 'clicked') {
        // Update domain_contact_tracking
        const { error: trackError } = await supabase
          .from('domain_contact_tracking')
          .upsert({
            domain: message.domain,
            first_contacted_at: message.sentAt.toISOString(),
            last_contacted_at: message.sentAt.toISOString(),
            total_contacts: 1,
            can_contact_after: new Date(message.sentAt.getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
          }, {
            onConflict: 'domain',
            ignoreDuplicates: false,
          });

        if (trackError) {
          // If domain already exists, update the contact count
          const { data: existing } = await supabase
            .from('domain_contact_tracking')
            .select('total_contacts, first_contacted_at, last_contacted_at')
            .eq('domain', message.domain)
            .single();

          if (existing) {
            const firstContact = new Date(existing.first_contacted_at || message.sentAt);
            const lastContact = new Date(existing.last_contacted_at);

            const newFirstContact = message.sentAt < firstContact ? message.sentAt : firstContact;
            const newLastContact = message.sentAt > lastContact ? message.sentAt : lastContact;

            await supabase
              .from('domain_contact_tracking')
              .update({
                first_contacted_at: newFirstContact.toISOString(),
                last_contacted_at: newLastContact.toISOString(),
                total_contacts: existing.total_contacts + 1,
                can_contact_after: new Date(newLastContact.getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .eq('domain', message.domain);

            updateCount++;
          }
        }
      }

      // Progress indicator
      if (insertCount % 50 === 0) {
        console.log(`  ✓ Processed ${insertCount} messages...`);
      }
    } catch (err: any) {
      errors.push(`Error inserting ${message.email}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 IMPORT SUMMARY\n');
  console.log(`✅ Total CSV rows: ${records.length}`);
  console.log(`📧 Unique messages: ${processedMessages.size}`);
  console.log(`💾 Messages inserted/updated: ${insertCount}`);
  console.log(`🌐 Unique domains contacted: ${domainsTracked.size}`);
  console.log(`🔄 Domain contact records updated: ${updateCount}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${errors.length}`);
    console.log('\nFirst 10 errors:');
    errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  } else {
    console.log('\n✨ No errors! Import completed successfully.');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n✅ Import complete!\n');
  console.log('Next steps:');
  console.log('  1. Check your SendGrid dashboard to see the contact tracking data');
  console.log('  2. The 6-month contact cadence is now enforced for these domains');
  console.log('  3. Run a sync to update lead email statuses:');
  console.log('     Click "Sync SendGrid" in the dashboard\n');
}

// Main execution
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('❌ Error: No CSV file path provided\n');
  console.log('Usage: npx tsx scripts/import-sendgrid-activity-csv.ts <path-to-csv>');
  console.log('Example: npx tsx scripts/import-sendgrid-activity-csv.ts ~/Downloads/email-activity.csv\n');
  console.log('To get the CSV:');
  console.log('  1. Go to SendGrid dashboard');
  console.log('  2. Click "Activity" in the sidebar');
  console.log('  3. Click "Export CSV"');
  console.log('  4. Check your email for the download link\n');
  process.exit(1);
}

importSendGridActivityCSV(csvFilePath);
