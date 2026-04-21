"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listTurfs, ApiError } from "@/lib/api";
import type { TurfRead } from "@/lib/api";

export default function PricingPage() {
  const [turfs, setTurfs] = useState<TurfRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTurfs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTurfs(await listTurfs());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load turfs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Pricing</h2>
        <p className="text-sm text-slate-500">
          Base prices and operating hours live on each turf. Pick a turf to manage its slot rules and date overrides.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : turfs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <h3 className="font-semibold text-white">No turfs yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add a turf first, then come back here to configure its slot pricing.
          </p>
          <Link
            href="/dashboard/turfs"
            className="mt-4 rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
          >
            Go to Turfs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {turfs.map((turf) => (
            <Link
              key={turf.id}
              href={`/dashboard/turfs/${turf.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-indigo-400/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{turf.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${turf.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                    {turf.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{turf.city || "—"} · <span className="font-mono">{turf.slug}</span></p>
                {turf.sport_types.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {turf.sport_types.map((s) => (
                      <span key={s} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Slot rules · Overrides
                </span>
                <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">Manage →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
