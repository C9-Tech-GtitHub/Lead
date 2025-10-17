/**
 * Test prescreener fallback logic for known chains
 */

import { prescreenLeadsBatch } from '../lib/ai/prescreen';

async function testPrescreenerFallback() {
  console.log('Testing Prescreener with Fallback Logic...\n');

  // Simulate a scenario where GPT-5 fails to classify these businesses
  // The fallback pattern matching should catch them
  const testLeads = [
    {
      name: 'BCF Altona | Boating, Camping & Fishing Store',
      address: 'Millers Junction Village,T1,8 Cabot Dr,Altona North VIC 3025, Australia',
      website: 'https://www.bcf.com.au/stores/details/bcf-altona',
      businessType: 'Camping & Hiking Gear'
    },
    {
      name: 'Macpac Melbourne CBD',
      address: '370 Little Bourke St,Melbourne VIC 3000,Australia',
      businessType: 'Camping & Hiking Gear'
    },
    {
      name: 'Kathmandu Chapel Street',
      address: '285A Chapel St,Prahran VIC 3181,Australia',
      businessType: 'Camping & Hiking Gear'
    },
    {
      name: 'Anaconda Docklands',
      address: 'Docklands VIC',
      businessType: 'Camping & Hiking Gear'
    },
    {
      name: 'Rebel Sport Melbourne',
      address: 'Melbourne VIC',
      businessType: 'Sports Equipment'
    },
    {
      name: "Joe's Independent Outdoor Shop",
      address: '123 Main St, Melbourne VIC',
      businessType: 'Camping & Hiking Gear'
    },
    {
      name: 'Adventure Seekers Outdoors',
      address: '456 High St, Melbourne VIC',
      businessType: 'Camping & Hiking Gear'
    }
  ];

  console.log('Testing batch prescreen with fallback logic...\n');

  // This should use GPT-5 first, but fallback for any unmatched
  const results = await prescreenLeadsBatch(testLeads);

  console.log('\n=== RESULTS ===\n');

  const skipped: string[] = [];
  const research: string[] = [];

  testLeads.forEach(lead => {
    const result = results.get(lead.name);
    const decision = result?.shouldResearch ? 'RESEARCH' : 'SKIP';

    if (decision === 'SKIP') {
      skipped.push(lead.name);
    } else {
      research.push(lead.name);
    }

    console.log(`${decision === 'SKIP' ? '❌' : '✅'} ${lead.name}`);
    console.log(`   Decision: ${decision}`);
    console.log(`   Franchise: ${result?.isFranchise ? 'YES' : 'NO'}`);
    console.log(`   National Brand: ${result?.isNationalBrand ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${result?.confidence}`);
    console.log(`   Reason: ${result?.reason}`);
    console.log('');
  });

  console.log('\n=== SUMMARY ===');
  console.log(`\n✅ To Research (${research.length}):`);
  research.forEach(name => console.log(`   - ${name}`));

  console.log(`\n❌ Skipped Franchises (${skipped.length}):`);
  skipped.forEach(name => console.log(`   - ${name}`));

  // Verify known chains are caught
  const knownChains = ['BCF', 'Macpac', 'Kathmandu', 'Anaconda', 'Rebel'];
  const missedChains = knownChains.filter(chain => {
    const lead = testLeads.find(l => l.name.includes(chain));
    if (!lead) return false;
    const result = results.get(lead.name);
    return result?.shouldResearch === true;
  });

  if (missedChains.length > 0) {
    console.log(`\n⚠️  WARNING: These known chains were NOT filtered:`);
    missedChains.forEach(chain => console.log(`   - ${chain}`));
  } else {
    console.log(`\n✅ SUCCESS: All known chains were properly filtered!`);
  }
}

testPrescreenerFallback();
