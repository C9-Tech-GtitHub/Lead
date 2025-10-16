/**
 * Test ABN Lookup
 * Tests the ABN lookup service with the ABR API
 */

import { lookupABN, getBusinessAgeCategory } from '@/lib/services/abn-lookup';

async function testABNLookup() {
  // Test with a well-known business ABN
  // Example: Atlassian (51 824 753 556)
  const testABN = '51824753556';

  console.log('🔍 Testing ABN Lookup Service');
  console.log('Testing ABN:', testABN);
  console.log('API Key configured:', process.env.ABN_LOOKUP_API_KEY ? 'Yes ✅' : 'No ❌');
  console.log('---\n');

  try {
    const result = await lookupABN(testABN);

    if (result) {
      console.log('✅ ABN Lookup Successful!\n');
      console.log('📋 Business Details:');
      console.log('  Entity Name:', result.entityName);
      console.log('  ABN:', result.abn);
      console.log('  ABN Status:', result.abnStatus);
      console.log('  Entity Type:', result.entityTypeName || 'N/A');
      console.log('  Registered Since:', result.abnStatusEffectiveFrom);
      console.log('  Business Age:', result.businessAge ? `${result.businessAge} years` : 'Unknown');
      console.log('  Age Category:', getBusinessAgeCategory(result.businessAge));
      console.log('  GST Status:', result.gstStatus || 'N/A');
      console.log('\n📊 Full Response:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ No data found for this ABN\n');
      console.log('Possible reasons:');
      console.log('  - ABN_LOOKUP_API_KEY not set in .env.local');
      console.log('  - Invalid ABN number');
      console.log('  - API request failed');
      console.log('\nTo set up ABN lookup:');
      console.log('  1. Get your API key (GUID) from https://abr.business.gov.au/Tools/WebServices');
      console.log('  2. Add to .env.local: ABN_LOOKUP_API_KEY=your-guid-here');
    }
  } catch (error) {
    console.error('❌ Error during lookup:', error);
  }
}

testABNLookup();
