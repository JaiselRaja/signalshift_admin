"use client";

import { useState, useEffect, FormEvent } from "react";

interface Tournament {
  id: string;
  name: string;
  slug: string;
  sport: string;
  format: string;
  status: string;
  maxTeams: number;
  registeredTeams: number;
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: string;
  createdAt: string;
}

const STORAGE_KEY = "signal_shift_tournaments";

const FORMAT_OPTIONS = ["league", "knockout", "group_knockout", "round_robin"];
const SPORT_OPTIONS = ["Football", "Cricket", "Hockey", "Badminton", "Tennis"];
const STATUS_OPTIONS_FILTER = ["all", "draft", "registration_open", "registration_closed", "in_progress", "completed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  registration_open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  registration_closed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_progress: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  completed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const INITIAL_FORM = {
  name: "",
  slug: "",
  sport: "Football",
  format: "knockout",
  maxTeams: "16",
  startDate: "",
  endDate: "",
  entryFee: "",
  prizePool: "",
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [filter, setFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setTournaments(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
  }, [tournaments, loaded]);

  function generateSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  }

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      ...(slugTouched ? {} : { slug: generateSlug(value) }),
    }));
  }

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.slug.trim()) e.slug = "Required";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = "Lowercase, numbers, hyphens only";
    if (tournaments.some((t) => t.slug === form.slug)) e.slug = "Slug already exists";
    if (!form.startDate) e.startDate = "Required";
    if (!form.maxTeams || parseInt(form.maxTeams) < 2) e.maxTeams = "Min 2 teams";
    if (form.entryFee && isNaN(parseFloat(form.entryFee))) e.entryFee = "Must be a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    const t: Tournament = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      slug: form.slug.trim(),
      sport: form.sport,
      format: form.format,
      status: "draft",
      maxTeams: parseInt(form.maxTeams),
      registeredTeams: 0,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      entryFee: form.entryFee ? parseFloat(form.entryFee) : 0,
      prizePool: form.prizePool.trim() || "TBD",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTournaments((prev) => [t, ...prev]);
    resetForm();
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setErrors({});
    setSlugTouched(false);
    setShowForm(false);
  }

  function updateStatus(id: string, status: string) {
    setTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function deleteTournament(id: string) {
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  }

  const filtered = filter === "all" ? tournaments : tournaments.filter((t) => t.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Tournaments</h2>
          <p className="text-sm text-slate-500">Create and manage tournament events</p>
        </div>
        <button
          onClick={() => { showForm ? resetForm() : setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          {showForm ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          )}
          {showForm ? "Cancel" : "Create Tournament"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">New Tournament</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InputField label="Name" placeholder="e.g. Weekend Warriors League" value={form.name} onChange={handleNameChange} error={errors.name} required />
            <InputField label="Slug" placeholder="e.g. wwl-2026" value={form.slug} onChange={(v) => { setSlugTouched(true); handleChange("slug", v); }} error={errors.slug} required />
            <SelectField label="Sport" value={form.sport} options={SPORT_OPTIONS} onChange={(v) => handleChange("sport", v)} />
            <SelectField label="Format" value={form.format} options={FORMAT_OPTIONS} onChange={(v) => handleChange("format", v)} />
            <InputField label="Max Teams" placeholder="16" type="number" value={form.maxTeams} onChange={(v) => handleChange("maxTeams", v)} error={errors.maxTeams} required />
            <InputField label="Start Date" type="date" value={form.startDate} onChange={(v) => handleChange("startDate", v)} error={errors.startDate} required />
            <InputField label="End Date" type="date" value={form.endDate} onChange={(v) => handleChange("endDate", v)} />
            <InputField label="Entry Fee (₹)" placeholder="2000" type="number" value={form.entryFee} onChange={(v) => handleChange("entryFee", v)} error={errors.entryFee} />
            <InputField label="Prize Pool" placeholder="₹50,000" value={form.prizePool} onChange={(v) => handleChange("prizePool", v)} />
          </div>
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]">
              Create Tournament
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1]">
              Cancel
            </button>
          </div>
        </form>
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

      {/* Empty State */}
      {tournaments.length === 0 && !showForm && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-3xl">
            🏆
          </div>
          <h3 className="text-sm font-semibold text-white">No tournaments yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first tournament to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create First Tournament
          </button>
        </div>
      )}

      {/* No results for filter */}
      {tournaments.length > 0 && filtered.length === 0 && (
        <div className="glass-card py-12 text-center">
          <p className="text-sm text-slate-500">No tournaments with status &quot;{filter.replace(/_/g, " ")}&quot;</p>
        </div>
      )}

      {/* Tournament Cards */}
      <div className="space-y-4">
        {filtered.map((t, index) => (
          <div
            key={t.id}
            className="glass-card overflow-hidden transition-all hover:border-white/[0.12]"
            style={{ animation: `fadeIn 0.4s ease-out ${index * 0.05}s both` }}
          >
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left — Info */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-lg shadow-lg shadow-violet-500/20">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[t.status] || STATUS_COLORS.draft}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>🏃 {t.sport}</span>
                    <span>📋 {t.format.replace(/_/g, " ")}</span>
                    <span>📅 {t.startDate}</span>
                    {t.entryFee > 0 && <span>💰 ₹{t.entryFee.toLocaleString()} entry</span>}
                  </div>
                </div>
              </div>

              {/* Right — Stats + Actions */}
              <div className="flex items-center gap-6">
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-sm font-bold text-white">{t.registeredTeams}/{t.maxTeams}</div>
                    <div className="text-[10px] text-slate-500">Teams</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-400">{t.prizePool}</div>
                    <div className="text-[10px] text-slate-500">Prize Pool</div>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="flex gap-1">
                  {t.status === "draft" && (
                    <button
                      onClick={() => updateStatus(t.id, "registration_open")}
                      className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    >
                      Open Registration
                    </button>
                  )}
                  {t.status === "registration_open" && (
                    <button
                      onClick={() => updateStatus(t.id, "registration_closed")}
                      className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      Close Registration
                    </button>
                  )}
                  {t.status === "registration_closed" && (
                    <button
                      onClick={() => updateStatus(t.id, "in_progress")}
                      className="rounded-md bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
                    >
                      Start
                    </button>
                  )}
                  {t.status === "in_progress" && (
                    <button
                      onClick={() => updateStatus(t.id, "completed")}
                      className="rounded-md bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-400 transition-colors hover:bg-sky-500/20"
                    >
                      Complete
                    </button>
                  )}

                  {/* Delete */}
                  {deleteConfirm === t.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteTournament(t.id)} className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-medium text-rose-400 transition-colors hover:bg-rose-500/30">
                        Yes, Delete
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.08]">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(t.id)}
                      className="rounded-md bg-rose-500/10 p-1.5 text-rose-400 transition-colors hover:bg-rose-500/20"
                      title="Delete tournament"
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reusable Components ─────────────────────────────

function InputField({ label, placeholder, type = "text", value, onChange, error, required }: {
  label: string; placeholder?: string; type?: string; value?: string;
  onChange?: (v: string) => void; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}{required && <span className="text-rose-400">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-all ${
          error
            ? "border-rose-500/40 bg-rose-500/[0.03] focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/20"
            : "border-white/[0.06] bg-white/[0.03] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
        }`}
      />
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm capitalize text-white outline-none transition-all focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#161821] capitalize">
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}
