/**
 * Script to reclassify existing emails using the new email classifier
 *
 * This will:
 * 1. Fetch all existing emails from the database
 * 2. Run them through the new classifier
 * 3. Update the database with new classifications
 *
 * Run with: npx tsx scripts/reclassify-emails.ts
 */

import { createClient } from '@supabase/supabase-js';
import { classifyEmail, getSimpleType } from '../lib/email-classifier';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reclassifyEmails() {
  console.log('🔍 Fetching all emails from database...\n');

  // Fetch all emails in batches
  let allEmails: any[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('lead_emails')
      .select('id, email, first_name, last_name, position, type, email_category, priority_score')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching emails:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allEmails = allEmails.concat(data);
    offset += batchSize;

    console.log(`Fetched ${allEmails.length} emails so far...`);
  }

  console.log(`\n✅ Total emails to reclassify: ${allEmails.length}\n`);

  // Classify each email
  const updates: any[] = [];
  const stats = {
    total: allEmails.length,
    changed: 0,
    unchanged: 0,
    byCategory: {} as Record<string, number>,
  };

  for (const email of allEmails) {
    const classification = classifyEmail(
      email.email,
      email.first_name,
      email.last_name,
      email.position
    );

    const newType = getSimpleType(classification.category);

    // Track category distribution
    stats.byCategory[classification.category] =
      (stats.byCategory[classification.category] || 0) + 1;

    // Check if classification changed
    const typeChanged = email.type !== newType;
    const categoryChanged = email.email_category !== classification.category;
    const scoreChanged = email.priority_score !== classification.priorityScore;

    if (typeChanged || categoryChanged || scoreChanged) {
      stats.changed++;
      updates.push({
        id: email.id,
        type: newType,
        email_category: classification.category,
        priority_score: classification.priorityScore,
        classification_reasoning: classification.reasoning,
        is_recommended: classification.isRecommended,
      });

      // Log significant changes
      if (typeChanged) {
        console.log(`📧 ${email.email}`);
        console.log(`   Type: ${email.type} → ${newType}`);
        console.log(`   Category: ${classification.category}`);
        console.log(`   Score: ${classification.priorityScore}`);
        console.log(`   Reasoning: ${classification.reasoning}\n`);
      }
    } else {
      stats.unchanged++;
    }
  }

  console.log('\n📊 Classification Statistics:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Changed: ${stats.changed}`);
  console.log(`   Unchanged: ${stats.unchanged}`);
  console.log('\n📈 Category Distribution:');
  Object.entries(stats.byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${count} (${percentage}%)`);
    });

  if (updates.length === 0) {
    console.log('\n✅ No updates needed - all emails already classified correctly');
    return;
  }

  console.log(`\n🔄 Updating ${updates.length} emails in database...`);

  // Update in batches of 100
  const updateBatchSize = 100;
  let updated = 0;

  for (let i = 0; i < updates.length; i += updateBatchSize) {
    const batch = updates.slice(i, i + updateBatchSize);

    // Update each email in the batch
    for (const update of batch) {
      const { error } = await supabase
        .from('lead_emails')
        .update({
          type: update.type,
          email_category: update.email_category,
          priority_score: update.priority_score,
          classification_reasoning: update.classification_reasoning,
          is_recommended: update.is_recommended,
        })
        .eq('id', update.id);

      if (error) {
        console.error(`Error updating email ${update.id}:`, error);
      } else {
        updated++;
      }
    }

    console.log(`   Updated ${Math.min(i + updateBatchSize, updates.length)}/${updates.length}...`);
  }

  console.log(`\n✅ Successfully updated ${updated}/${updates.length} emails`);

  // Show some examples of top-priority emails
  console.log('\n🌟 Top 10 Highest Priority Emails:');
  const topEmails = allEmails
    .map(e => ({
      ...e,
      ...updates.find(u => u.id === e.id)
    }))
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    .slice(0, 10);

  topEmails.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.email}`);
    console.log(`      Category: ${e.email_category}, Score: ${e.priority_score}`);
    console.log(`      ${e.classification_reasoning || e.reasoning || ''}`);
  });

  console.log('\n✅ Reclassification complete!');
}

// Run the script
reclassifyEmails().catch(console.error);
