import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const migrationPath = join(
    process.cwd(),
    "supabase/migrations/add_prescreen_fields.sql",
  );
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Running migration: add_prescreen_fields.sql");

  // Execute the migration using the Supabase REST API
  const { error } = await supabase.rpc("exec", { sql: migration });

  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }

  console.log("✅ Migration completed successfully!");
}

runMigration();
