/**
 * Test script for ABN checker functionality
 * Tests ABN extraction from text and ABN lookup
 */

import { extractABN, validateABNChecksum, formatABN } from '../lib/utils/abn-extractor';
import { lookupABN, getBusinessAgeCategory } from '../lib/services/abn-lookup';

async function testABNChecker() {
  console.log('=== Testing ABN Checker ===\n');

  // Test 1: ABN Extraction
  console.log('--- Test 1: ABN Extraction ---');

  const testTexts = [
    'Our ABN is 51 824 753 556',
    'ABN: 51824753556',
    'Australian Business Number 51 824 753 556',
    'Contact us - ABN 51824753556',
    'No ABN in this text',
    'Invalid ABN: 12 345 678 901', // Invalid checksum
  ];

  for (const text of testTexts) {
    const abn = extractABN(text);
    console.log(`Text: "${text}"`);
    console.log(`Extracted ABN: ${abn || 'None'}`);
    if (abn) {
      console.log(`Formatted: ${formatABN(abn)}`);
      console.log(`Valid checksum: ${validateABNChecksum(abn)}`);
    }
    console.log();
  }

  // Test 2: ABN Checksum Validation
  console.log('\n--- Test 2: ABN Checksum Validation ---');

  const testABNs = [
    { abn: '51824753556', expected: true, name: 'Valid ABN (Atlassian)' },
    { abn: '12345678901', expected: false, name: 'Invalid checksum' },
    { abn: '53004085616', expected: true, name: 'Valid ABN (Telstra)' },
    { abn: '00000000000', expected: false, name: 'All zeros' },
  ];

  for (const test of testABNs) {
    const isValid = validateABNChecksum(test.abn);
    console.log(`${test.name}: ${test.abn}`);
    console.log(`Valid: ${isValid} (expected: ${test.expected})`);
    console.log(`✓ ${isValid === test.expected ? 'PASS' : 'FAIL'}`);
    console.log();
  }

  // Test 3: ABN Lookup (requires API key)
  console.log('\n--- Test 3: ABN Lookup ---');

  if (!process.env.ABN_LOOKUP_API_KEY) {
    console.log('⚠️  ABN_LOOKUP_API_KEY not set - skipping lookup test');
    console.log('To test ABN lookup, get a free API key from:');
    console.log('https://abr.business.gov.au/Tools/WebServices');
    console.log('Then add it to your .env.local file:\n');
    console.log('ABN_LOOKUP_API_KEY=your-guid-here\n');
  } else {
    // Test with a known valid ABN (Atlassian Pty Ltd)
    const testABN = '51824753556';
    console.log(`Looking up ABN: ${formatABN(testABN)}`);

    try {
      const result = await lookupABN(testABN);

      if (result) {
        console.log('\n✓ Lookup successful!');
        console.log(`Entity Name: ${result.entityName}`);
        console.log(`ABN Status: ${result.abnStatus}`);
        console.log(`Registered: ${result.abnStatusEffectiveFrom}`);
        console.log(`Business Age: ${result.businessAge || 'Unknown'} years`);
        console.log(`Age Category: ${getBusinessAgeCategory(result.businessAge)}`);
        console.log(`GST Status: ${result.gstStatus || 'N/A'}`);
        console.log(`Entity Type: ${result.entityTypeName || 'N/A'}`);
      } else {
        console.log('✗ Lookup failed - no result returned');
      }
    } catch (error) {
      console.error('✗ Lookup error:', error);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run the tests
testABNChecker().catch(console.error);
