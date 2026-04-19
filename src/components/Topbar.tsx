"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkHealth, clearToken } from "@/lib/api";

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string }> = {
  "/dashboard": { title: "Dashboard", breadcrumb: "Overview" },
  "/dashboard/turfs": { title: "Turfs", breadcrumb: "Management → Turfs" },
  "/dashboard/bookings": { title: "Bookings", breadcrumb: "Management → Bookings" },
  "/dashboard/users": { title: "Users", breadcrumb: "Management → Users" },
  "/dashboard/teams": { title: "Teams", breadcrumb: "Management → Teams" },
  "/dashboard/tournaments": { title: "Tournaments", breadcrumb: "Management → Tournaments" },
  "/dashboard/payments": { title: "Payments", breadcrumb: "Finance → Payments" },
  "/dashboard/pricing": { title: "Pricing Rules", breadcrumb: "Finance → Pricing" },
  "/dashboard/settings": { title: "Settings", breadcrumb: "System → Settings" },
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  const fallback = pathname.startsWith("/dashboard/turfs/")
    ? { title: "Turf Detail", breadcrumb: "Management → Turfs → Detail" }
    : { title: "Page", breadcrumb: "" };
  const page = PAGE_TITLES[pathname] || fallback;

  useEffect(() => {
    checkHealth().then(setApiOnline);
    const interval = setInterval(() => checkHealth().then(setApiOnline), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0a0b0f]/80 px-6 backdrop-blur-xl">
      {/* Left — Title & Breadcrumb */}
      <div>
        <h1 className="text-lg font-semibold text-white">{page.title}</h1>
        <p className="text-xs text-slate-500">{page.breadcrumb}</p>
      </div>

      {/* Right — Search + Status */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-white/[0.06] bg-white/[0.03] pl-9 pr-4 text-sm text-slate-300 placeholder-slate-600 outline-none transition-all focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-600">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            3
          </span>
        </button>

        {/* API Status */}
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              apiOnline === null
                ? "animate-pulse bg-amber-400"
                : apiOnline
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                  : "bg-rose-400 shadow-sm shadow-rose-400/50"
            }`}
          />
          <span className="text-xs font-medium text-slate-400">
            {apiOnline === null ? "Checking..." : apiOnline ? "API Online" : "API Offline"}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign out"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
