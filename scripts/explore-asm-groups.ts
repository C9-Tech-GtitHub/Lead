/**
 * Explore SendGrid ASM (Advanced Suppression Manager) Groups
 */

import client from "@sendgrid/client";

async function main() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY not set");
  }

  client.setApiKey(apiKey);

  console.log("=== Fetching ASM Groups ===\n");

  // Get all unsubscribe groups
  const [groupsResponse] = await client.request({
    method: "GET",
    url: "/v3/asm/groups",
  });

  const groups = groupsResponse.body as any[];

  console.log(`Found ${groups.length} unsubscribe groups:\n`);

  for (const group of groups) {
    console.log(`Group ID: ${group.id}`);
    console.log(`  Name: ${group.name}`);
    console.log(`  Description: ${group.description}`);
    console.log(`  Is Default: ${group.is_default}`);
    console.log(`  Unsubscribes: ${group.unsubscribes || "N/A"}`);
    console.log();
  }

  // Now let's check suppressions for each group
  console.log("\n=== Checking Suppressions Per Group ===\n");

  for (const group of groups) {
    try {
      // Try to get count by fetching with limit 1
      const [suppressionsResponse] = await client.request({
        method: "GET",
        url: `/v3/asm/groups/${group.id}/suppressions`,
      });

      const suppressions = suppressionsResponse.body as any[];
      console.log(
        `Group ${group.id} (${group.name}): ${suppressions.length} suppressions`
      );

      // Show a few samples
      if (suppressions.length > 0) {
        console.log(`  Sample emails:`);
        suppressions.slice(0, 3).forEach((email: string) => {
          console.log(`    - ${email}`);
        });
      }
      console.log();
    } catch (error: any) {
      console.log(
        `Group ${group.id} (${group.name}): Error fetching suppressions`
      );
      console.log(`  ${error.message}`);
      console.log();
    }
  }
}

main();
