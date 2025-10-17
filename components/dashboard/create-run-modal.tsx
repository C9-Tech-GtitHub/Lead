"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRun } from "@/lib/actions/create-run";

interface CreateRunModalProps {
  onClose: () => void;
  initialBusinessType?: string;
  initialLocation?: string;
  initialTargetCount?: number;
}

export function CreateRunModal({
  onClose,
  initialBusinessType,
  initialLocation,
  initialTargetCount
}: CreateRunModalProps) {
  const [businessTypes, setBusinessTypes] = useState(initialBusinessType || "Camping & Hiking Gear");
  const [location, setLocation] = useState(initialLocation || "");
  const [targetCount, setTargetCount] = useState(initialTargetCount || 100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse comma-separated business types
      const businessTypesArray = businessTypes
        .split(",")
        .map((type) => type.trim())
        .filter((type) => type.length > 0);

      if (businessTypesArray.length === 0) {
        setError("Please enter at least one business type");
        setLoading(false);
        return;
      }

      // Call the server action to create run and trigger Inngest workflow
      await createRun({
        businessTypes: businessTypesArray,
        location,
        targetCount,
      });

      // Close modal - real-time subscription will handle the update
      onClose();

      // Force a page refresh to ensure the new run appears
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Failed to create run:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start research. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Create New Research Run</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="businessTypes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Business Type(s)
            </label>
            <input
              id="businessTypes"
              type="text"
              required
              value={businessTypes}
              onChange={(e) => setBusinessTypes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="e.g., Artificial Grass, Fake Turf, Synthetic Lawn"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter one or more search queries separated by commas. Multiple queries will be searched and deduplicated.
            </p>
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>

            {/* Quick Select Buttons for Test Cities */}
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLocation("Sydney")}
                className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                🏙️ Sydney
              </button>
              <button
                type="button"
                onClick={() => setLocation("Melbourne")}
                className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                🏙️ Melbourne
              </button>
            </div>

            <input
              id="location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="e.g., Melbourne, Sydney, Brisbane"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use Sydney or Melbourne for multi-suburb search
            </p>
          </div>

          <div>
            <label
              htmlFor="targetCount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Number of Leads
            </label>
            <input
              id="targetCount"
              type="number"
              required
              min={5}
              max={2000}
              step={10}
              value={targetCount}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!Number.isNaN(value)) {
                  setTargetCount(Math.max(5, Math.min(2000, value)));
                } else {
                  setTargetCount(5);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Between 5 and 2000 leads — use the upper range for major metros
              when the multi-suburb search is enabled.
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Start Research"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
