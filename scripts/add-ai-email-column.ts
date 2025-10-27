import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function addColumn() {
  // Add the missing column
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_email_searched_at TIMESTAMPTZ;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_email_search_summary TEXT;
      CREATE INDEX IF NOT EXISTS idx_leads_ai_email_searched ON leads(ai_email_searched_at);
    `,
  });

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  } else {
    console.log(
      "Successfully added ai_email_searched_at and ai_email_search_summary columns",
    );
  }
}

addColumn();
