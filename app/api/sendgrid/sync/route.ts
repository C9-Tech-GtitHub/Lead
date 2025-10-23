/**
 * SendGrid Manual Sync API Route
 *
 * Allows manual synchronization of SendGrid data
 * READ-ONLY: Only syncs data, never sends emails
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAllSuppressions } from "@/lib/sendgrid/client";
import { requireAuth } from "@/lib/auth/api-auth";

export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await requireAuth();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    console.log("Starting SendGrid sync...");

    const results = await syncAllSuppressions();

    return NextResponse.json({
      success: true,
      message: "SendGrid sync completed",
      results: {
        bounces: {
          synced: results.bounces.recordsSynced,
          errors: results.bounces.errors.length,
        },
        unsubscribes: {
          synced: results.unsubscribes.recordsSynced,
          errors: results.unsubscribes.errors.length,
        },
      },
      details: results,
    });
  } catch (error: any) {
    console.error("SendGrid sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Failed to sync SendGrid data",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "SendGrid Sync API",
    usage: "POST to this endpoint to manually sync SendGrid data",
    safety: "This endpoint only reads data from SendGrid - never sends emails",
  });
}
