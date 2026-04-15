"use client";

const MOCK_PAYMENTS = [
  { id: "TXN-9001", booking: "BK-2401", user: "Rahul Sharma", gateway: "razorpay", amount: 1200, status: "success", method: "UPI", createdAt: "2026-04-11 16:30" },
  { id: "TXN-9000", booking: "BK-2400", user: "Priya Patel", gateway: "razorpay", amount: 1500, status: "initiated", method: "—", createdAt: "2026-04-11 15:10" },
  { id: "TXN-8999", booking: "BK-2399", user: "Arjun Mehta", gateway: "razorpay", amount: 1200, status: "success", method: "Card", createdAt: "2026-04-11 12:45" },
  { id: "TXN-8998", booking: "BK-2398", user: "Sneha Gupta", gateway: "razorpay", amount: 1800, status: "success", method: "UPI", createdAt: "2026-04-11 10:20" },
  { id: "TXN-8997", booking: "BK-2397", user: "Vikram Singh", gateway: "razorpay", amount: 1500, status: "refunded", method: "UPI", createdAt: "2026-04-10 18:30" },
  { id: "TXN-8996", booking: "BK-2396", user: "Ananya Roy", gateway: "manual", amount: 1000, status: "success", method: "Cash", createdAt: "2026-04-10 16:00" },
];

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400",
  initiated: "bg-amber-500/10 text-amber-400",
  failed: "bg-rose-500/10 text-rose-400",
  refunded: "bg-sky-500/10 text-sky-400",
  processing: "bg-indigo-500/10 text-indigo-400",
};

export default function PaymentsPage() {
  const totalRevenue = MOCK_PAYMENTS.filter((p) => p.status === "success").reduce((s, p) => s + p.amount, 0);
  const refunded = MOCK_PAYMENTS.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Payments</h2>
        <p className="text-sm text-slate-500">Transaction history and revenue tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">₹{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Refunded</div>
          <div className="mt-2 text-2xl font-bold text-sky-400">₹{refunded.toLocaleString()}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Transactions</div>
          <div className="mt-2 text-2xl font-bold text-white">{MOCK_PAYMENTS.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Booking</th>
              <th>Customer</th>
              <th>Gateway</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYMENTS.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs text-indigo-400">{p.id}</td>
                <td className="font-mono text-xs">{p.booking}</td>
                <td className="font-medium text-white">{p.user}</td>
                <td className="capitalize">{p.gateway}</td>
                <td>{p.method}</td>
                <td className="font-medium text-white">₹{p.amount.toLocaleString()}</td>
                <td>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="text-xs text-slate-500">{p.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
