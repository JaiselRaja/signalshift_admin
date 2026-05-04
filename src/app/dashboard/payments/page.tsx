"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAdminSubscriptions,
  listPayments,
  verifyPayment,
  rejectPayment,
  ApiError,
} from "@/lib/api";
import type { PaymentRead, SubscriptionRead } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  initiated: "bg-amber-500/10 text-amber-400",
  failed: "bg-rose-500/10 text-rose-400",
  refunded: "bg-sky-500/10 text-sky-400",
  processing: "bg-indigo-500/10 text-indigo-400",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pays, subs] = await Promise.all([
        listPayments(),
        listAdminSubscriptions().catch(() => [] as SubscriptionRead[]),
      ]);
      setPayments(pays);
      setSubscriptions(subs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const subscriptionByPaymentId = useMemo(() => {
    const m = new Map<string, SubscriptionRead>();
    subscriptions.forEach((s) => {
      if (s.payment_id) m.set(s.payment_id, s);
    });
    return m;
  }, [subscriptions]);

  async function handleVerify(paymentId: string) {
    if (!confirm("Confirm this payment? This will also confirm the associated booking.")) return;
    setActingId(paymentId);
    try {
      await verifyPayment(paymentId);
      await fetchPayments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to verify.");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(paymentId: string) {
    const reason = prompt("Reason for rejection? (e.g. UTR not found in bank statement)");
    if (!reason || reason.trim().length < 2) return;
    setActingId(paymentId);
    try {
      await rejectPayment(paymentId, reason.trim());
      await fetchPayments();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to reject.");
    } finally {
      setActingId(null);
    }
  }

  const totalRevenue = payments.filter((p) => p.status === "success").reduce((s, p) => s + Number(p.amount || 0), 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + Number(p.refund_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Payments</h2>
        <p className="text-sm text-slate-500">Transaction history and revenue tracking</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
          <span>{error}</span>
          <button onClick={fetchPayments} className="ml-4 text-xs font-medium text-rose-300 hover:text-white">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/[0.06]" /> : `₹${totalRevenue.toLocaleString()}`}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Refunded</div>
          <div className="mt-2 text-2xl font-bold text-sky-400">
            {loading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-white/[0.06]" /> : `₹${refunded.toLocaleString()}`}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Transactions</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-white/[0.06]" /> : payments.length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Txn</th>
              <th>Booking</th>
              <th>Gateway</th>
              <th>UTR</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="h-5 animate-pulse rounded bg-white/[0.04]" /></td></tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-500">No transactions yet</td></tr>
            ) : (
              payments.map((p) => {
                const isProcessing = p.status === "processing";
                const busy = actingId === p.id;
                const linkedSub = subscriptionByPaymentId.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs text-indigo-400">{p.id.slice(0, 8)}</td>
                    <td className="font-mono text-xs">
                      {linkedSub ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                            Subscription
                          </span>
                          <span className="text-slate-400">
                            {linkedSub.plan?.name ?? linkedSub.plan?.code ?? "—"}
                          </span>
                        </span>
                      ) : p.booking_id ? (
                        p.booking_id.slice(0, 8)
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="capitalize">{p.gateway.replace("_", " ")}</td>
                    <td className="font-mono text-xs text-slate-300">{p.utr ?? "—"}</td>
                    <td className="font-medium text-white">₹{Number(p.amount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[p.status] || STATUS_STYLES.initiated}`}>
                        {p.status}
                      </span>
                      {p.reject_reason && (
                        <div className="mt-1 text-[10px] italic text-rose-300">{p.reject_reason}</div>
                      )}
                    </td>
                    <td className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="text-right">
                      {isProcessing ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleVerify(p.id)}
                            disabled={busy}
                            className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleReject(p.id)}
                            disabled={busy}
                            className="rounded-md bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/25 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
