"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreateRunModal } from "./create-run-modal";

export function CreateRunButton() {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  // Check URL parameters on mount to auto-open modal with pre-filled data
  useEffect(() => {
    const shouldCreate = searchParams.get("create");
    if (shouldCreate === "true") {
      setIsOpen(true);
    }
  }, [searchParams]);

  // Extract initial values from URL parameters
  const initialBusinessType = searchParams.get("business_type") || undefined;
  const initialLocation = searchParams.get("location") || undefined;
  const initialTargetCount = searchParams.get("target_count")
    ? parseInt(searchParams.get("target_count")!, 10)
    : undefined;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Create New Run
      </button>

      {isOpen && (
        <CreateRunModal
          onClose={() => setIsOpen(false)}
          initialBusinessType={initialBusinessType}
          initialLocation={initialLocation}
          initialTargetCount={initialTargetCount}
        />
      )}
    </>
  );
}
