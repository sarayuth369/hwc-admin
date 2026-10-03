import { supabase } from "./supabase";

const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL;

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminApiError("Not signed in", 401);
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(init.headers ?? {}),
  };
  const response = await fetch(`${WORKER_BASE_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminApiError(
      body.error ?? `Request failed (${response.status})`,
      response.status,
      body.code
    );
  }
  return body as T;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  deletedUsers: number;
  confirmedUsers: number;
  unconfirmedUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  aiUsage: null;
  usersWithAuthLoadError: number;
  recentActivity: Array<{
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
  }>;
  serviceStatus: { worker: "ok"; supabaseAdminApi: "ok" | "error" };
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  displayName: string | null;
  status: "active" | "suspended" | "deleted";
  isAdmin: boolean;
  emailConfirmed: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  /** Set when this user's profile exists but their Supabase Auth record
   * couldn't be loaded -- a real, confirmed production case (a corrupted
   * auth.users row), not a client bug. Shown honestly rather than hidden. */
  authLoadError?: string;
}

export interface ListUsersResult {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogRow {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogListResult {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SentNotificationRow {
  id: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  userId: string;
}

export interface ListSentNotificationsResult {
  rows: SentNotificationRow[];
  total: number;
}

export interface AiUsageOverview {
  telemetryAvailable: boolean;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  byRoute: Array<{ route: string; count: number; failureCount: number }>;
  byModel: Array<{ model: string; count: number }>;
  byProvider: Array<{ provider: string; count: number; failureCount: number }>;
  recentFailures: Array<{
    route: string;
    provider: string;
    model: string | null;
    errorCode: string | null;
    createdAt: string;
  }>;
}

export interface PushDispatchResult {
  status: "sent" | "partial" | "failed" | "no_devices" | "not_configured" | "error";
  attempted: number;
  sent: number;
  failed: number;
  invalidTokensDeactivated: number;
  skippedOverLimit: number;
  errorCode?: string;
}

export interface SendNotificationResult {
  recipientCount: number;
  push: PushDispatchResult;
}

export interface ModelRoutingRow {
  feature: string;
  provider: string;
  model: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ModelRoutingOverview {
  configAvailable: boolean;
  rows: ModelRoutingRow[];
  allowedProviderModels: Record<string, string[]>;
}

export interface BillingOverview {
  schemaAvailable: boolean;
  providerConnected: boolean;
  totalFree: number;
  totalPremium: number;
  totalPendingProvider: number;
  rows: Array<{
    userId: string;
    tier: string;
    status: string;
    provider: string;
    currentPeriodEnd: string | null;
    updatedAt: string;
  }>;
  page: number;
  pageSize: number;
  totalCount: number;
}

export const adminApi = {
  getDashboard: () => request<DashboardMetrics>("/api/admin/dashboard"),

  listUsers: (params: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page: number;
    pageSize: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortDir) qs.set("sortDir", params.sortDir);
    qs.set("page", String(params.page));
    qs.set("pageSize", String(params.pageSize));
    return request<ListUsersResult>(`/api/admin/users?${qs.toString()}`);
  },

  getUser: (id: string) => request<AdminUserRow>(`/api/admin/users/${id}`),

  updateUserDisplayName: (id: string, displayName: string) =>
    request<AdminUserRow>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    }),

  suspendUser: (id: string) =>
    request<{ success: true }>(`/api/admin/users/${id}/suspend`, { method: "POST" }),

  unsuspendUser: (id: string) =>
    request<{ success: true }>(`/api/admin/users/${id}/unsuspend`, { method: "POST" }),

  deleteUser: (id: string) =>
    request<{ success: true }>(`/api/admin/users/${id}`, { method: "DELETE" }),

  listAuditLog: (params: { page: number; pageSize: number; action?: string }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("pageSize", String(params.pageSize));
    if (params.action) qs.set("action", params.action);
    return request<AuditLogListResult>(`/api/admin/audit-log?${qs.toString()}`);
  },

  listSentNotifications: (params: { page: number; pageSize: number }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("pageSize", String(params.pageSize));
    return request<ListSentNotificationsResult>(`/api/admin/notifications?${qs.toString()}`);
  },

  sendNotification: (params: {
    targetType: "user" | "broadcast";
    targetEmail?: string;
    category: string;
    title: string;
    body: string;
    /** In-app screen opened when the push is tapped (allowlisted by the Worker). */
    deepLink?: string;
  }) =>
    request<SendNotificationResult>("/api/admin/notifications", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  /** Permanently deletes inbox notification(s). scope "group" removes every
   * copy from the same send (all recipients); "single" only this row. */
  deleteNotification: (id: string, scope: "single" | "group") =>
    request<{ deletedCount: number }>(`/api/admin/notifications/${id}?scope=${scope}`, {
      method: "DELETE",
    }),

  getAiUsage: (
    params: { from?: string; to?: string; route?: string; provider?: string; model?: string } = {}
  ) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.route) qs.set("route", params.route);
    if (params.provider) qs.set("provider", params.provider);
    if (params.model) qs.set("model", params.model);
    const query = qs.toString();
    return request<AiUsageOverview>(`/api/admin/ai-usage${query ? `?${query}` : ""}`);
  },

  getModelRouting: () => request<ModelRoutingOverview>("/api/admin/model-routing"),

  setModelRouting: (feature: string, update: { provider: string; model: string; enabled: boolean }) =>
    request<ModelRoutingRow>(`/api/admin/model-routing/${feature}`, {
      method: "PUT",
      body: JSON.stringify(update),
    }),

  getBilling: (params: { page: number; pageSize: number }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("pageSize", String(params.pageSize));
    return request<BillingOverview>(`/api/admin/billing?${qs.toString()}`);
  },
};
