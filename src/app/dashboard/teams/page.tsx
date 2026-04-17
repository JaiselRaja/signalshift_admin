"use client";

import { useEffect, useState } from "react";
import { listTeams, ApiError, type TeamRead } from "@/lib/api";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const data = await listTeams();
        if (!cancelled) setTeams(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? `API error ${err.status}: ${err.message}`
              : "Failed to load teams"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Teams</h2>
          <p className="text-sm text-slate-500">View and manage team rosters</p>
        </div>
        {!loading && !error && teams.length > 0 && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-400">
            {teams.length} {teams.length === 1 ? "team" : "teams"}
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
                <div className="space-y-2">
                  <div className="h-3 w-28 rounded bg-white/[0.06]" />
                  <div className="h-2 w-20 rounded bg-white/[0.04]" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="h-5 w-16 rounded-md bg-white/[0.04]" />
                <div className="h-5 w-14 rounded-md bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && teams.length === 0 && (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">No teams yet</h3>
          <p className="mt-1 text-xs text-slate-500">Teams will appear here once they are created.</p>
        </div>
      )}

      {/* Team cards */}
      {!loading && !error && teams.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="glass-card group overflow-hidden transition-all hover:border-white/[0.12]">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                      {team.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">{team.name}</h3>
                    <p className="text-xs text-slate-500">{team.slug}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">
                    {team.sport_type}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      team.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {team.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 border-t border-white/[0.04] pt-3">
                  <p className="text-[11px] text-slate-500">
                    Created {new Date(team.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
