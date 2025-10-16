/**
 * Test script to see what Serpdog API returns
 */

async function testSerpdog() {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    console.error('SCRAPINGDOG_API_KEY is not set');
    process.exit(1);
  }

  // Test with a simple query
  const query = 'outdoor retailers in Collingwood, Australia';
  const url = new URL('https://api.scrapingdog.com/google_maps');
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('query', query);
  url.searchParams.append('results', '3');
  url.searchParams.append('domain', 'google.com.au');
  url.searchParams.append('country', 'au');

  console.log('Testing Serpdog API...');
  console.log('Query:', query);
  console.log('Full URL:', url.toString().replace(apiKey, 'REDACTED'));

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      process.exit(1);
    }

    const data = await response.json();

    console.log('\n=== RAW API RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n=== PARSED RESULTS ===');
    if (data.search_results && Array.isArray(data.search_results)) {
      data.search_results.forEach((result: any, index: number) => {
        console.log(`\n--- Result ${index + 1} ---`);
        console.log('Title/Name:', result.title || result.name);
        console.log('Address:', result.address);
        console.log('Phone:', result.phone);
        console.log('Website:', result.website);
        console.log('GPS:', result.gps_coordinates);
        console.log('All fields:', Object.keys(result));
      });
    } else {
      console.log('No search_results array found in response');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSerpdog();
