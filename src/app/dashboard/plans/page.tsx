"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createPlan,
  deletePlan as apiDeletePlan,
  listPlansAdmin,
  updatePlan,
  type PlanCreate,
  type PlanRead,
  type PlanType,
} from "@/lib/api";

type FormState = {
  code: string;
  name: string;
  tagline: string;
  plan_type: PlanType;
  price: string;
  price_unit: string;
  hours_per_month: string;
  discount_pct: string;
  advance_window_days: string;
  slot_window_start: string; // "HH:MM" or empty
  slot_window_end: string;
  perks: string; // newline-separated
  featured: boolean;
  display_order: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  tagline: "",
  plan_type: "monthly",
  price: "",
  price_unit: "/month",
  hours_per_month: "",
  discount_pct: "",
  advance_window_days: "",
  slot_window_start: "",
  slot_window_end: "",
  perks: "",
  featured: false,
  display_order: "0",
  is_active: true,
};

function trimToHHMM(value: string | null | undefined): string {
  // Backend returns "HH:MM:SS"; <input type="time"> wants "HH:MM"
  if (!value) return "";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function planToForm(p: PlanRead): FormState {
  return {
    code: p.code,
    name: p.name,
    tagline: p.tagline ?? "",
    plan_type: p.plan_type,
    price: String(p.price),
    price_unit: p.price_unit,
    hours_per_month: p.hours_per_month?.toString() ?? "",
    discount_pct: p.discount_pct?.toString() ?? "",
    advance_window_days: p.advance_window_days?.toString() ?? "",
    slot_window_start: trimToHHMM(p.slot_window_start),
    slot_window_end: trimToHHMM(p.slot_window_end),
    perks: p.perks.join("\n"),
    featured: p.featured,
    display_order: String(p.display_order),
    is_active: p.is_active,
  };
}

function formToPayload(f: FormState): PlanCreate {
  const perks = f.perks
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
  const timeOrNull = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    code: f.code.trim().toLowerCase(),
    name: f.name.trim(),
    tagline: f.tagline.trim() || null,
    plan_type: f.plan_type,
    price: Number(f.price),
    price_unit: f.price_unit.trim() || (f.plan_type === "monthly" ? "/month" : "/hour"),
    hours_per_month: numOrNull(f.hours_per_month),
    discount_pct: numOrNull(f.discount_pct),
    advance_window_days: numOrNull(f.advance_window_days),
    slot_window_start: timeOrNull(f.slot_window_start),
    slot_window_end: timeOrNull(f.slot_window_end),
    perks,
    featured: f.featured,
    display_order: Number(f.display_order || 0),
    is_active: f.is_active,
  };
}

