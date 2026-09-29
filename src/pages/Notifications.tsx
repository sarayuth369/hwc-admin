import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminApi, SentNotificationRow, AdminApiError } from "../lib/adminApi";
import { LoadingState, ErrorState } from "../components/Common";

const CATEGORIES = ["general", "reminder", "insight", "admin", "system"];
const PAGE_SIZE = 20;

export function Notifications() {
  const [targetType, setTargetType] = useState<"user" | "broadcast">("user");
  const [targetEmail, setTargetEmail] = useState("");
  const [category, setCategory] = useState("admin");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<SentNotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const loadSent = useCallback(() => {
    setLoading(true);
    setListError(null);
    adminApi
      .listSentNotifications({ page, pageSize: PAGE_SIZE })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e: AdminApiError) => setListError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    loadSent();
  }, [loadSent]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    if (targetType === "user" && !targetEmail.trim()) {
      setError("Enter the recipient's email.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      setError("Title and message are both required.");
      return;
    }
    setSending(true);
    try {
      const result = await adminApi.sendNotification({
        targetType,
        targetEmail: targetType === "user" ? targetEmail.trim() : undefined,
        category,
        title: title.trim(),
        body: body.trim(),
      });
      setFeedback(
        `Sent to ${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}.`
      );
      setTitle("");
      setBody("");
      setPage(1);
      loadSent();
    } catch (e) {
      setError((e as AdminApiError).message);
    } finally {
      setSending(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Sends a real row into each recipient's in-app Notifications tab (Supabase-backed,
        RLS-protected — only this admin route can create one). Delivery is "the user opens the
        app and sees it" today; there is no push (FCM) delivery configured yet, so a
        notification will not arrive as a phone push until that's set up separately.
      </p>

      <form
        onSubmit={handleSend}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={targetType === "user"}
              onChange={() => setTargetType("user")}
            />
            Single user
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={targetType === "broadcast"}
              onChange={() => setTargetType("broadcast")}
            />
            Broadcast to everyone
          </label>
        </div>

        {targetType === "user" && (
          <input
            placeholder="Recipient email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        )}

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {error && <ErrorState message={error} />}
        {feedback && (
          <div className="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand dark:bg-brand/20 dark:text-white">
            {feedback}
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Recently sent</h2>
        {listError && <ErrorState message={listError} />}
        {loading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Nothing sent yet.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.body}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.userId}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            {total} sent · page {page} of {totalPages}
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
      </div>
    </div>
  );
}
