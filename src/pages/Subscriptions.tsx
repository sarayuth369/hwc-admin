import { useEffect, useState, useCallback } from "react";
import { adminApi, BillingOverview, AdminApiError } from "../lib/adminApi";
import { StatCard, LoadingState, ErrorState, ComingSoon } from "../components/Common";

const PAGE_SIZE = 25;

export function Subscriptions() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getBilling({ page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch((e: AdminApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Subscriptions</h1>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && data && !data.schemaAvailable && (
        <ComingSoon
          title="Billing schema not set up yet"
          description="The subscriptions table doesn't exist in the database yet — M needs to run supabase/migrations/0003_ai_usage_and_billing.sql in the Supabase SQL Editor once. No payment provider is connected either way; every account is on the free tier by design until that changes."
        />
      )}

      {!loading && data && data.schemaAvailable && (
        <>
          {!data.providerConnected && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              <strong>No payment provider connected.</strong> Every row below genuinely reflects
              each user's real state — it's real data, not a placeholder — but every account is on
              the free tier because no billing provider (e.g. Google Play Billing) has been wired
              up yet. This is the entitlement/gating model, ready for a provider to write real
              subscription rows the moment one is connected.
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Free" value={data.totalFree} />
            <StatCard label="Premium" value={data.totalPremium} />
            <StatCard label="Pending provider" value={data.totalPendingProvider} />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Renews</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No subscription rows yet — every user is implicitly free until one is
                      created.
                    </td>
                  </tr>
                )}
                {data.rows.map((r) => (
                  <tr
                    key={r.userId}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {r.userId}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-900 dark:text-white">{r.tier}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.status}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.provider}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(r.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {data.totalCount} subscriptions · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
