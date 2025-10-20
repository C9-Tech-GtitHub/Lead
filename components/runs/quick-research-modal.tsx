"use client";

import { useState } from "react";

interface QuickResearchModalProps {
  leadName: string;
  onConfirm: (config: QuickResearchConfig) => void;
  onCancel: () => void;
}

export interface QuickResearchConfig {
  checkMatchCategory: boolean;
  checkIdentity: boolean;
  checkBusinessProfile: boolean;
  checkScale: boolean;
  checkBrandPresence: boolean;
  checkHistory: boolean;
  checkBusinessSize: boolean;
  checkMarketReach: boolean;
  rejectBrandsFranchises: boolean;
  customPrompt?: string;
}

export function QuickResearchModal({
  leadName,
  onConfirm,
  onCancel,
}: QuickResearchModalProps) {
  const [config, setConfig] = useState<QuickResearchConfig>({
    checkMatchCategory: true,
    checkIdentity: true,
    checkBusinessProfile: true,
    checkScale: true,
    checkBrandPresence: true,
    checkHistory: true,
    checkBusinessSize: true,
    checkMarketReach: true,
    rejectBrandsFranchises: true, // Default to rejecting brands/franchises
    customPrompt: "",
  });

  const handleCheckboxChange = (key: keyof QuickResearchConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = () => {
    onConfirm(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                ⚡ Quick Research Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure analysis for:{" "}
                <span className="font-semibold">{leadName}</span>
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">
                    Quick Research (Lightweight)
                  </h3>
                  <p className="text-sm text-purple-700">
                    Analyzes ONLY the scraped website content. No web search.
                    Uses fewer tokens. Fast and cost-effective.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Analysis Checklist
            </h3>

            {/* Brand/Franchise Filter - Highlighted */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.rejectBrandsFranchises}
                  onChange={() =>
                    handleCheckboxChange("rejectBrandsFranchises")
                  }
                  className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="font-semibold text-orange-900 text-sm flex items-center gap-2">
                    ⚠️ Reject Brands/Franchises/Chains
                  </div>
                  <div className="text-xs text-orange-700 mt-0.5">
                    Auto-reject national brands, franchises, and multinational
                    chains. Uncheck if you're okay with larger businesses.
                  </div>
                </div>
              </label>
            </div>

            <CheckboxItem
              label="Match Category Check"
              description="Confirm business matches the lead query category"
              checked={config.checkMatchCategory}
              onChange={() => handleCheckboxChange("checkMatchCategory")}
            />

            <CheckboxItem
              label="Business Identity & Legitimacy"
              description="Validate website presence, contact info, and professionalism"
              checked={config.checkIdentity}
              onChange={() => handleCheckboxChange("checkIdentity")}
            />

            <CheckboxItem
              label="Business Profile"
              description="Industry match, services offered, target market, business model"
              checked={config.checkBusinessProfile}
              onChange={() => handleCheckboxChange("checkBusinessProfile")}
            />

            <CheckboxItem
              label="Business Scale & Activity"
              description="Team indicators, service breadth, portfolio, geographic coverage"
              checked={config.checkScale}
              onChange={() => handleCheckboxChange("checkScale")}
            />

            <CheckboxItem
              label="Brand Presence"
              description="Website quality, social links, reviews, content marketing"
              checked={config.checkBrandPresence}
              onChange={() => handleCheckboxChange("checkBrandPresence")}
            />

            <CheckboxItem
              label="Business History"
              description="Year founded, experience claims, testimonials"
              checked={config.checkHistory}
              onChange={() => handleCheckboxChange("checkHistory")}
            />

            <CheckboxItem
              label="Business Size"
              description="Assess whether Micro/Small/Medium/Large/Enterprise"
              checked={config.checkBusinessSize}
              onChange={() => handleCheckboxChange("checkBusinessSize")}
            />

            <CheckboxItem
              label="Market Reach"
              description="Assess Local/Regional/National/International reach"
              checked={config.checkMarketReach}
              onChange={() => handleCheckboxChange("checkMarketReach")}
            />
          </div>

          {/* Custom Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Instructions (Optional)
            </label>
            <textarea
              value={config.customPrompt}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, customPrompt: e.target.value }))
              }
              placeholder="Add any specific instructions or focus areas for the analysis..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: "Pay special attention to their service pricing", "Focus
              on their local SEO signals"
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Cost:</span> ~1500 tokens (CHEAP)
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
            >
              ⚡ Start Quick Research
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckboxItem({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
      />
      <div className="flex-1">
        <div className="font-medium text-gray-900 text-sm">{label}</div>
        <div className="text-xs text-gray-600 mt-0.5">{description}</div>
      </div>
    </label>
  );
}
