"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon as deleteCouponApi,
  ApiError,
  type CouponRead,
} from "@/lib/api";

const INITIAL_FORM = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: "",
  minBookingAmount: "",
  maxDiscount: "",
  usageLimit: "",
  validFrom: "",
  validUntil: "",
  applicableSports: "",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setError(null);
      const data = await listCoupons();
      setCoupons(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load coupons";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  }

  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const prefix = "SS";
    let code = prefix;
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    setForm((prev) => ({ ...prev, code }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Required";
    else if (!/^[A-Z0-9_-]+$/.test(form.code.toUpperCase()))
      e.code = "Letters, numbers, hyphens only";
    if (coupons.some((c) => c.code === form.code.toUpperCase()))
      e.code = "Code already exists";
    if (!form.discountValue || parseFloat(form.discountValue) <= 0)
      e.discountValue = "Must be greater than 0";
    if (
      form.discountType === "percentage" &&
      parseFloat(form.discountValue) > 100
    )
      e.discountValue = "Max 100%";
    if (!form.validFrom) e.validFrom = "Required";
    if (!form.validUntil) e.validUntil = "Required";
    if (form.validFrom && form.validUntil && form.validFrom > form.validUntil)
      e.validUntil = "Must be after start date";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        code: form.code.toUpperCase().trim(),
        description: form.description.trim(),
        discount_type: form.discountType,
        discount_value: parseFloat(form.discountValue),
        min_booking_amount: form.minBookingAmount
          ? parseFloat(form.minBookingAmount)
          : 0,
        max_discount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usage_limit: form.usageLimit ? parseInt(form.usageLimit) : null,
        valid_from: form.validFrom,
        valid_until: form.validUntil,
        applicable_sports: form.applicableSports
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        is_active: true,
      };

      const created = await createCoupon(body);
      setCoupons((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to create coupon";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setFormErrors({});
    setShowForm(false);
  }

  async function toggleActive(coupon: CouponRead) {
    setTogglingId(coupon.id);
    setError(null);
    try {
      const updated = await updateCoupon(coupon.id, {
        is_active: !coupon.is_active,
      });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? updated : c))
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to update coupon";
      setError(message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await deleteCouponApi(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to delete coupon";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function isExpired(validUntil: string) {
    return new Date(validUntil) < new Date();
  }

  // ─── Loading State ──────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Coupon Codes</h2>
          <p className="text-sm text-slate-500">
            Create and manage discount coupons for bookings
          </p>
        </div>
        <button
          onClick={() => {
            showForm ? resetForm() : setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          {showForm ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          {showForm ? "Cancel" : "Create Coupon"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3">
          <svg
            className="h-4 w-4 shrink-0 text-rose-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="flex-1 text-sm text-rose-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-300"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">
            New Coupon Code
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Code with Generate button */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                Code <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SUMMER20"
                  value={form.code}
                  onChange={(e) =>
                    handleChange("code", e.target.value.toUpperCase())
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono tracking-wider text-white placeholder-slate-600 outline-none transition-all ${
                    formErrors.code
                      ? "border-rose-500/40 bg-rose-500/[0.03]"
                      : "border-white/[0.06] bg-white/[0.03] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  className="shrink-0 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/10"
                  title="Auto-generate code"
                >
                  Generate
                </button>
              </div>
              {formErrors.code && (
                <p className="mt-1 text-[11px] text-rose-400">
                  {formErrors.code}
                </p>
              )}
            </div>

            <InputField
              label="Description"
              placeholder="e.g. Summer sale 20% off"
              value={form.description}
              onChange={(v) => handleChange("description", v)}
            />

            {/* Discount Type */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Discount Type
              </label>
              <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
                <button
                  type="button"
                  onClick={() => handleChange("discountType", "percentage")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    form.discountType === "percentage"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  % Percentage
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("discountType", "flat")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                    form.discountType === "flat"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Flat Amount
                </button>
              </div>
            </div>

            <InputField
              label={
                form.discountType === "percentage"
                  ? "Discount (%)"
                  : "Discount Amount"
              }
              placeholder={
                form.discountType === "percentage" ? "e.g. 20" : "e.g. 500"
              }
              type="number"
              value={form.discountValue}
              onChange={(v) => handleChange("discountValue", v)}
              error={formErrors.discountValue}
              required
            />
            <InputField
              label="Min Booking Amount"
              placeholder="e.g. 1000"
              type="number"
              value={form.minBookingAmount}
              onChange={(v) => handleChange("minBookingAmount", v)}
            />
            {form.discountType === "percentage" && (
              <InputField
                label="Max Discount Cap"
                placeholder="e.g. 500"
                type="number"
                value={form.maxDiscount}
                onChange={(v) => handleChange("maxDiscount", v)}
              />
            )}
            <InputField
              label="Usage Limit"
              placeholder="Unlimited if empty"
              type="number"
              value={form.usageLimit}
              onChange={(v) => handleChange("usageLimit", v)}
            />
            <InputField
              label="Valid From"
              type="date"
              value={form.validFrom}
              onChange={(v) => handleChange("validFrom", v)}
              error={formErrors.validFrom}
              required
            />
            <InputField
              label="Valid Until"
              type="date"
              value={form.validUntil}
              onChange={(v) => handleChange("validUntil", v)}
              error={formErrors.validUntil}
              required
            />
            <InputField
              label="Applicable Sports"
              placeholder="Football, Cricket"
              value={form.applicableSports}
              onChange={(v) => handleChange("applicableSports", v)}
              hint="Comma-separated, empty = all sports"
            />
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {submitting ? "Creating..." : "Create Coupon"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {coupons.length === 0 && !showForm && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <svg
              className="h-8 w-8 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3v4h20v-4a3 3 0 0 1 0-6V5H2v4z" />
              <line x1="9" y1="5" x2="9" y2="19" strokeDasharray="2 2" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">No coupons yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first coupon code to offer discounts
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create First Coupon
          </button>
        </div>
      )}

      {/* Coupon Cards */}
      {coupons.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon, index) => {
            const expired = isExpired(coupon.valid_until);
            const usageFull =
              coupon.usage_limit !== null &&
              coupon.used_count >= coupon.usage_limit;

            return (
              <div
                key={coupon.id}
                className="glass-card group relative overflow-hidden transition-all hover:border-white/[0.12]"
                style={{
                  animation: `fadeIn 0.4s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Status bar */}
                <div
                  className={`h-1 w-full ${
                    !coupon.is_active || expired || usageFull
                      ? "bg-slate-700"
                      : "bg-gradient-to-r from-amber-500 to-orange-500"
                  }`}
                />

                <div className="p-5">
                  {/* Code + Copy */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => copyCode(coupon.code, coupon.id)}
                      className="group/copy flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-amber-400 transition-all hover:bg-amber-500/10"
                      title="Click to copy"
                    >
                      {coupon.code}
                      {copiedId === coupon.id ? (
                        <svg
                          className="h-3.5 w-3.5 text-emerald-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          className="h-3.5 w-3.5 text-slate-500 group-hover/copy:text-amber-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5">
                      {expired && (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                          Expired
                        </span>
                      )}
                      {usageFull && !expired && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                          Limit reached
                        </span>
                      )}
                      {!expired && !usageFull && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            coupon.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {coupon.is_active ? "Active" : "Disabled"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {coupon.description && (
                    <p className="mt-2 text-xs text-slate-500">
                      {coupon.description}
                    </p>
                  )}

                  {/* Discount Info */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-sm font-bold text-indigo-400">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}% OFF`
                        : `${coupon.discount_value} OFF`}
                    </span>
                    {coupon.min_booking_amount > 0 && (
                      <span className="text-[11px] text-slate-500">
                        Min {coupon.min_booking_amount}
                      </span>
                    )}
                    {coupon.max_discount && (
                      <span className="text-[11px] text-slate-500">
                        Max {coupon.max_discount}
                      </span>
                    )}
                  </div>

                  {/* Sports Tags */}
                  {coupon.applicable_sports.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {coupon.applicable_sports.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                    <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                      <span>
                        {coupon.valid_from} &rarr; {coupon.valid_until}
                      </span>
                      <span>
                        Used: {coupon.used_count}
                        {coupon.usage_limit
                          ? `/${coupon.usage_limit}`
                          : " (unlimited)"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleActive(coupon)}
                        disabled={togglingId === coupon.id}
                        className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
                          coupon.is_active
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]"
                        }`}
                        title={coupon.is_active ? "Disable" : "Enable"}
                      >
                        {togglingId === coupon.id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            {coupon.is_active ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </>
                            )}
                          </svg>
                        )}
                      </button>
                      {/* Delete */}
                      {deleteConfirm === coupon.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={deletingId === coupon.id}
                            className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
                          >
                            {deletingId === coupon.id ? "..." : "Yes"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-white/[0.08]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(coupon.id)}
                          className="rounded-md bg-white/[0.04] p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                          title="Delete coupon"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Reusable Components ─────────────────────────────

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
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
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
      {hint && !error && (
        <p className="mt-1 text-[11px] text-slate-600">{hint}</p>
      )}
    </div>
  );
}
