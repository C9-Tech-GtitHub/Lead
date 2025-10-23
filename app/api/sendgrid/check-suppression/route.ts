/**
 * Check Email Suppression API Route
 *
 * Check if an email is on the suppression list
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkEmailSuppression,
  checkDomainContactCadence,
} from "@/lib/sendgrid/client";
import { requireAuth } from "@/lib/auth/api-auth";

export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await requireAuth();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    // Extract domain from email
    const domain = email.toLowerCase().split("@")[1];

    // Check suppression list
    const suppressionCheck = await checkEmailSuppression(email);

    // Check domain contact cadence (6 months)
    const cadenceCheck = await checkDomainContactCadence(domain);

    return NextResponse.json({
      email,
      domain,
      suppression: suppressionCheck,
      cadence: cadenceCheck,
      canContact: !suppressionCheck.isSuppressed && cadenceCheck.canContact,
      warnings: [
        suppressionCheck.isSuppressed && {
          type: "suppression",
          message: `Email is suppressed: ${suppressionCheck.reason}`,
        },
        !cadenceCheck.canContact && {
          type: "cadence",
          message: `Domain was contacted recently. Can contact after ${cadenceCheck.canContactAfter}`,
        },
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error("Suppression check failed:", error);

    return NextResponse.json(
      {
        error: error.message,
        message: "Failed to check email suppression",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  // Authentication check
  const authResult = await requireAuth();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email parameter is required" },
      { status: 400 },
    );
  }

  try {
    const domain = email.toLowerCase().split("@")[1];
    const suppressionCheck = await checkEmailSuppression(email);
    const cadenceCheck = await checkDomainContactCadence(domain);

    return NextResponse.json({
      email,
      domain,
      suppression: suppressionCheck,
      cadence: cadenceCheck,
      canContact: !suppressionCheck.isSuppressed && cadenceCheck.canContact,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
