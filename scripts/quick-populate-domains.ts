/**
 * Quick populate email_domain using UPDATE only
 */

import { createClient } from "@supabase/supabase-js";

async function quickPopulate() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log("🔧 Populating email_domain...\n");

  // Fetch all leads with websites but no email_domain
  const { data: leads, error: fetchError } = await supabase
    .from("leads")
    .select("id, website")
    .not("website", "is", null)
    .neq("website", "")
    .or("email_domain.is.null,email_domain.eq.");

  if (fetchError || !leads) {
    console.error("❌ Error:", fetchError?.message);
    return;
  }

  console.log(`Found ${leads.length} leads to update\n`);
  console.log("Updating...");

  let totalUpdated = 0;

  for (const lead of leads) {
    const domain = lead.website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase();

    const { error } = await supabase
      .from("leads")
      .update({ email_domain: domain })
      .eq("id", lead.id);

    if (!error) {
      totalUpdated++;
      if (totalUpdated % 100 === 0) {
        console.log(`✓ Updated ${totalUpdated} / ${leads.length}`);
      }
    } else {
      console.error(`❌ Error updating ${lead.id}:`, error.message);
    }
  }

  console.log(`\n✅ Complete! Updated ${totalUpdated} leads`);

  // Verify
  const { count: withDomain } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("email_domain", "is", null)
    .neq("email_domain", "");

  console.log(
    `�� Total leads with email_domain: ${withDomain?.toLocaleString()}`,
  );
}

quickPopulate();
