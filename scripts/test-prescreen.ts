/**
 * Test script for the prescreen functionality
 * Tests known franchises and independent businesses
 */

import { prescreenLead } from '../lib/ai/prescreen';

const testCases = [
  // Known franchises - should be SKIPPED
  {
    name: 'Macpac Melbourne Central',
    address: 'Melbourne Central, VIC',
    website: 'https://www.macpac.com.au',
    businessType: 'Camping & Hiking Gear',
    expected: 'SKIP',
  },
  {
    name: 'Kathmandu Sydney',
    address: '123 George St, Sydney NSW',
    website: 'https://www.kathmandu.com.au',
    businessType: 'Outdoor Gear',
    expected: 'SKIP',
  },
  {
    name: 'Rebel Sport Bondi Junction',
    address: 'Bondi Junction, NSW',
    businessType: 'Sporting Goods',
    expected: 'SKIP',
  },
  {
    name: 'Fjällräven Store Melbourne',
    address: 'Melbourne, VIC',
    businessType: 'Outdoor Apparel',
    expected: 'SKIP',
  },
  {
    name: 'Ray White Real Estate',
    address: 'Sydney, NSW',
    businessType: 'Real Estate',
    expected: 'SKIP',
  },
  {
    name: 'McDonald\'s Parramatta',
    address: 'Parramatta, NSW',
    businessType: 'Fast Food',
    expected: 'SKIP',
  },
  // Independent businesses - should be RESEARCHED
  {
    name: 'Mountain Adventure Co.',
    address: 'Fitzroy, VIC',
    businessType: 'Outdoor Gear',
    expected: 'RESEARCH',
  },
  {
    name: 'The Local Gear Shop',
    address: 'Newtown, NSW',
    businessType: 'Camping Equipment',
    expected: 'RESEARCH',
  },
  {
    name: 'Summit Outfitters',
    address: 'Brisbane, QLD',
    businessType: 'Hiking Gear',
    expected: 'RESEARCH',
  },
];

async function runTests() {
  console.log('🧪 Testing Prescreen Functionality\n');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    console.log(`Expected: ${testCase.expected}`);

    try {
      const result = await prescreenLead({
        name: testCase.name,
        address: testCase.address,
        website: testCase.website,
        businessType: testCase.businessType,
      });

      const actual = result.shouldResearch ? 'RESEARCH' : 'SKIP';
      const match = actual === testCase.expected;

      console.log(`Actual: ${actual}`);
      console.log(`Franchise: ${result.isFranchise ? 'Yes' : 'No'}`);
      console.log(`National Brand: ${result.isNationalBrand ? 'Yes' : 'No'}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Reason: ${result.reason}`);
      console.log(`Result: ${match ? '✅ PASS' : '❌ FAIL'}`);

      if (match) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review the results above.');
  }
}

runTests().catch(console.error);
