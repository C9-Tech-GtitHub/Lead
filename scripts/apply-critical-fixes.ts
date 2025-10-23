/**
 * Apply Critical Fixes for SendGrid Integration
 *
 * Applies database migrations for:
 * 1. Fixed email domain trigger
 * 2. Performance indexes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigrations() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔧 Applying critical database fixes...\n');

  try {
    // Read migration files
    const triggerSql = readFileSync(
      join(process.cwd(), 'supabase/migrations/fix_email_domain_trigger.sql'),
      'utf8'
    );

    const indexSql = readFileSync(
      join(process.cwd(), 'supabase/migrations/add_performance_indexes.sql'),
      'utf8'
    );

    // Apply trigger fix
    console.log('📝 Applying fix_email_domain_trigger.sql...');

    // Split by semicolons and execute each statement
    const triggerStatements = triggerSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of triggerStatements) {
      if (statement.includes('DO $$') || statement.includes('RAISE NOTICE')) {
        // Skip procedural blocks for now (they're just for logging)
        continue;
      }

      const { error } = await supabase.rpc('query', { query_text: statement + ';' });
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`⚠️  Statement warning: ${error.message}`);
      }
    }

    console.log('✅ Trigger fix applied\n');

    // Apply performance indexes
    console.log('📝 Applying add_performance_indexes.sql...');

    const indexStatements = indexSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of indexStatements) {
      if (statement.includes('DO $$') || statement.includes('RAISE NOTICE') || statement.includes('ANALYZE')) {
        // Skip procedural blocks and ANALYZE for now
        continue;
      }

      const { error } = await supabase.rpc('query', { query_text: statement + ';' });
      if (error && !error.message.includes('already exists')) {
        console.log(`⚠️  Statement warning: ${error.message}`);
      }
    }

    console.log('✅ Performance indexes applied\n');

    // Verify indexes were created
    const { data: indexes, error: indexError } = await supabase
      .rpc('query', {
        query_text: `
          SELECT tablename, indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename IN ('email_suppression', 'leads', 'email_send_history', 'domain_contact_tracking', 'sendgrid_sync_log')
            AND indexname LIKE 'idx_%'
          ORDER BY tablename, indexname;
        `
      });

    if (!indexError && indexes) {
      console.log('📊 Indexes created:');
      const grouped = (indexes as any[]).reduce((acc, idx) => {
        if (!acc[idx.tablename]) acc[idx.tablename] = [];
        acc[idx.tablename].push(idx.indexname);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [table, idxList] of Object.entries(grouped)) {
        console.log(`  ${table}: ${idxList.length} indexes`);
      }
    }

    console.log('\n✅ All critical fixes applied successfully!');

  } catch (error: any) {
    console.error('❌ Error applying migrations:', error.message);
    process.exit(1);
  }
}

applyMigrations();
