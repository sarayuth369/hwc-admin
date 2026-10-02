import { useEffect, useState, useCallback } from "react";
import { adminApi, AiUsageOverview, AdminApiError } from "../lib/adminApi";
import { StatCard, LoadingState, ErrorState, ComingSoon } from "../components/Common";

const ROUTE_OPTIONS = ["", "chat", "insight", "image_analyze", "voice_transcribe", "voice_synthesize"];
const PROVIDER_OPTIONS = ["", "workers-ai", "zai", "gemini", "openai"];

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? "All" : opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AiUsage() {
  const [data, setData] = useState<AiUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getAiUsage({
        route: route || undefined,
        provider: provider || undefined,
        model: model || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      .then(setData)
      .catch((e: AdminApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [route, provider, model, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AI / Usage</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <FilterSelect label="Feature" value={route} options={ROUTE_OPTIONS} onChange={setRoute} />
        <FilterSelect label="Provider" value={provider} options={PROVIDER_OPTIONS} onChange={setProvider} />
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Model contains
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. llama-3.3"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </label>
        {(route || provider || model || from || to) && (
          <button
            onClick={() => {
              setRoute("");
              setProvider("");
              setModel("");
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState />}

      {!loading && data && !data.telemetryAvailable && (
        <ComingSoon
          title="Usage telemetry not set up yet"
          description="The ai_usage_events table doesn't exist in the database yet — M needs to run supabase/migrations/0003_ai_usage_and_billing.sql in the Supabase SQL Editor once. The Worker is already writing real usage events on every AI call; once the table exists, this page will show them immediately, no further deploy needed."
        />
      )}

      {!loading && data && data.telemetryAvailable && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total requests" value={data.totalRequests} />
            <StatCard label="Successful" value={data.successCount} />
            <StatCard
              label="Failed"
              value={data.failureCount}
              hint={
                data.totalRequests > 0
                  ? `${((data.failureCount / data.totalRequests) * 100).toFixed(1)}% failure rate`
                  : undefined
              }
            />
            <StatCard label="Distinct models" value={data.byModel.length} />
          </div>

          {data.totalRequests === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              No requests match these filters.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">By feature</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Route</th>
                    <th className="pb-2">Requests</th>
                    <th className="pb-2">Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byRoute.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">
                        No requests in this range.
                      </td>
                    </tr>
                  )}
                  {data.byRoute.map((r) => (
                    <tr key={r.route} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">{r.route}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{r.count}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{r.failureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">By provider</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Provider</th>
                    <th className="pb-2">Requests</th>
                    <th className="pb-2">Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProvider.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">
                        No requests in this range.
                      </td>
                    </tr>
                  )}
                  {data.byProvider.map((p) => (
                    <tr key={p.provider} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">{p.provider}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{p.count}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{p.failureCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">By model</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Model</th>
                    <th className="pb-2">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byModel.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-400">
                        No requests in this range.
                      </td>
                    </tr>
                  )}
                  {data.byModel.map((m) => (
                    <tr key={m.model} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 text-gray-900 dark:text-white">{m.model}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-300">{m.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent failures</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Model</th>
                  <th className="pb-2">Error</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-400">
                      No failures recorded.
                    </td>
                  </tr>
                )}
                {data.recentFailures.map((f, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 text-gray-900 dark:text-white">{f.route}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{f.model ?? "—"}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{f.errorCode ?? "—"}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">
                      {new Date(f.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
