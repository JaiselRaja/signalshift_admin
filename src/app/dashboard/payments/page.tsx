"use client";

import { useCallback, useEffect, useState } from "react";
import { listPayments, ApiError } from "@/lib/api";
import type { PaymentRead } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  initiated: "bg-amber-500/10 text-amber-400",
  failed: "bg-rose-500/10 text-rose-400",
  refunded: "bg-sky-500/10 text-sky-400",
  processing: "bg-indigo-500/10 text-indigo-400",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPayments();
      setPayments(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const totalRevenue = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + (p.refund_amount ?? 0), 0);

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
              <th>Transaction ID</th>
              <th>Booking</th>
              <th>Gateway</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-5 animate-pulse rounded bg-white/[0.04]" /></td></tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-500">No transactions yet</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-indigo-400">{p.id.slice(0, 8)}</td>
                  <td className="font-mono text-xs">{p.booking_id.slice(0, 8)}</td>
                  <td className="capitalize">{p.gateway}</td>
                  <td>{p.payment_method || "—"}</td>
                  <td className="font-medium text-white">₹{p.amount.toLocaleString()}</td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[p.status] || STATUS_STYLES.initiated}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
