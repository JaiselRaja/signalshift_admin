"use client";

import { useState, useEffect, FormEvent } from "react";

// ─── Types ──────────────────────────────────────────────

interface PricingRule {
  id: string;
  name: string;
  ruleType: string;
  priority: number;
  adjustmentType: string;
  adjustmentValue: number;
  stackable: boolean;
  conditions: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────

const STORAGE_KEY = "signal_shift_pricing_rules";

const RULE_TYPES = [
  { value: "peak_hour", label: "Peak Hour" },
  { value: "off_peak", label: "Off Peak" },
  { value: "day_special", label: "Day Special" },
  { value: "holiday", label: "Holiday" },
  { value: "membership", label: "Membership" },
  { value: "early_bird", label: "Early Bird" },
  { value: "surge", label: "Surge" },
  { value: "custom", label: "Custom" },
];

const ADJUSTMENT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat", label: "Flat (₹)" },
  { value: "override", label: "Override Price" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

interface FormState {
  name: string;
  ruleType: string;
  priority: string;
  adjustmentType: string;
  adjustmentValue: string;
  stackable: boolean;
  days: number[];
  hourStart: string;
  hourEnd: string;
  specificDates: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  ruleType: "peak_hour",
  priority: "10",
  adjustmentType: "percentage",
  adjustmentValue: "",
  stackable: false,
  days: [],
  hourStart: "",
  hourEnd: "",
  specificDates: "",
};

const SEED_RULES: PricingRule[] = [
  { id: "seed-1", name: "Weekend Peak", ruleType: "peak_hour", priority: 10, adjustmentType: "percentage", adjustmentValue: 30, stackable: false, conditions: { day_of_week: [5, 6], hour_range: [17, 22] }, isActive: true, createdAt: "2026-04-01" },
  { id: "seed-2", name: "Early Bird Discount", ruleType: "off_peak", priority: 20, adjustmentType: "percentage", adjustmentValue: -15, stackable: true, conditions: { hour_range: [6, 12] }, isActive: true, createdAt: "2026-04-01" },
  { id: "seed-3", name: "Monday Special", ruleType: "day_special", priority: 5, adjustmentType: "flat", adjustmentValue: -200, stackable: true, conditions: { day_of_week: [0] }, isActive: true, createdAt: "2026-04-02" },
  { id: "seed-4", name: "Holiday Surge", ruleType: "holiday", priority: 1, adjustmentType: "percentage", adjustmentValue: 50, stackable: false, conditions: { specific_dates: ["2026-08-15", "2026-10-02"] }, isActive: false, createdAt: "2026-04-03" },
];

// ─── Component ──────────────────────────────────────────

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load from localStorage, seed if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRules(parsed.length > 0 ? parsed : SEED_RULES);
      } else {
        setRules(SEED_RULES);
      }
    } catch {
      setRules(SEED_RULES);
    }
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    }
  }, [rules, loaded]);

  // ─── Form helpers ───────────────────────────────────

  function handleChange(field: keyof FormState, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.adjustmentValue.trim()) newErrors.adjustmentValue = "Value is required";
    else if (isNaN(parseFloat(form.adjustmentValue)))
      newErrors.adjustmentValue = "Must be a valid number";
    if (!form.priority.trim()) newErrors.priority = "Priority is required";
    else if (isNaN(parseInt(form.priority)))
      newErrors.priority = "Must be a valid number";
    if (form.hourStart && form.hourEnd) {
      const s = parseInt(form.hourStart);
      const e = parseInt(form.hourEnd);
      if (!isNaN(s) && !isNaN(e) && s >= e)
        newErrors.hourEnd = "End hour must be after start hour";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const conditions: Record<string, unknown> = {};
    if (form.days.length > 0) conditions.day_of_week = form.days;
    if (form.hourStart && form.hourEnd) {
      conditions.hour_range = [parseInt(form.hourStart), parseInt(form.hourEnd)];
    }
    if (form.specificDates.trim()) {
      conditions.specific_dates = form.specificDates
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const newRule: PricingRule = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      ruleType: form.ruleType,
      priority: parseInt(form.priority),
      adjustmentType: form.adjustmentType,
      adjustmentValue: parseFloat(form.adjustmentValue),
      stackable: form.stackable,
      conditions,
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setRules((prev) => [...prev, newRule].sort((a, b) => a.priority - b.priority));
    setForm(INITIAL_FORM);
    setErrors({});
    setShowForm(false);
  }

  function toggleActive(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Pricing Rules</h2>
          <p className="text-sm text-slate-500">
            Configure dynamic pricing adjustments. Rules are evaluated by
            priority (lower = higher priority).
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setForm(INITIAL_FORM);
              setErrors({});
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
          {showForm ? "Cancel" : "Add Rule"}
        </button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-5 text-sm font-semibold text-white">Create New Pricing Rule</h3>

          {/* Row 1: Core fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InputField
              label="Rule Name"
              placeholder="e.g. Weekend Peak"
              value={form.name}
              onChange={(v) => handleChange("name", v)}
              error={errors.name}
              required
            />
            <SelectField
              label="Rule Type"
              value={form.ruleType}
              options={RULE_TYPES}
              onChange={(v) => handleChange("ruleType", v)}
            />
            <InputField
              label="Priority"
              placeholder="Lower = higher priority"
              type="number"
              value={form.priority}
              onChange={(v) => handleChange("priority", v)}
              error={errors.priority}
              hint="Lower numbers are evaluated first"
              required
            />
            <SelectField
              label="Adjustment Type"
              value={form.adjustmentType}
              options={ADJUSTMENT_TYPES}
              onChange={(v) => handleChange("adjustmentType", v)}
            />
          </div>

          {/* Row 2: Value + Stackable */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InputField
              label="Adjustment Value"
              placeholder={form.adjustmentType === "percentage" ? "e.g. 30 or -15" : "e.g. 200 or -200"}
              type="number"
              value={form.adjustmentValue}
              onChange={(v) => handleChange("adjustmentValue", v)}
              error={errors.adjustmentValue}
              hint={
                form.adjustmentType === "percentage"
                  ? "Positive = surcharge, negative = discount"
                  : form.adjustmentType === "flat"
                  ? "Amount in ₹ (negative for discount)"
                  : "Override base price in ₹"
              }
              required
            />
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                Stackable
              </label>
              <button
                type="button"
                onClick={() => handleChange("stackable", !form.stackable)}
                className={`mt-1 flex h-[42px] items-center gap-2.5 rounded-lg border px-4 text-sm transition-all ${
                  form.stackable
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                    : "border-white/[0.06] bg-white/[0.03] text-slate-500"
                }`}
              >
                <span
                  className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                    form.stackable ? "justify-end bg-indigo-500" : "justify-start bg-slate-600"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform" />
                </span>
                {form.stackable ? "Yes — can stack" : "No — exclusive"}
              </button>
            </div>
            <InputField
              label="Specific Dates"
              placeholder="2026-08-15, 2026-10-02"
              value={form.specificDates}
              onChange={(v) => handleChange("specificDates", v)}
              hint="Comma-separated YYYY-MM-DD"
            />
          </div>

          {/* Row 3: Conditions */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Days of week */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      form.days.includes(day.value)
                        ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-400"
                        : "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:border-white/[0.1] hover:text-slate-400"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Hour range */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                Hour Range (24h)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Start (e.g. 17)"
                  value={form.hourStart}
                  onChange={(e) => handleChange("hourStart", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                />
                <span className="text-slate-500">→</span>
                <input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="End (e.g. 22)"
                  value={form.hourEnd}
                  onChange={(e) => handleChange("hourEnd", e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-all ${
                    errors.hourEnd
                      ? "border-rose-500/40 bg-rose-500/[0.03] focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/20"
                      : "border-white/[0.06] bg-white/[0.03] focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
                  }`}
                />
              </div>
              {errors.hourEnd && (
                <p className="mt-1 text-[11px] text-rose-400">{errors.hourEnd}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98]"
            >
              Create Rule
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(INITIAL_FORM);
                setErrors({});
              }}
              className="rounded-lg bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Empty State ── */}
      {rules.length === 0 && !showForm && (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-white">No pricing rules yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first rule to start dynamic pricing
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Your First Rule
          </button>
        </div>
      )}

      {/* ── Rule Cards ── */}
      {rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={`glass-card overflow-hidden transition-all hover:border-white/[0.12] ${
                !rule.isActive ? "opacity-50" : ""
              }`}
              style={{ animation: `fadeIn 0.4s ease-out ${index * 0.05}s both` }}
            >
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                      rule.adjustmentValue > 0
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {rule.adjustmentValue > 0 ? "↑" : "↓"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {rule.name}
                      </h3>
                      <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        Priority: {rule.priority}
                      </span>
                      {rule.stackable && (
                        <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                          Stackable
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {rule.ruleType.replace(/_/g, " ")} · Conditions:{" "}
                      <code className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-[10px] text-slate-400">
                        {JSON.stringify(rule.conditions)}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`text-lg font-bold ${
                      rule.adjustmentValue > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {rule.adjustmentValue > 0 ? "+" : ""}
                    {rule.adjustmentValue}
                    {rule.adjustmentType === "percentage" ? "%" : "₹"}
                  </div>
                  <div className="flex gap-1">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive(rule.id)}
                      className={`rounded-md p-2 transition-colors ${
                        rule.isActive
                          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                      }`}
                      title={rule.isActive ? "Deactivate" : "Activate"}
                    >
                      {rule.isActive ? "ON" : "OFF"}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="rounded-md bg-white/[0.04] p-2 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      title="Delete rule"
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

// ─── Reusable Form Components ───────────────────────────

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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-all focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1c1e2a] text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
