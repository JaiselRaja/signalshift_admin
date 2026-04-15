"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";

interface Turf {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  sportTypes: string[];
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: string;
}

const STORAGE_KEY = "signal_shift_turfs";

const INITIAL_FORM: Omit<Turf, "id" | "isActive" | "createdAt" | "sportTypes" | "lat" | "lng"> & {
  sportTypes: string;
  lat: string;
  lng: string;
} = {
  name: "",
  slug: "",
  city: "",
  address: "",
  sportTypes: "",
  lat: "",
  lng: "",
};

export default function TurfsPage() {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);

  // Load turfs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTurfs(JSON.parse(stored));
      }
    } catch {
      // Ignore corrupt data
    }
    setLoaded(true);
  }, []);

  // Persist turfs to localStorage whenever they change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(turfs));
    }
  }, [turfs, loaded]);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Auto-generate slug from name only if user hasn't manually edited slug
  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      ...(slugTouched ? {} : { slug: generateSlug(value) }),
    }));
  }

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
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
    if (turfs.some((t) => t.slug === form.slug))
      newErrors.slug = "A turf with this slug already exists";
    if (form.lat && isNaN(parseFloat(form.lat)))
      newErrors.lat = "Must be a valid number";
    if (form.lng && isNaN(parseFloat(form.lng)))
      newErrors.lng = "Must be a valid number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const newTurf: Turf = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      slug: form.slug.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      sportTypes: form.sportTypes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTurfs((prev) => [newTurf, ...prev]);
    setForm(INITIAL_FORM);
    setErrors({});
    setSlugTouched(false);
    setShowForm(false);
  }

  function toggleActive(id: string) {
    setTurfs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  }

  function deleteTurf(id: string) {
    setTurfs((prev) => prev.filter((t) => t.id !== id));
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
              setErrors({});
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
          {showForm ? "Cancel" : "Add Turf"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Create New Turf</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Name"
              placeholder="e.g. Neptune Arena"
              value={form.name}
              onChange={(v) => handleNameChange(v)}
              error={errors.name}
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
              error={errors.slug}
              required
            />
            <InputField
              label="City"
              placeholder="e.g. Mumbai"
              value={form.city}
              onChange={(v) => handleChange("city", v)}
              error={errors.city}
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
            <InputField
              label="Latitude"
              placeholder="19.0760"
              type="number"
              value={form.lat}
              onChange={(v) => handleChange("lat", v)}
              error={errors.lat}
            />
            <InputField
              label="Longitude"
              placeholder="72.8777"
              type="number"
              value={form.lng}
              onChange={(v) => handleChange("lng", v)}
              error={errors.lng}
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
            >
              Create Turf
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(INITIAL_FORM);
                setErrors({});
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
                  turf.isActive
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
                      {turf.city} · {turf.slug}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      turf.isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {turf.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Address */}
                {turf.address && (
                  <p className="mt-2 truncate text-xs text-slate-500">
                    📍 {turf.address}
                  </p>
                )}

                {/* Sport Tags */}
                {turf.sportTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {turf.sportTypes.map((sport) => (
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
                  <span className="text-xs text-slate-500">
                    Added {turf.createdAt}
                  </span>
                  <div className="flex gap-1">
                    {/* Toggle Active */}
                    <button
                      onClick={() => toggleActive(turf.id)}
                      className="rounded-md bg-white/[0.04] p-1.5 text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                      title={turf.isActive ? "Deactivate" : "Activate"}
                    >
                      {turf.isActive ? (
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
                    {/* Delete */}
                    <button
                      onClick={() => deleteTurf(turf.id)}
                      className="rounded-md bg-white/[0.04] p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Delete"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
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
