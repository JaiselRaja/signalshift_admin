"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  listTurfs,
  listTurfBookings,
  confirmBooking as apiConfirmBooking,
  cancelBookingAdmin,
  completeBooking as apiCompleteBooking,
  markNoShow as apiMarkNoShow,
  listAdminSubscriptions,
  cancelSubscription as apiCancelSubscription,
  ApiError,
  type TurfRead,
  type BookingRead,
  type SubscriptionRead,
} from "@/lib/api";

const STATUS_OPTIONS = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"];

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsContent />
    </Suspense>
  );
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const initialTurfId = searchParams.get("turf");
  const highlightId = searchParams.get("highlight");
  const [turfs, setTurfs] = useState<TurfRead[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRead[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubConfirm, setCancelSubConfirm] = useState<SubscriptionRead | null>(null);
  const [cancelSubReason, setCancelSubReason] = useState("");
  const [showPlanRows, setShowPlanRows] = useState(false);

  const fetchBookings = useCallback(async (turfId: string) => {
    setBookingsLoading(true);
    setError(null);
    try {
      const data = await listTurfBookings(turfId);
      setBookings(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load bookings";
      setError(message);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Load turfs on mount, then fetch bookings for the first turf
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [turfData, subs] = await Promise.all([
          listTurfs(),
          listAdminSubscriptions().catch(() => [] as SubscriptionRead[]),
        ]);
        if (cancelled) return;
        setTurfs(turfData);
        setSubscriptions(subs);
        if (turfData.length > 0) {
          const preferredId = initialTurfId && turfData.some((t) => t.id === initialTurfId)
            ? initialTurfId
            : turfData[0].id;
          setSelectedTurfId(preferredId);
          const bookingData = await listTurfBookings(preferredId);
          if (cancelled) return;
          setBookings(bookingData);
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Failed to load data";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  function handleTurfChange(turfId: string) {
    setSelectedTurfId(turfId);
    fetchBookings(turfId);
  }

  function handleRetry() {
    if (selectedTurfId) {
      fetchBookings(selectedTurfId);
    } else {
      // Re-trigger full init by reloading
      window.location.reload();
    }
  }

  async function handleConfirm(id: string) {
    setActionLoading(id);
    setError(null);
    try {
      const updated = await apiConfirmBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to confirm booking";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    if (!cancelReason.trim()) return;
    setActionLoading(id);
    setError(null);
    try {
      const updated = await cancelBookingAdmin(id, cancelReason.trim());
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setCancelConfirm(null);
      setCancelReason("");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to cancel booking";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete(id: string) {
    setActionLoading(id);
    setError(null);
    try {
      const updated = await apiCompleteBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to complete booking";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleNoShow(id: string) {
    setActionLoading(id);
    setError(null);
    try {
      const updated = await apiMarkNoShow(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to mark no-show";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription() {
    if (!cancelSubConfirm) return;
    if (!cancelSubReason.trim()) return;
    setActionLoading(cancelSubConfirm.id);
    setError(null);
    try {
      await apiCancelSubscription(cancelSubConfirm.id, cancelSubReason.trim());
      // Reload both lists
      const [subs, bookingData] = await Promise.all([
        listAdminSubscriptions().catch(() => subscriptions),
        selectedTurfId ? listTurfBookings(selectedTurfId) : Promise.resolve(bookings),
      ]);
      setSubscriptions(subs);
      setBookings(bookingData);
      setCancelSubConfirm(null);
      setCancelSubReason("");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to cancel subscription";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  // Hide subscription-typed bookings from the main list by default — they're
  // shown grouped in the Active Subscriptions panel instead.
  const visibleBookings = showPlanRows
    ? bookings
    : bookings.filter((b) => b.booking_type !== "subscription");
  const filtered =
    filter === "all" ? visibleBookings : visibleBookings.filter((b) => b.status === filter);

  const activeSubs = subscriptions.filter(
    (s) => s.status === "active" || s.status === "pending",
  );

  const turfNameMap = turfs.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading bookings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            onClick={handleRetry}
            className="rounded-md bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Bookings</h2>
          <p className="text-sm text-slate-500">Manage bookings across all turfs</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Turf Selector */}
          {turfs.length > 0 && (
            <select
              value={selectedTurfId || ""}
              onChange={(e) => handleTurfChange(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-200 outline-none transition-colors hover:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/30"
            >
              {turfs.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filters */}
          <div className="flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  filter === s
                    ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                    : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Subscriptions panel */}
      {activeSubs.length > 0 && (
        <div className="glass-card">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Active subscriptions
              </h2>
              <p className="text-xs text-slate-500">
                Plan members on recurring weekly slots — cancel here to drop all future bookings at once
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showPlanRows}
                onChange={(e) => setShowPlanRows(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-indigo-500"
              />
              Show child bookings in table
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Customer</th>
                  <th>Slots</th>
                  <th>Starts</th>
                  <th>Expires</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSubs.map((s) => {
                  const slots = [...s.slots].sort((a, b) =>
                    a.day_of_week !== b.day_of_week
                      ? a.day_of_week - b.day_of_week
                      : a.start_time.localeCompare(b.start_time),
                  );
                  const slotsLabel = slots
                    .map(
                      (sl) =>
                        `${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][sl.day_of_week]} ${sl.start_time.slice(0, 5)}`,
                    )
                    .join("  ·  ");
                  const busy = actionLoading === s.id;
                  const isPending = s.status === "pending";
                  return (
                    <tr key={s.id}>
                      <td className="font-medium text-white">
                        <div>{s.plan?.name ?? "—"}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="text-xs text-slate-300 font-mono">
                        {s.user_id.slice(0, 8)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {slots.map((sl) => (
                            <span
                              key={sl.id}
                              className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
                            >
                              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][sl.day_of_week]}{" "}
                              {sl.start_time.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">{slotsLabel}</div>
                      </td>
                      <td className="text-xs">{s.starts_on ?? "—"}</td>
                      <td className="text-xs">{s.expires_on ?? "—"}</td>
                      <td className="font-medium text-white">
                        ₹{Number(s.plan?.price || 0).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {s.status}
                        </span>
                        {isPending && s.payment?.utr && (
                          <div className="mt-1 text-[10px] text-slate-500 font-mono">
                            UTR: {s.payment.utr}
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setCancelSubConfirm(s);
                            setCancelSubReason("");
                          }}
                          disabled={busy}
                          className="rounded-md bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
                        >
                          Cancel plan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel subscription confirm modal */}
      {cancelSubConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            setCancelSubConfirm(null);
            setCancelSubReason("");
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0e14] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Cancel this subscription?</h3>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-semibold text-white">
                {cancelSubConfirm.plan?.name ?? "Subscription"}
              </span>{" "}
              · {cancelSubConfirm.slots.length} weekly slot
              {cancelSubConfirm.slots.length === 1 ? "" : "s"}
              <br />
              All future bookings tied to this plan will be cancelled.
            </p>
            <textarea
              value={cancelSubReason}
              onChange={(e) => setCancelSubReason(e.target.value)}
              placeholder="Reason for cancellation (required)"
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-rose-500/50"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCancelSubConfirm(null);
                  setCancelSubReason("");
                }}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={!cancelSubReason.trim() || actionLoading === cancelSubConfirm.id}
                className="flex-1 rounded-full bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {actionLoading === cancelSubConfirm.id ? "Cancelling…" : "Cancel plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {bookingsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Loading bookings...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Turf</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-sm text-slate-500">
                      No bookings found{filter !== "all" ? ` with status "${filter.replace("_", " ")}"` : ""}
                    </td>
                  </tr>
                )}
                {filtered.map((bk) => (
                  <tr
                    key={bk.id}
                    className={bk.id === highlightId ? "ring-2 ring-indigo-400/60 bg-indigo-500/[0.06]" : ""}
                  >
                    <td className="font-mono text-xs text-indigo-400">{bk.id.slice(0, 8)}</td>
                    <td>{turfNameMap[bk.turf_id] || bk.turf_id.slice(0, 8)}</td>
                    <td>
                      <div className="text-sm text-slate-200">{bk.user_name ?? "—"}</div>
                      {bk.user_phone ? (
                        <a
                          href={`tel:${bk.user_phone}`}
                          className="font-mono text-[11px] text-indigo-300 hover:underline"
                        >
                          {bk.user_phone}
                        </a>
                      ) : (
                        <div className="text-[11px] text-slate-500">{bk.user_email ?? ""}</div>
                      )}
                    </td>
                    <td>{bk.booking_date}</td>
                    <td className="text-xs">{bk.start_time} – {bk.end_time}</td>
                    <td className="text-xs">{bk.duration_mins} min</td>
                    <td>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          bk.booking_type === "subscription"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/[0.05] text-slate-300"
                        }`}
                      >
                        {bk.booking_type === "subscription" ? "Plan" : bk.booking_type}
                      </span>
                    </td>
                    <td className="font-medium text-white">
                      {bk.booking_type === "subscription" ? (
                        <span className="text-xs text-emerald-300">Included</span>
                      ) : (
                        <>
                          <div>₹{Number(bk.final_price || 0).toLocaleString()}</div>
                          {Number(bk.discount_amount || 0) > 0 && (
                            <div className="text-[10px] text-emerald-500">-₹{Number(bk.discount_amount || 0).toLocaleString()} disc.</div>
                          )}
                        </>
                      )}
                    </td>
                    <td><StatusBadge status={bk.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        {actionLoading === bk.id ? (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Updating...
                          </span>
                        ) : (
                          <>
                            {bk.status === "pending" && (
                              <button
                                onClick={() => handleConfirm(bk.id)}
                                className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                              >
                                Confirm
                              </button>
                            )}
                            {bk.status === "confirmed" && (
                              <>
                                <button
                                  onClick={() => handleComplete(bk.id)}
                                  className="rounded-md bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleNoShow(bk.id)}
                                  className="rounded-md bg-slate-500/10 px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-500/20"
                                >
                                  No-Show
                                </button>
                              </>
                            )}
                            {(bk.status === "pending" || bk.status === "confirmed") && (
                              <>
                                {cancelConfirm === bk.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={cancelReason}
                                      onChange={(e) => setCancelReason(e.target.value)}
                                      placeholder="Reason..."
                                      className="w-28 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-amber-500/30"
                                    />
                                    <button
                                      onClick={() => handleCancel(bk.id)}
                                      disabled={!cancelReason.trim()}
                                      className="rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/30 disabled:opacity-40"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => { setCancelConfirm(null); setCancelReason(""); }}
                                      className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.08]"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCancelConfirm(bk.id)}
                                    className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    completed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    no_show: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] || styles.cancelled}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
