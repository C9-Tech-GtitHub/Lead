import { sendgridClient } from '@/lib/sendgrid/client';

async function testStatsAPI() {
  console.log('Testing SendGrid Stats API...\n');

  try {
    // Get stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    console.log(`Fetching stats from ${startDate} to today...\n`);

    const stats = await sendgridClient.getStats(startDate);

    console.log('Stats API Response:');
    console.log(JSON.stringify(stats, null, 2));

    // Calculate totals
    if (Array.isArray(stats) && stats.length > 0) {
      let totalRequests = 0;
      let totalDelivered = 0;
      let totalBounces = 0;
      let totalOpens = 0;
      let totalClicks = 0;

      stats.forEach((day: any) => {
        const metrics = day.stats[0].metrics;
        totalRequests += metrics.requests || 0;
        totalDelivered += metrics.delivered || 0;
        totalBounces += metrics.bounces || 0;
        totalOpens += metrics.opens || 0;
        totalClicks += metrics.clicks || 0;
      });

      console.log('\n📊 Summary:');
      console.log(`  Total Requests: ${totalRequests}`);
      console.log(`  Delivered: ${totalDelivered}`);
      console.log(`  Bounces: ${totalBounces}`);
      console.log(`  Opens: ${totalOpens}`);
      console.log(`  Clicks: ${totalClicks}`);
    }
  } catch (error: any) {
    console.error('❌ Error accessing Stats API:', error.message);
  }
}

testStatsAPI();
