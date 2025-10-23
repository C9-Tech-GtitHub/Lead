/**
 * Apply SQL migrations by copying to clipboard
 * Run this to get the SQL to paste into Supabase SQL Editor
 */

import { readFileSync } from "fs";
import { join } from "path";

const migrationFile =
  process.argv[2] || "supabase/migrations/add_email_asm_groups_junction.sql";

console.log(`\n📄 Reading migration: ${migrationFile}\n`);

const sql = readFileSync(join(process.cwd(), migrationFile), "utf-8");

console.log("━".repeat(80));
console.log("📋 COPY THE SQL BELOW AND PASTE INTO SUPABASE SQL EDITOR:");
console.log("━".repeat(80));
console.log("\n" + sql + "\n");
console.log("━".repeat(80));
console.log(
  "\n🔗 Go to: https://supabase.com/dashboard/project/rnbqqwmbblykvriitgxf/sql/new",
);
console.log("   1. Paste the SQL above");
console.log('   2. Click "Run"');
console.log("   3. Come back here when done!\n");
