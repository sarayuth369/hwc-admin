import { useEffect, useState, useCallback } from "react";
import { adminApi, ModelRoutingOverview, AdminApiError } from "../lib/adminApi";
import { LoadingState, ErrorState, ComingSoon } from "../components/Common";

const FEATURES = [
  {
    feature: "chat",
    label: "AI Talk / Consult",
    description: "Conversational wellness chat -- the same backend route serves both AI Talk and the wellness consultation flow.",
  },
  {
    feature: "insight",
    label: "Today's Insight",
    description: "The short wellness insight generated from a user's recent health context.",
  },
  {
    feature: "image_analyze",
    label: "Food Scanner / Health Report Reader",
    description: "Vision: describing a food photo or transcribing a health document -- same backend route, distinguished by purpose.",
  },
];

interface RowState {
  provider: string;
  model: string;
  enabled: boolean;
  saving: boolean;
  savedJustNow: boolean;
}

export function ModelRouting() {
  const [data, setData] = useState<ModelRoutingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getModelRouting()
      .then((overview) => {
        setData(overview);
        const next: Record<string, RowState> = {};
        for (const f of FEATURES) {
          const existing = overview.rows.find((r) => r.feature === f.feature);
          next[f.feature] = {
            provider: existing?.provider ?? "workers-ai",
            model: existing?.model ?? "",
            enabled: existing?.enabled ?? true,
            saving: false,
            savedJustNow: false,
          };
        }
        setRowState(next);
      })
      .catch((e: AdminApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  if (!data.configAvailable) {
    return (
      <ComingSoon
        title="Model routing not set up yet"
        description="The model_routing_config table doesn't exist in the database yet — M needs to run supabase/migrations/0004_model_routing.sql in the Supabase SQL Editor once. Every feature keeps using its current hardcoded default until then; nothing breaks."
      />
    );
  }

  const providers = Object.keys(data.allowedProviderModels);

  const updateRow = (feature: string, patch: Partial<RowState>) => {
    setRowState((prev) => ({ ...prev, [feature]: { ...prev[feature], ...patch } }));
  };

  const save = async (feature: string) => {
    const row = rowState[feature];
    if (!row || !row.model) return;
    updateRow(feature, { saving: true, savedJustNow: false });
    try {
      await adminApi.setModelRouting(feature, {
        provider: row.provider,
        model: row.model,
        enabled: row.enabled,
      });
      updateRow(feature, { saving: false, savedJustNow: true });
      setTimeout(() => updateRow(feature, { savedJustNow: false }), 2500);
    } catch (e) {
      updateRow(feature, { saving: false });
      setError(e instanceof AdminApiError ? e.message : "Failed to save");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Model Routing</h1>
      <p className="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        Choose which AI provider and model backs each real feature. Changes take effect for new
        requests within about 30 seconds — no deploy needed. Only provider+model combinations this
        code actually knows how to call are selectable; there is no free-text model field.
      </p>

      {error && <ErrorState message={error} />}

      <div className="space-y-4">
        {FEATURES.map((f) => {
          const row = rowState[f.feature];
          if (!row) return null;
          const models = data.allowedProviderModels[row.provider] ?? [];
          const needsApiKey = row.provider === "zai" || row.provider === "gemini";
          return (
            <div
              key={f.feature}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{f.label}</h2>
                  <p className="mt-1 max-w-xl text-xs text-gray-500 dark:text-gray-400">
                    {f.description}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateRow(f.feature, { enabled: e.target.checked })}
                  />
                  Enabled
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Provider
                  <select
                    value={row.provider}
                    onChange={(e) => {
                      const nextProvider = e.target.value;
                      const nextModels = data.allowedProviderModels[nextProvider] ?? [];
                      updateRow(f.feature, { provider: nextProvider, model: nextModels[0] ?? "" });
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {providers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
                  Model
                  <select
                    value={row.model}
                    onChange={(e) => updateRow(f.feature, { model: e.target.value })}
                    className="min-w-[260px] rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => save(f.feature)}
                  disabled={row.saving}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {row.saving ? "Saving..." : "Save"}
                </button>
                {row.savedJustNow && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Saved</span>
                )}
              </div>

              {needsApiKey && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                  {row.provider === "zai"
                    ? "Requires a ZAI_API_KEY Worker secret (not yet configured on this account) before this takes effect."
                    : "Requires a GEMINI_API_KEY Worker secret (not yet configured on this account) before this takes effect."}
                </p>
              )}

              {(() => {
                const existing = data.rows.find((r) => r.feature === f.feature);
                return existing ? (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Last updated {new Date(existing.updatedAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Not configured yet -- using the Worker's hardcoded default.
                  </p>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
