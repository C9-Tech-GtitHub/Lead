/**
 * API Route Authentication Helpers
 *
 * Provides authentication middleware for API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

/**
 * Check if user is authenticated
 * Returns user if authenticated, null otherwise
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Require authentication for API route
 * Returns user if authenticated, or error response if not
 */
export async function requireAuth(): Promise<
  { user: AuthenticatedUser } | { error: NextResponse }
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      error: NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to access this endpoint",
        },
        { status: 401 },
      ),
    };
  }

  return { user };
}