export default function PlansAdminPage() {
  const [plans, setPlans] = useState<PlanRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlanRead | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PlanRead | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await listPlansAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_FORM);
  }

  function startEdit(p: PlanRead) {
    setCreating(false);
    setEditing(p);
    setForm(planToForm(p));
  }

  function closeDrawer() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = formToPayload(form);
      if (editing) {
        // For update, omit `code` (immutable)
        const { code: _drop, ...patch } = payload;
        void _drop;
        await updatePlan(editing.id, patch);
      } else {
        await createPlan(payload);
      }
      closeDrawer();
      await fetchPlans();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(p: PlanRead) {
    setTogglingId(p.id);
    try {
      await updatePlan(p.id, { is_active: !p.is_active });
      await fetchPlans();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to toggle plan");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleFeatured(p: PlanRead) {
    setTogglingId(p.id);
    try {
      // Only one featured at a time per type — clear other monthly featureds first
      if (!p.featured && p.plan_type === "monthly") {
        const otherFeatured = plans.find(
          (x) => x.id !== p.id && x.plan_type === "monthly" && x.featured,
        );
        if (otherFeatured) {
          await updatePlan(otherFeatured.id, { featured: false });
        }
      }
      await updatePlan(p.id, { featured: !p.featured });
      await fetchPlans();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(p: PlanRead) {
    setDeletingId(p.id);
    try {
      await apiDeletePlan(p.id);
      setDeleteConfirm(null);
      await fetchPlans();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const sorted = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.plan_type !== b.plan_type) return a.plan_type === "daily" ? -1 : 1;
        return a.display_order - b.display_order;
      }),
    [plans],
  );

  const drawerOpen = creating || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Plans</h2>
          <p className="text-sm text-slate-500">
            Pricing tiers shown on the public Plans page (Daily Pass + Monthly subscriptions).
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
        >
          + New plan
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <h3 className="font-semibold text-white">No plans yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first plan to populate the public Plans page.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-4 rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
          >
            + New plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((p) => {
            const isInactive = !p.is_active;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-5 transition-colors ${
                  p.featured
                    ? "border-emerald-400/30 bg-emerald-500/[0.04]"
                    : "border-white/[0.06] bg-white/[0.03]"
                } ${isInactive ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">{p.name}</h3>
                      {p.featured && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{p.code}</span> ·{" "}
                      {p.plan_type === "monthly" ? "Monthly" : "Daily"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      p.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400"
                    }`}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">
                    ₹{Number(p.price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-slate-500">{p.price_unit}</span>
                </div>

                {p.tagline && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-400">{p.tagline}</p>
                )}

                {p.plan_type === "monthly" && (
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/[0.03] p-2 text-center">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.hours_per_month ?? "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        hrs/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.discount_pct != null ? `${p.discount_pct}%` : "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        off extras
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {p.advance_window_days ?? "—"}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        days ahead
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p)}
                    disabled={togglingId === p.id}
                    className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>
                  {p.plan_type === "monthly" && (
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(p)}
                      disabled={togglingId === p.id}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        p.featured
                          ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {p.featured ? "★ Featured" : "Feature"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(p)}
                    className="ml-auto rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / create drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
          onClick={closeDrawer}
        >
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-white/[0.06] bg-[#0d0e14] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editing ? `Edit ${editing.name}` : "New plan"}
              </h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-md p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code" hint="lowercase, no spaces">
                  <input
                    type="text"
                    required
                    disabled={!!editing}
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))
                    }
                    className="input"
                    pattern="[a-z0-9_\-]+"
                  />
                </Field>
                <Field label="Type">
                  <select
                    value={form.plan_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        plan_type: e.target.value as PlanType,
                        price_unit: e.target.value === "monthly" ? "/month" : "/hour",
                      }))
                    }
                    className="input"
                  >
                    <option value="monthly" className="bg-[#0d0e14]">Monthly</option>
                    <option value="daily" className="bg-[#0d0e14]">Daily</option>
                  </select>
                </Field>
              </div>

              <Field label="Name">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                />
              </Field>

              <Field label="Tagline" hint="One-line subtitle on the card">
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Price (₹)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label="Unit" hint="e.g. /month">
                  <input
                    type="text"
                    value={form.price_unit}
                    onChange={(e) => setForm((f) => ({ ...f, price_unit: e.target.value }))}
                    className="input"
                  />
                </Field>
                <Field label="Display order">
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, display_order: e.target.value }))
                    }
                    className="input"
                  />
                </Field>
              </div>

              {form.plan_type === "monthly" && (
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <Field label="Hours/mo">
                    <input
                      type="number"
                      min="0"
                      value={form.hours_per_month}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, hours_per_month: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Discount %">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.discount_pct}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, discount_pct: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>
                  <Field label="Advance days">
                    <input
                      type="number"
                      min="0"
                      value={form.advance_window_days}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, advance_window_days: e.target.value }))
                      }
                      className="input"
                    />
                  </Field>

                  <div className="col-span-3 mt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Slot window
                      <span className="ml-1.5 normal-case tracking-normal text-slate-600">
                        · members must pick a recurring start within this range. Leave blank to use full operating hours.
                      </span>
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <Field label="From">
                        <input
                          type="time"
                          value={form.slot_window_start}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, slot_window_start: e.target.value }))
                          }
                          className="input"
                        />
                      </Field>
                      <Field label="Until">
                        <input
                          type="time"
                          value={form.slot_window_end}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, slot_window_end: e.target.value }))
                          }
                          className="input"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              <Field label="Perks" hint="One per line">
                <textarea
                  value={form.perks}
                  onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
                  className="input min-h-[110px] font-mono text-xs"
                  placeholder="4 hours of fixed recurring turf time&#10;5% off any extra bookings&#10;Book up to 3 days in advance"
                />
              </Field>

              <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, featured: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500"
                  />
                  Featured (shows the lime "Most popular" badge — only one allowed)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500"
                  />
                  Active (visible on public Plans page)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={submitting}
                  className="flex-1 rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {submitting ? "Saving…" : editing ? "Save changes" : "Create plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0e14] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">Delete this plan?</h3>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-semibold text-white">{deleteConfirm.name}</span> will be
              permanently removed and disappear from the public Plans page. Consider
              deactivating instead if you want to keep it for later.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deletingId === deleteConfirm.id}
                className="flex-1 rounded-full bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {deletingId === deleteConfirm.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          padding: 8px 12px;
          font-size: 13px;
          color: white;
          outline: none;
          transition: border-color 150ms;
        }
        .input:focus {
          border-color: rgba(99, 102, 241, 0.6);
        }
        .input:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {hint && <span className="ml-1.5 normal-case tracking-normal text-slate-600">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
