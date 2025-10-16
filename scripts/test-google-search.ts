/**
 * Test script to verify Google Search can find Macpac website
 */

import { findBusinessWebsite } from '../lib/scrapers/google-search';

async function testGoogleSearch() {
  console.log('Testing Google Search for Macpac Collingwood...\n');

  const businessName = 'Macpac Collingwood';
  const address = '405 Smith St,Fitzroy VIC 3065,Australia';

  try {
    const website = await findBusinessWebsite(businessName, address);

    console.log('\n=== RESULT ===');
    if (website) {
      console.log('✅ Found website:', website);
    } else {
      console.log('❌ No website found');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGoogleSearch();
