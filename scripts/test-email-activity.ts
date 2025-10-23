import { sendgridClient } from '@/lib/sendgrid/client';

async function testEmailActivity() {
  console.log('Testing SendGrid Email Activity API access...\n');

  try {
    const result = await sendgridClient.getEmailActivity(10);

    if (result.messages.length > 0) {
      console.log(`✅ Email Activity API accessible!`);
      console.log(`Found ${result.messages.length} recent emails\n`);

      result.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`Email ${i + 1}:`);
        console.log(`  To: ${msg.to_email}`);
        console.log(`  Subject: ${msg.subject}`);
        console.log(`  Status: ${msg.status}`);
        console.log(`  Last Event: ${msg.last_event_time}`);
        console.log();
      });
    } else {
      console.log('⚠️  Email Activity API returned no messages');
      console.log('This could mean:');
      console.log('  1. No emails have been sent yet');
      console.log('  2. API key lacks Email Activity permissions');
      console.log('  3. Email Activity History add-on not purchased');
    }
  } catch (error: any) {
    console.error('❌ Error accessing Email Activity API:', error.message);
  }
}

testEmailActivity();
