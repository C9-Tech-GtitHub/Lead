'use client';

import { useState } from 'react';

interface SyncResult {
  bounces: {
    synced: number;
    errors: number;
  };
  unsubscribes: {
    synced: number;
    errors: number;
  };
}

export default function SuppressionManager() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch('/api/sendgrid/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSyncResult(data.results);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCheckEmail = async () => {
    if (!checkEmail) return;

    setChecking(true);
    setCheckResult(null);

    try {
      const response = await fetch('/api/sendgrid/check-suppression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: checkEmail }),
      });

      const data = await response.json();
      setCheckResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manual Sync Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">SendGrid Sync</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Manually sync bounces and unsubscribes from SendGrid.
          This is a <strong>read-only</strong> operation - no emails will be sent.
        </p>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? 'Syncing...' : 'Sync SendGrid Data'}
        </button>

        {syncResult && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
              Sync Completed Successfully
            </h3>
            <div className="space-y-1 text-sm">
              <p>
                Bounces: {syncResult.bounces.synced} synced
                {syncResult.bounces.errors > 0 && ` (${syncResult.bounces.errors} errors)`}
              </p>
              <p>
                Unsubscribes: {syncResult.unsubscribes.synced} synced
                {syncResult.unsubscribes.errors > 0 && ` (${syncResult.unsubscribes.errors} errors)`}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Email Check Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Check Email Status</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Check if an email is on the suppression list or if the domain was recently contacted.
        </p>

        <div className="flex gap-2">
          <input
            type="email"
            value={checkEmail}
            onChange={(e) => setCheckEmail(e.target.value)}
            placeholder="Enter email address"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
          />
          <button
            onClick={handleCheckEmail}
            disabled={checking || !checkEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking...' : 'Check'}
          </button>
        </div>

        {checkResult && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Email:</span>
                <span>{checkResult.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Domain:</span>
                <span>{checkResult.domain}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Can Contact:</span>
                <span
                  className={
                    checkResult.canContact
                      ? 'text-green-600 dark:text-green-400 font-semibold'
                      : 'text-red-600 dark:text-red-400 font-semibold'
                  }
                >
                  {checkResult.canContact ? '✓ Yes' : '✗ No'}
                </span>
              </div>

              {checkResult.suppression.isSuppressed && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>Suppressed:</strong> {checkResult.suppression.reason}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Source: {checkResult.suppression.source}
                  </p>
                </div>
              )}

              {!checkResult.cadence.canContact && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Contact Cadence:</strong> Domain was contacted recently
                  </p>
                  {checkResult.cadence.lastContactedAt && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      Last contacted: {new Date(checkResult.cadence.lastContactedAt).toLocaleDateString()}
                    </p>
                  )}
                  {checkResult.cadence.canContactAfter && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Can contact after: {new Date(checkResult.cadence.canContactAfter).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {checkResult.canContact && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    ✓ This email is safe to contact
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Permanent Suppression List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Permanent Suppression List</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          These emails will <strong>NEVER</strong> be contacted:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            info@unlimitedroofing.com.au
          </li>
          <li className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            sales@swiftaircon.com.au
          </li>
          <li className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            contactus@ritepartyhire.com.au
          </li>
          <li className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            info@instantcanopy.com.au
          </li>
        </ul>
      </div>

      {/* Safety Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
          🔒 Safety Notice
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          This app <strong>NEVER</strong> sends emails automatically.
          All email sending must be done manually through the SendGrid dashboard.
          This integration only reads data to help you avoid contacting suppressed emails.
        </p>
      </div>
    </div>
  );
}
