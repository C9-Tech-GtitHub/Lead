/**
 * Demo: ABN Lookup with Real Examples
 * Shows how the system extracts ABN from websites and looks up business age
 */

import { extractABN, formatABN } from '@/lib/utils/abn-extractor';
import { lookupABN, getBusinessAgeCategory } from '@/lib/services/abn-lookup';

async function demoABNLookup() {
  console.log('🎯 ABN Lookup Demo\n');
  console.log('This demonstrates how the system:');
  console.log('  1. Extracts ABN from website content');
  console.log('  2. Looks up business details from ABR');
  console.log('  3. Calculates business age\n');
  console.log('='.repeat(60));

  // Example website content with ABN
  const exampleContent = `
    About Our Business
    We are a leading real estate agency based in Melbourne.

    Our Details:
    Company: Premium Properties Pty Ltd
    ABN: 51 824 753 556
    Phone: 1300 123 456
    Email: info@premiumproperties.com.au
  `;

  console.log('\n📄 Example Website Content:');
  console.log(exampleContent);

  // Step 1: Extract ABN
  console.log('\n🔍 Step 1: Extract ABN from content...');
  const extractedABN = extractABN(exampleContent);

  if (!extractedABN) {
    console.log('❌ No ABN found in content');
    return;
  }

  console.log(`✅ Found ABN: ${formatABN(extractedABN)}`);

  // Step 2: Lookup ABN details
  console.log('\n🔍 Step 2: Looking up ABN in Australian Business Register...');

  const abnData = await lookupABN(extractedABN);

  if (!abnData) {
    console.log('❌ Could not retrieve ABN data');
    console.log('Make sure ABN_LOOKUP_API_KEY is set in .env.local');
    return;
  }

  console.log('✅ ABN Data Retrieved!\n');

  // Step 3: Display business information
  console.log('📊 Business Information:');
  console.log('='.repeat(60));
  console.log(`Entity Name:        ${abnData.entityName}`);
  console.log(`ABN:                ${formatABN(abnData.abn)}`);
  console.log(`Status:             ${abnData.abnStatus}`);
  console.log(`Entity Type:        ${abnData.entityTypeName || 'N/A'}`);
  console.log(`Registered Since:   ${abnData.abnStatusEffectiveFrom}`);
  console.log(`Business Age:       ${abnData.businessAge || 'Unknown'} years`);
  console.log(`Age Category:       ${getBusinessAgeCategory(abnData.businessAge)}`);
  console.log(`GST Registered:     ${abnData.gstStatus || 'No'}`);
  console.log('='.repeat(60));

  // Step 4: Business age insights
  console.log('\n💡 Insights for Lead Research:');

  if (abnData.businessAge) {
    if (abnData.businessAge >= 20) {
      console.log('  ✅ Well-established business (20+ years)');
      console.log('  → Likely has stable operations');
      console.log('  → May have legacy systems ready for upgrade');
    } else if (abnData.businessAge >= 10) {
      console.log('  ✅ Mature business (10-20 years)');
      console.log('  → Proven track record');
      console.log('  → May be looking to modernize');
    } else if (abnData.businessAge >= 3) {
      console.log('  ✅ Established business (3-10 years)');
      console.log('  → Growing phase');
      console.log('  → Likely investing in technology');
    } else if (abnData.businessAge >= 1) {
      console.log('  ⚠️ Young business (1-3 years)');
      console.log('  → Still establishing themselves');
      console.log('  → May have budget constraints');
    } else {
      console.log('  ⚠️ New business (< 1 year)');
      console.log('  → Very early stage');
      console.log('  → Higher risk, lower budget');
    }
  }

  if (abnData.abnStatus !== 'Active') {
    console.log('  ⚠️ WARNING: ABN is not active!');
    console.log('  → Business may be closed or suspended');
  }

  console.log('\n✨ This data is automatically extracted during lead research!');
}

// Run the demo
demoABNLookup().catch(console.error);
