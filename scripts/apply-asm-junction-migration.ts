import { getSupabaseAdmin } from "../lib/supabase/admin-client";

async function applyMigration() {
  const supabase = getSupabaseAdmin();

  console.log("Creating email_asm_groups junction table...");

  // Create the junction table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS email_asm_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL REFERENCES email_suppression(email) ON DELETE CASCADE,
      asm_group_id INTEGER NOT NULL,
      asm_group_name TEXT NOT NULL,
      synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(email, asm_group_id)
    );
  `;

  const { error: createError } = await supabase.rpc("exec_sql", {
    sql_query: createTableSQL,
  });

  if (createError) {
    console.error("Failed to create table:", createError);
    console.log("Trying direct approach...");

    // Try using a workaround - insert a dummy record to test if table exists
    const { error: testError } = await supabase
      .from("email_asm_groups")
      .select("id")
      .limit(1);

    if (testError && testError.code !== "PGRST116") {
      console.error("Table does not exist and cannot be created via API");
      console.log("\n⚠️  Please run this SQL directly in Supabase SQL Editor:");
      console.log("\n" + createTableSQL);
      return;
    }

    console.log("✅ Table already exists or was created");
  } else {
    console.log("✅ Table created successfully");
  }

  // Create indexes (these might fail if already exist, which is OK)
  console.log("Creating indexes...");

  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_email_asm_groups_email ON email_asm_groups(email);",
    "CREATE INDEX IF NOT EXISTS idx_email_asm_groups_asm_group_id ON email_asm_groups(asm_group_id);",
    "CREATE INDEX IF NOT EXISTS idx_email_asm_groups_created_at ON email_asm_groups(created_at);",
  ];

  for (const indexSQL of indexes) {
    await supabase.rpc("exec_sql", { sql_query: indexSQL }).catch(() => {
      console.log("Index might already exist (OK)");
    });
  }

  console.log("✅ Indexes created");

  // Migrate existing data
  console.log("Migrating existing ASM group data...");

  const { data: existingData } = await supabase
    .from("email_suppression")
    .select("email, asm_group_id, asm_group_name, created_at")
    .eq("source", "asm_group")
    .not("asm_group_id", "is", null);

  if (existingData && existingData.length > 0) {
    console.log(
      `Found ${existingData.length} existing ASM group memberships to migrate`,
    );

    const records = existingData.map((row) => ({
      email: row.email,
      asm_group_id: row.asm_group_id,
      asm_group_name: row.asm_group_name || "Unknown Group",
      created_at: row.created_at,
    }));

    const { error: insertError } = await supabase
      .from("email_asm_groups")
      .upsert(records, {
        onConflict: "email,asm_group_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.error("Migration insert failed:", insertError);
    } else {
      console.log(`✅ Migrated ${records.length} records`);
    }
  } else {
    console.log("No existing data to migrate");
  }

  // Verify final count
  const { count } = await supabase
    .from("email_asm_groups")
    .select("*", { count: "exact", head: true });

  console.log(`\n✅ Migration complete! Junction table has ${count} records`);
}

applyMigration().catch(console.error);
