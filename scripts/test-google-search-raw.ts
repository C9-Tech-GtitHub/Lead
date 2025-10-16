/**
 * Test script to see raw Google Search API response
 */

async function testGoogleSearchRaw() {
  const apiKey = process.env.SCRAPINGDOG_API_KEY;

  if (!apiKey) {
    console.error('SCRAPINGDOG_API_KEY is not set');
    process.exit(1);
  }

  // Try a few different queries
  const queries = [
    'Macpac Collingwood website',
    'Macpac Fitzroy website',
    'Macpac outdoor store',
  ];

  for (const searchQuery of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing query: ${searchQuery}`);
    console.log('='.repeat(60));

    const query = encodeURIComponent(searchQuery);
    const url = `https://api.scrapingdog.com/google/?api_key=${apiKey}&query=${query}&results=5&country=au`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const text = await response.text();
        console.error('Response:', text);
        continue;
      }

      const data = await response.json();

      console.log('\nRaw response keys:', Object.keys(data));
      console.log('\nFull response:');
      console.log(JSON.stringify(data, null, 2));

      if (data.organic_data && data.organic_data.length > 0) {
        console.log('\nFirst few results:');
        data.organic_data.slice(0, 3).forEach((result: any, index: number) => {
          console.log(`\n${index + 1}. ${result.title}`);
          console.log(`   Link: ${result.link}`);
          console.log(`   Displayed: ${result.displayed_link}`);
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testGoogleSearchRaw();
