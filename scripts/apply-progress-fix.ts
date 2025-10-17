import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('Applying migration: fix_progress_include_skipped.sql');

  const sql = `
CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update grade counts
  UPDATE runs SET
    total_leads = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id
    ),
    grade_a_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'A'
    ),
    grade_b_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'B'
    ),
    grade_c_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'C'
    ),
    grade_d_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'D'
    ),
    grade_f_count = (
      SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND compatibility_grade = 'F'
    ),
    progress = LEAST(100, ROUND(
      (SELECT COUNT(*) FROM leads WHERE run_id = NEW.run_id AND research_status IN ('completed', 'failed', 'skipped'))::NUMERIC /
      (SELECT target_count FROM runs WHERE id = NEW.run_id)::NUMERIC * 100
    ))
  WHERE id = NEW.run_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

  try {
    // Use the REST API to execute raw SQL
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);

      // Try alternative approach using SQL editor endpoint
      console.log('\nTrying alternative approach...');
      console.log('\nPlease run this SQL in your Supabase SQL Editor:');
      console.log('URL: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new');
      console.log('\n' + sql);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Progress bar will now include skipped (prescreened) leads.');
  } catch (error) {
    console.error('Error:', error);
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log('URL: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new');
    console.log('\n' + sql);
    process.exit(1);
  }
}

applyMigration();
