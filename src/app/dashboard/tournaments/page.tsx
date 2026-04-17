"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listTournaments,
  updateTournament,
  ApiError,
  type TournamentRead,
} from "@/lib/api";

const STATUS_OPTIONS_FILTER = [
  "all",
  "draft",
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  registration_open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  registration_closed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  completed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; color: string }> = {
  draft: {
    next: "registration_open",
    label: "Open Registration",
    color: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  },
  registration_open: {
    next: "registration_closed",
    label: "Close Registration",
    color: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  },
  registration_closed: {
    next: "in_progress",
    label: "Start",
    color: "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20",
  },
  in_progress: {
    next: "completed",
    label: "Complete",
    color: "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20",
  },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTournaments();
      setTournaments(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load tournaments: ${err.message} (${err.status})`);
      } else {
        setError("Failed to load tournaments. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      const updated = await updateTournament(id, { status: newStatus });
      setTournaments((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to update status: ${err.message}`);
      } else {
        setError("Failed to update tournament status.");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered =
    filter === "all"
      ? tournaments
      : tournaments.filter((t) => t.status === filter);

  // ─── Loading state ──────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Tournaments</h2>
          <p className="text-sm text-slate-500">
            Create and manage tournament events
          </p>
        </div>
        <div className="glass-card flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-slate-400">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm">Loading tournaments...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Tournaments</h2>
          <p className="text-sm text-slate-500">
            Create and manage tournament events
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-400">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchTournaments}
              className="rounded-md bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30"
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              className="rounded-md bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.08]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {tournaments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS_FILTER.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                filter === s
                  ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                  : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {tournaments.length === 0 && !error && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
            🏆
          </div>
          <h3 className="text-sm font-semibold text-white">
            No tournaments yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tournaments will appear here once created via the API
          </p>
        </div>
      )}

      {/* No results for current filter */}
      {tournaments.length > 0 && filtered.length === 0 && (
        <div className="glass-card py-12 text-center">
          <p className="text-sm text-slate-500">
            No tournaments with status &quot;{filter.replace(/_/g, " ")}&quot;
          </p>
        </div>
      )}

      {/* Tournament Cards */}
      <div className="space-y-4">
        {filtered.map((t, index) => {
          const transition = STATUS_TRANSITIONS[t.status];
          const isUpdating = updatingId === t.id;

          return (
            <div
              key={t.id}
              className="glass-card overflow-hidden transition-all hover:border-white/[0.12]"
              style={{
                animation: `fadeIn 0.4s ease-out ${index * 0.05}s both`,
              }}
            >
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                {/* Left — Info */}
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-lg shadow-lg shadow-violet-500/20">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {t.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${
                          STATUS_COLORS[t.status] || STATUS_COLORS.draft
                        }`}
                      >
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>🏃 {t.sport_type}</span>
                      <span>📋 {t.format.replace(/_/g, " ")}</span>
                      <span>📅 {formatDate(t.tournament_starts)}</span>
                      {t.tournament_ends && (
                        <span>→ {formatDate(t.tournament_ends)}</span>
                      )}
                      {t.entry_fee != null && t.entry_fee > 0 && (
                        <span>💰 ₹{t.entry_fee.toLocaleString()} entry</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right — Stats + Actions */}
                <div className="flex items-center gap-6">
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {t.min_teams}
                        {t.max_teams != null ? `/${t.max_teams}` : "+"}
                      </div>
                      <div className="text-[10px] text-slate-500">Teams</div>
                    </div>
                    {t.entry_fee != null && (
                      <div>
                        <div className="text-sm font-bold text-emerald-400">
                          ₹{t.entry_fee.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Entry Fee
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status transition action */}
                  {transition && (
                    <button
                      onClick={() =>
                        handleStatusChange(t.id, transition.next)
                      }
                      disabled={isUpdating}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${transition.color}`}
                    >
                      {isUpdating ? "Updating..." : transition.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
