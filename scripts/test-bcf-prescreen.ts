/**
 * Test why BCF got through the prescreener
 */

import { prescreenLead, prescreenLeadsBatch } from '../lib/ai/prescreen';

async function testBCFPrescreen() {
  console.log('Testing BCF Prescreening...\n');

  const bcfLead = {
    name: 'BCF Altona',
    address: 'Millers Junction Village,T1,8 Cabot Dr,Altona North VIC 3025, Australia',
    website: 'https://www.bcf.com.au/stores/details/bcf-altona?utm_source=google&utm_medium=organic&utm_campaign=gbpm-altona',
    businessType: 'Camping & Hiking Gear'
  };

  console.log('Testing individual prescreen:');
  console.log('Business:', bcfLead.name);
  console.log('Address:', bcfLead.address);
  console.log('Website:', bcfLead.website);
  console.log('---\n');

  try {
    const result = await prescreenLead(bcfLead);

    console.log('✅ Prescreen Result:');
    console.log('  Should Research:', result.shouldResearch);
    console.log('  Is Franchise:', result.isFranchise);
    console.log('  Is National Brand:', result.isNationalBrand);
    console.log('  Confidence:', result.confidence);
    console.log('  Reason:', result.reason);
    console.log('\n');

    if (result.shouldResearch) {
      console.log('❌ BUG CONFIRMED: BCF should be SKIPPED but was marked for RESEARCH');
    } else {
      console.log('✅ CORRECT: BCF was properly marked to SKIP');
    }

    // Now test batch mode
    console.log('\n\n--- Testing Batch Prescreen ---\n');

    const testLeads = [
      {
        name: 'BCF Altona',
        address: 'Millers Junction Village,T1,8 Cabot Dr,Altona North VIC 3025, Australia',
        website: 'https://www.bcf.com.au/stores/details/bcf-altona',
        businessType: 'Camping & Hiking Gear'
      },
      {
        name: 'Macpac Melbourne',
        address: '370 Little Bourke St,Melbourne VIC 3000,Australia',
        businessType: 'Camping & Hiking Gear'
      },
      {
        name: 'Kathmandu Chapel Street',
        address: '285A Chapel St,Prahran VIC 3181,Australia',
        businessType: 'Camping & Hiking Gear'
      },
      {
        name: 'Joe\'s Outdoor Adventures',
        address: '123 Main St, Melbourne VIC 3000',
        businessType: 'Camping & Hiking Gear'
      }
    ];

    const batchResults = await prescreenLeadsBatch(testLeads);

    console.log('Batch Results:');
    testLeads.forEach(lead => {
      const result = batchResults.get(lead.name);
      console.log(`\n${lead.name}:`);
      console.log(`  Decision: ${result?.shouldResearch ? 'RESEARCH' : 'SKIP'}`);
      console.log(`  Franchise: ${result?.isFranchise ? 'YES' : 'NO'}`);
      console.log(`  Confidence: ${result?.confidence}`);
      console.log(`  Reason: ${result?.reason}`);
    });

  } catch (error) {
    console.error('❌ Error during prescreen:', error);
  }
}

testBCFPrescreen();
