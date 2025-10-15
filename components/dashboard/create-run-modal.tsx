'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { inngest } from '@/lib/inngest/client';

interface CreateRunModalProps {
  onClose: () => void;
}

export function CreateRunModal({ onClose }: CreateRunModalProps) {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Create the run in the database
      const { data: run, error: createError } = await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          business_type: businessType,
          location: location,
          target_count: targetCount,
          status: 'pending',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Trigger the Inngest workflow
      await fetch('/api/inngest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'lead/run.created',
          data: {
            runId: run.id,
            userId: user.id,
            businessType,
            location,
            targetCount,
          },
        }),
      });

      // Close modal and refresh
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run');
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
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <input
              id="businessType"
              type="text"
              required
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., realtors, dentists, law firms"
            />
            <p className="mt-1 text-xs text-gray-500">What type of business are you searching for?</p>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              id="location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Melbourne, Australia"
            />
            <p className="mt-1 text-xs text-gray-500">City or region to search in</p>
          </div>

          <div>
            <label htmlFor="targetCount" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Leads
            </label>
            <input
              id="targetCount"
              type="number"
              required
              min={5}
              max={50}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Between 5 and 50 leads</p>
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
              {loading ? 'Creating...' : 'Start Research'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
