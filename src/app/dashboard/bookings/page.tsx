"use client";

import { useState, useEffect } from "react";

interface Booking {
  id: string;
  user: string;
  email: string;
  turf: string;
  date: string;
  start: string;
  end: string;
  status: string;
  type: string;
  amount: number;
  createdAt: string;
}

const STORAGE_KEY = "signal_shift_bookings";

const DEFAULT_BOOKINGS: Booking[] = [
  { id: "BK-2401", user: "Rahul Sharma", email: "rahul@email.com", turf: "Neptune Arena", date: "2026-04-11", start: "18:00", end: "19:00", status: "confirmed", type: "regular", amount: 1200, createdAt: "2 hours ago" },
  { id: "BK-2400", user: "Priya Patel", email: "priya@email.com", turf: "Thunderbolt Ground", date: "2026-04-11", start: "19:00", end: "20:00", status: "pending", type: "regular", amount: 1500, createdAt: "3 hours ago" },
  { id: "BK-2399", user: "Arjun Mehta", email: "arjun@email.com", turf: "Neptune Arena", date: "2026-04-12", start: "17:00", end: "18:00", status: "confirmed", type: "tournament", amount: 1200, createdAt: "5 hours ago" },
  { id: "BK-2398", user: "Sneha Gupta", email: "sneha@email.com", turf: "Solar Field", date: "2026-04-12", start: "20:00", end: "21:00", status: "confirmed", type: "regular", amount: 1800, createdAt: "6 hours ago" },
  { id: "BK-2397", user: "Vikram Singh", email: "vikram@email.com", turf: "Thunderbolt Ground", date: "2026-04-13", start: "18:00", end: "19:00", status: "cancelled", type: "regular", amount: 1500, createdAt: "1 day ago" },
  { id: "BK-2396", user: "Ananya Roy", email: "ananya@email.com", turf: "Neptune Arena", date: "2026-04-13", start: "19:00", end: "20:00", status: "completed", type: "practice", amount: 1000, createdAt: "1 day ago" },
  { id: "BK-2395", user: "Karan Joshi", email: "karan@email.com", turf: "Orbit Turf", date: "2026-04-10", start: "16:00", end: "17:30", status: "no_show", type: "regular", amount: 2100, createdAt: "2 days ago" },
];

const STATUS_OPTIONS = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load bookings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBookings(JSON.parse(stored));
      } else {
        setBookings(DEFAULT_BOOKINGS);
      }
    } catch {
      setBookings(DEFAULT_BOOKINGS);
    }
    setLoaded(true);
  }, []);

  // Persist bookings to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    }
  }, [bookings, loaded]);

  function confirmBooking(id: string) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "confirmed" } : b))
    );
  }

  function cancelBooking(id: string) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))
    );
  }

  function deleteBooking(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Bookings</h2>
          <p className="text-sm text-slate-500">Manage bookings across all turfs</p>
        </div>
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

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Turf</th>
                <th>Date</th>
                <th>Time Slot</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-500">
                    No bookings found{filter !== "all" ? ` with status "${filter.replace("_", " ")}"` : ""}
                  </td>
                </tr>
              )}
              {filtered.map((bk) => (
                <tr key={bk.id}>
                  <td className="font-mono text-xs text-indigo-400">{bk.id}</td>
                  <td>
                    <div className="font-medium text-white">{bk.user}</div>
                    <div className="text-[11px] text-slate-600">{bk.email}</div>
                  </td>
                  <td>{bk.turf}</td>
                  <td>{bk.date}</td>
                  <td className="text-xs">{bk.start} – {bk.end}</td>
                  <td>
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium capitalize text-slate-300">{bk.type}</span>
                  </td>
                  <td className="font-medium text-white">₹{bk.amount.toLocaleString()}</td>
                  <td><StatusBadge status={bk.status} /></td>
                  <td>
                    <div className="flex gap-1">
                      {bk.status === "pending" && (
                        <button
                          onClick={() => confirmBooking(bk.id)}
                          className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                          Confirm
                        </button>
                      )}
                      {(bk.status === "pending" || bk.status === "confirmed") && (
                        <button
                          onClick={() => cancelBooking(bk.id)}
                          className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                        >
                          Cancel
                        </button>
                      )}
                      {/* Delete button */}
                      {deleteConfirm === bk.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteBooking(bk.id)}
                            className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-medium text-rose-400 transition-colors hover:bg-rose-500/30"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.08]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(bk.id)}
                          className="rounded-md bg-rose-500/10 p-1 text-rose-400 transition-colors hover:bg-rose-500/20"
                          title="Delete booking"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    no_show: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] || styles.cancelled}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
