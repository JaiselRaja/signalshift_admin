"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAdminRecipients,
  createAdminRecipient,
  updateAdminRecipient,
  deleteAdminRecipient,
  ApiError,
  type AdminRecipientRead,
} from "@/lib/api";

const INPUT =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:opacity-50";

export default function NotificationsSettingsPage() {
  const [recipients, setRecipients] = useState<AdminRecipientRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecipients(await listAdminRecipients());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load recipients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await createAdminRecipient({
        email: newEmail.trim().toLowerCase(),
        label: newLabel.trim() || null,
      });
      setNewEmail("");
      setNewLabel("");
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add recipient.");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(r: AdminRecipientRead) {
    setTogglingId(r.id);
    setError(null);
    try {
      await updateAdminRecipient(r.id, { is_active: !r.is_active });
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to toggle recipient.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(r: AdminRecipientRead) {
    if (!window.confirm(`Remove ${r.email} from notification recipients?`)) return;
    setError(null);
    try {
      await deleteAdminRecipient(r.id);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete recipient.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
        <p className="text-sm text-slate-500">
          People who get BCC&apos;d on payment receipts and failure alerts.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            type="email"
            required
            placeholder="alerts@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={INPUT}
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className={INPUT}
          />
          <button type="submit" disabled={adding || !newEmail.trim()} className={BTN_PRIMARY}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-400">
          No recipients yet. Add one above to start receiving admin alerts.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recipients.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-white">{r.email}</p>
                {r.label && (
                  <p className="text-xs text-slate-400">{r.label}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(r)}
                  disabled={togglingId === r.id}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-opacity disabled:opacity-50 ${
                    r.is_active
                      ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/30"
                  }`}
                >
                  {r.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
