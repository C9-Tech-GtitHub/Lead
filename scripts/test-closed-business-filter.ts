/**
 * Test script to verify permanently closed businesses are filtered out
 */

import { scrapeGoogleMaps } from '../lib/scrapers/google-maps';

async function testClosedBusinessFilter() {
  console.log('Testing closed business filter...\n');

  // Test with a search that might include closed businesses
  const results = await scrapeGoogleMaps({
    query: 'outdoor gear stores',
    location: 'St Kilda, Melbourne, VIC',
    limit: 20
  });

  console.log(`\nFound ${results.length} businesses (after filtering)`);
  console.log('\n=== RESULTS ===');

  results.forEach((business, index) => {
    console.log(`\n${index + 1}. ${business.name}`);
    console.log(`   Address: ${business.address || 'N/A'}`);
    console.log(`   Website: ${business.website || 'N/A'}`);
    console.log(`   Phone: ${business.phone || 'N/A'}`);
  });

  console.log('\n✓ Test complete! Check the logs above for any "Skipping permanently closed" messages.');
}

testClosedBusinessFilter().catch(console.error);
