"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listTurfs, listTurfBookings, listTeams, listTournaments, listUsers, ApiError } from "@/lib/api";
import type { BookingRead, TurfRead, TournamentRead } from "@/lib/api";

interface DashboardStats {
  totalBookings: number;
  revenue: number;
  activeUsers: number;
  turfCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ totalBookings: 0, revenue: 0, activeUsers: 0, turfCount: 0 });
  const [recentBookings, setRecentBookings] = useState<(BookingRead & { turfName: string })[]>([]);
  const [tournaments, setTournaments] = useState<TournamentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [turfs, users, tourns] = await Promise.all([
        listTurfs(),
        listUsers().catch(() => []),
        listTournaments().catch(() => []),
      ]);

      setTournaments(tourns.filter((t) => ["in_progress", "registration_open", "registration_closed"].includes(t.status)));
      setStats((prev) => ({ ...prev, turfCount: turfs.length, activeUsers: users.length }));

      // Fetch bookings across all turfs
      const allBookings: (BookingRead & { turfName: string })[] = [];
      const turfMap = new Map<string, string>();
      turfs.forEach((t) => turfMap.set(t.id, t.name));

      for (const turf of turfs.slice(0, 5)) {
        try {
          const bookings = await listTurfBookings(turf.id);
          bookings.forEach((b) => allBookings.push({ ...b, turfName: turf.name }));
        } catch { /* skip */ }
      }

      allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentBookings(allBookings.slice(0, 5));

      const revenue = allBookings
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .reduce((sum, b) => sum + b.final_price, 0);

      setStats({ totalBookings: allBookings.length, revenue, activeUsers: users.length, turfCount: turfs.length });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const STAT_CARDS = [
    { label: "Total Bookings", value: stats.totalBookings.toLocaleString(), icon: "calendar", gradient: "from-indigo-500 to-violet-500", shadowColor: "shadow-indigo-500/20" },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: "currency", gradient: "from-emerald-500 to-teal-500", shadowColor: "shadow-emerald-500/20" },
    { label: "Users", value: stats.activeUsers.toLocaleString(), icon: "users", gradient: "from-sky-500 to-cyan-500", shadowColor: "shadow-sky-500/20" },
    { label: "Turfs", value: stats.turfCount.toLocaleString(), icon: "turf", gradient: "from-amber-500 to-orange-500", shadowColor: "shadow-amber-500/20" },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="ml-4 text-xs font-medium text-rose-300 hover:text-white">Retry</button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card group relative overflow-hidden p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg ${stat.shadowColor} animate-fade-in`}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.15]`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{stat.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} opacity-80`}>
                  <StatIcon type={stat.icon} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-white">
                {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-white/[0.06]" /> : stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Bookings */}
        <div className="glass-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
              <p className="text-xs text-slate-500">Latest booking activity across all turfs</p>
            </div>
            <a href="/dashboard/bookings" className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10">
              View All
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Turf</th><th>Date</th><th>Time</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={6}><div className="h-5 animate-pulse rounded bg-white/[0.04]" /></td></tr>
                  ))
                ) : recentBookings.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No bookings yet</td></tr>
                ) : (
                  recentBookings.map((bk) => (
                    <tr
                      key={bk.id}
                      onClick={() => router.push(`/dashboard/bookings?turf=${bk.turf_id}&highlight=${bk.id}`)}
                      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="font-mono text-xs text-indigo-400 hover:underline">{bk.id.slice(0, 8)}</td>
                      <td className="font-medium text-white">{bk.turfName}</td>
                      <td>{bk.booking_date}</td>
                      <td className="text-xs">{bk.start_time.slice(0, 5)} – {bk.end_time.slice(0, 5)}</td>
                      <td className="font-medium text-white">₹{bk.final_price.toLocaleString()}</td>
                      <td><StatusBadge status={bk.status} /></td>
                    </tr>
                  ))
                )}
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
              {tournaments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No active tournaments</div>
              ) : (
                tournaments.map((t) => (
                  <div key={t.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{t.name}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      <span>{t.format}</span>
                      <span>{t.sport_type}</span>
                      {t.entry_fee && <span>₹{t.entry_fee}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Bookings", href: "/dashboard/bookings" },
                { label: "Add Turf", href: "/dashboard/turfs" },
                { label: "Tournaments", href: "/dashboard/tournaments" },
                { label: "Payments", href: "/dashboard/payments" },
              ].map((action) => (
                <a key={action.label} href={action.href} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center text-xs font-medium text-slate-300 transition-all hover:border-indigo-500/30 hover:bg-indigo-500/5 hover:text-white">
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
    default: return null;
  }
}
