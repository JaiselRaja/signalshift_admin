"use client";

import { useEffect, useState } from "react";

/* ─── Stat Card Data ─── */
const STATS = [
  {
    label: "Total Bookings",
    value: "1,247",
    change: "+12.5%",
    positive: true,
    icon: "calendar",
    gradient: "from-indigo-500 to-violet-500",
    shadowColor: "shadow-indigo-500/20",
  },
  {
    label: "Revenue (MTD)",
    value: "₹4,82,300",
    change: "+8.2%",
    positive: true,
    icon: "currency",
    gradient: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/20",
  },
  {
    label: "Active Users",
    value: "384",
    change: "+24",
    positive: true,
    icon: "users",
    gradient: "from-sky-500 to-cyan-500",
    shadowColor: "shadow-sky-500/20",
  },
  {
    label: "Turfs",
    value: "6",
    change: "2 active",
    positive: true,
    icon: "turf",
    gradient: "from-amber-500 to-orange-500",
    shadowColor: "shadow-amber-500/20",
  },
];

const RECENT_BOOKINGS = [
  { id: "BK-001", user: "Rahul Sharma", turf: "Neptune Arena", date: "Today", time: "6:00 PM – 7:00 PM", status: "confirmed", amount: "₹1,200" },
  { id: "BK-002", user: "Priya Patel", turf: "Thunderbolt Ground", date: "Today", time: "7:00 PM – 8:00 PM", status: "pending", amount: "₹1,500" },
  { id: "BK-003", user: "Arjun Mehta", turf: "Neptune Arena", date: "Tomorrow", time: "5:00 PM – 6:00 PM", status: "confirmed", amount: "₹1,200" },
  { id: "BK-004", user: "Sneha Gupta", turf: "Solar Field", date: "Tomorrow", time: "8:00 PM – 9:00 PM", status: "confirmed", amount: "₹1,800" },
  { id: "BK-005", user: "Vikram Singh", turf: "Thunderbolt Ground", date: "Apr 13", time: "6:00 PM – 7:00 PM", status: "cancelled", amount: "₹1,500" },
];

const ACTIVE_TOURNAMENTS = [
  { name: "Weekend Warriors League", format: "League", teams: "8/12", status: "in_progress", matches: "12/24" },
  { name: "Champions Cup 2026", format: "Knockout", teams: "16/16", status: "registration_closed", matches: "0/15" },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg ${stat.shadowColor} ${mounted ? "animate-fade-in" : "opacity-0"}`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Gradient orb background */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.15]`} />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {stat.label}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} opacity-80`}>
                  <StatIcon type={stat.icon} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{stat.value}</div>
              <div className={`mt-1 text-xs font-medium ${stat.positive ? "text-emerald-400" : "text-rose-400"}`}>
                {stat.change}
                <span className="ml-1 text-slate-600">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Bookings — 2 cols */}
        <div className="glass-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
              <p className="text-xs text-slate-500">Latest booking activity across all turfs</p>
            </div>
            <a href="/dashboard/bookings" className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10">
              View All →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Turf</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_BOOKINGS.map((bk) => (
                  <tr key={bk.id}>
                    <td className="font-mono text-xs text-indigo-400">{bk.id}</td>
                    <td className="font-medium text-white">{bk.user}</td>
                    <td>{bk.turf}</td>
                    <td>{bk.date}</td>
                    <td className="text-xs">{bk.time}</td>
                    <td className="font-medium text-white">{bk.amount}</td>
                    <td>
                      <StatusBadge status={bk.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Active Tournaments */}
          <div className="glass-card">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Active Tournaments</h2>
              <p className="text-xs text-slate-500">Ongoing & upcoming events</p>
            </div>
            <div className="divide-y divide-white/[0.04] px-5">
              {ACTIVE_TOURNAMENTS.map((t) => (
                <div key={t.name} className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{t.name}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>📋 {t.format}</span>
                    <span>👥 {t.teams} teams</span>
                    <span>⚽ {t.matches} matches</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Booking", href: "/dashboard/bookings", color: "indigo" },
                { label: "Add Turf", href: "/dashboard/turfs", color: "emerald" },
                { label: "Create Tournament", href: "/dashboard/tournaments", color: "violet" },
                { label: "View Payments", href: "/dashboard/payments", color: "amber" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center text-xs font-medium text-slate-300 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-white"
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Sub-components ═══ */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    completed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    registration_closed: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    registration_open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] || styles.draft}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatIcon({ type }: { type: string }) {
  const cn = "h-4 w-4 text-white";
  switch (type) {
    case "calendar":
      return <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case "currency":
      return <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case "users":
      return <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>;
    case "turf":
      return <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>;
    default:
      return null;
  }
}
