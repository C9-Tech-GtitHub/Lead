/**
 * Populate email_domain for all leads based on their website
 */

import { createClient } from "@supabase/supabase-js";

async function populateEmailDomains() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log("🔧 Populating email_domain for all leads...\n");

  // Run the UPDATE query
  const { error, count } = await supabase.rpc("query", {
    query_text: `
      UPDATE leads
      SET email_domain = LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(website, '^https?://', ''),
            '^www\\.', ''
          ),
          '/.*$', ''
        )
      )
      WHERE website IS NOT NULL
        AND website != ''
        AND (email_domain IS NULL OR email_domain = '');
    `,
  });

  if (error) {
    console.error("❌ Error:", error.message);

    // Try alternative approach - fetch and update in batches
    console.log("\n📝 Trying direct update approach...");

    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("id, website")
      .not("website", "is", null)
      .neq("website", "")
      .or("email_domain.is.null,email_domain.eq.");

    if (fetchError) {
      console.error("❌ Fetch error:", fetchError.message);
      return;
    }

    console.log(`Found ${leads?.length || 0} leads to update`);

    let updated = 0;
    const batchSize = 100;

    for (let i = 0; i < (leads?.length || 0); i += batchSize) {
      const batch = leads!.slice(i, i + batchSize);

      for (const lead of batch) {
        const domain = lead.website
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/.*$/, "")
          .toLowerCase();

        const { error: updateError } = await supabase
          .from("leads")
          .update({ email_domain: domain })
          .eq("id", lead.id);

        if (!updateError) {
          updated++;
        }
      }

      console.log(
        `Progress: ${Math.min(i + batchSize, leads!.length)} / ${leads!.length}`,
      );
    }

    console.log(`\n✅ Updated ${updated} leads`);
  } else {
    console.log(`✅ Updated ${count} leads via SQL`);
  }

  // Verify
  const { count: withDomain } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("email_domain", "is", null)
    .neq("email_domain", "");

  console.log(`\n📊 Verification:`);
  console.log(`Leads with email_domain: ${withDomain?.toLocaleString()}`);
}

populateEmailDomains();
