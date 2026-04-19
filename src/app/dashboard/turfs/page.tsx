"use client";

import Link from "next/link";
import { useState, useEffect, FormEvent } from "react";
import { listTurfs, createTurf, updateTurf, ApiError, TurfRead } from "@/lib/api";

const INITIAL_FORM = {
  name: "",
  slug: "",
  city: "",
  address: "",
  sportTypes: "",
};

export default function TurfsPage() {
  const [turfs, setTurfs] = useState<TurfRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch turfs on mount
  useEffect(() => {
    fetchTurfs();
  }, []);

  async function fetchTurfs() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTurfs();
      setTurfs(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load turfs: ${err.message}`);
      } else {
        setError("Failed to load turfs. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
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
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.slug.trim()) newErrors.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      newErrors.slug = "Only lowercase letters, numbers, and hyphens";
    if (!form.city.trim()) newErrors.city = "City is required";
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const newTurf = await createTurf({
        name: form.name.trim(),
        slug: form.slug.trim(),
        city: form.city.trim(),
        address: form.address.trim() || null,
        sport_types: form.sportTypes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setTurfs((prev) => [newTurf, ...prev]);
      setForm(INITIAL_FORM);
      setFormErrors({});
      setSlugTouched(false);
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormErrors({ _form: err.message });
      } else {
        setFormErrors({ _form: "Failed to create turf. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(turf: TurfRead) {
    setTogglingId(turf.id);
    try {
      const updated = await updateTurf(turf.id, { is_active: !turf.is_active });
      setTurfs((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to update turf status.";
      setError(msg);
    } finally {
      setTogglingId(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">All Turfs</h2>
            <p className="text-sm text-slate-500">
              Manage your facilities, slot rules, and overrides
            </p>
          </div>
        </div>
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading turfs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">All Turfs</h2>
          <p className="text-sm text-slate-500">
            Manage your facilities, slot rules, and overrides
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setForm(INITIAL_FORM);
              setFormErrors({});
              setSlugTouched(false);
            }
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          {showForm ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          {showForm ? "Cancel" : "Create Turf"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card flex items-center gap-3 border-rose-500/20 bg-rose-500/[0.05] p-4">
          <svg className="h-5 w-5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Create New Turf</h3>

          {formErrors._form && (
            <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-4 py-3 text-sm text-rose-300">
              {formErrors._form}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Name"
              placeholder="e.g. Neptune Arena"
              value={form.name}
              onChange={(v) => handleNameChange(v)}
              error={formErrors.name}
              required
            />
            <InputField
              label="Slug"
              placeholder="e.g. neptune-arena"
              value={form.slug}
              onChange={(v) => {
                setSlugTouched(true);
                handleChange("slug", v);
              }}
              error={formErrors.slug}
              required
            />
            <InputField
              label="City"
              placeholder="e.g. Mumbai"
              value={form.city}
              onChange={(v) => handleChange("city", v)}
              error={formErrors.city}
              required
            />
            <InputField
              label="Address"
              placeholder="Full address"
              value={form.address}
              onChange={(v) => handleChange("address", v)}
            />
            <InputField
              label="Sport Types"
              placeholder="Football, Cricket"
              value={form.sportTypes}
              onChange={(v) => handleChange("sportTypes", v)}
              hint="Comma-separated"
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Turf"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(INITIAL_FORM);
                setFormErrors({});
                setSlugTouched(false);
              }}
              className="rounded-lg bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {turfs.length === 0 && !showForm && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">No turfs yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first turf to get started
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Your First Turf
          </button>
        </div>
      )}

      {/* Turf Grid */}
      {turfs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {turfs.map((turf, index) => (
            <div
              key={turf.id}
              className="glass-card group overflow-hidden transition-all hover:border-white/[0.12]"
              style={{ animation: `fadeIn 0.4s ease-out ${index * 0.05}s both` }}
            >
              {/* Color bar */}
              <div
                className={`h-1 w-full ${
                  turf.is_active
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : "bg-slate-700"
                }`}
              />
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {turf.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {turf.city || "No city"} · {turf.slug}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      turf.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {turf.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Address */}
                {turf.address && (
                  <p className="mt-2 truncate text-xs text-slate-500">
                    {turf.address}
                  </p>
                )}

                {/* Sport Tags */}
                {turf.sport_types.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {turf.sport_types.map((sport) => (
                      <span
                        key={sport}
                        className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                  <Link
                    href={`/dashboard/turfs/${turf.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    Manage
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                  <div className="flex gap-1">
                    {/* Toggle Active */}
                    <button
                      onClick={() => toggleActive(turf)}
                      disabled={togglingId === turf.id}
                      className="rounded-md bg-white/[0.04] p-1.5 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      title={turf.is_active ? "Deactivate" : "Activate"}
                    >
                      {togglingId === turf.id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                      ) : turf.is_active ? (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  hint,
  required,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
        {required && <span className="text-rose-400">*</span>}
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
      {hint && !error && <p className="mt-1 text-[11px] text-slate-600">{hint}</p>}
    </div>
  );
}
