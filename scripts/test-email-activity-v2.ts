import client from "@sendgrid/client";

async function testEmailActivityAPI() {
  console.log('Testing SendGrid Email Activity Feed API...\n');

  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not found');
    return;
  }

  client.setApiKey(apiKey);

  // Try the v3/messages endpoint with proper format
  const request = {
    method: 'GET' as const,
    url: '/v3/messages',
    qs: {
      limit: 10
    }
  };

  try {
    console.log('Attempting to access Email Activity Feed API...');
    console.log('Endpoint: GET /v3/messages?limit=10\n');

    const [response] = await client.request(request);

    console.log('✅ SUCCESS! Email Activity Feed is accessible!');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.body, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.code || error.message);

    if (error.response) {
      console.error('\nResponse status:', error.response.statusCode);
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }

    // Decode the error
    if (error.code === 401 || error.message?.includes('authorization')) {
      console.log('\n📋 This error means:');
      console.log('  Your API key has the right permissions, BUT you need to:');
      console.log('  1. Purchase "Additional Email Activity History" add-on ($20-60/month)');
      console.log('  2. OR check if billing is still propagating (can take up to 24 hours)');
      console.log('\n  Free tier only includes 3 days of email activity logs.');
      console.log('  To get API access, you must purchase the 30-day history add-on.');
    }
  }
}

testEmailActivityAPI();
