"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";

export function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Lead Research Platform
            </h2>
            <nav className="flex space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 text-sm rounded-md ${
                  pathname === "/"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Leads
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-2 text-sm rounded-md ${
                  pathname === "/dashboard"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Runs
              </Link>
              <Link
                href="/dashboard/map"
                className={`px-3 py-2 text-sm rounded-md ${
                  pathname === "/dashboard/map"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Map
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
