"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { listTurfs, createPricingRule, api, ApiError } from "@/lib/api";
import type { TurfRead, PricingRuleRead } from "@/lib/api";

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
  { value: 0, label: "Mon" }, { value: 1, label: "Tue" }, { value: 2, label: "Wed" },
  { value: 3, label: "Thu" }, { value: 4, label: "Fri" }, { value: 5, label: "Sat" }, { value: 6, label: "Sun" },
];

interface FormState {
  name: string; ruleType: string; priority: string; adjustmentType: string;
  adjustmentValue: string; stackable: boolean; days: number[];
  hourStart: string; hourEnd: string; specificDates: string;
}

const INITIAL_FORM: FormState = {
  name: "", ruleType: "peak_hour", priority: "10", adjustmentType: "percentage",
  adjustmentValue: "", stackable: false, days: [], hourStart: "", hourEnd: "", specificDates: "",
};

export default function PricingPage() {
  const [turfs, setTurfs] = useState<TurfRead[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState<string>("");
  const [rules, setRules] = useState<PricingRuleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTurfs = useCallback(async () => {
    try {
      const data = await listTurfs();
      setTurfs(data);
      if (data.length > 0 && !selectedTurfId) {
        setSelectedTurfId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load turfs");
    }
  }, [selectedTurfId]);

  const fetchRules = useCallback(async (turfId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Slot rules endpoint doesn't have a dedicated pricing-rules GET per turf in the bookings router,
      // but turf slot-rules exist. We'll fetch slot rules as a proxy.
      const data = await api.get<PricingRuleRead[]>(`/turfs/${turfId}/slot-rules`);
      setRules(data);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => { if (selectedTurfId) fetchRules(selectedTurfId); }, [selectedTurfId, fetchRules]);

  function handleChange(field: keyof FormState, value: string | boolean | number[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors((prev) => { const n = { ...prev }; delete n[field as string]; return n; });
  }

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev, days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.adjustmentValue.trim()) e.adjustmentValue = "Value is required";
    else if (isNaN(parseFloat(form.adjustmentValue))) e.adjustmentValue = "Must be a valid number";
    if (!form.priority.trim()) e.priority = "Priority is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate() || !selectedTurfId) return;
    setSubmitting(true);

    const conditions: Record<string, unknown> = {};
    if (form.days.length > 0) conditions.days = form.days;
    if (form.hourStart && form.hourEnd) conditions.time_range = [form.hourStart + ":00", form.hourEnd + ":00"];

    try {
      await createPricingRule(selectedTurfId, {
        name: form.name.trim(),
        rule_type: form.ruleType,
        priority: parseInt(form.priority),
        adjustment_type: form.adjustmentType,
        adjustment_value: parseFloat(form.adjustmentValue),
        stackable: form.stackable,
        conditions,
      });
      setForm(INITIAL_FORM);
      setShowForm(false);
      fetchRules(selectedTurfId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Pricing Rules</h2>
          <p className="text-sm text-slate-500">Configure dynamic pricing adjustments per turf</p>
        </div>
        <div className="flex items-center gap-3">
          {turfs.length > 0 && (
            <select
              value={selectedTurfId}
              onChange={(e) => setSelectedTurfId(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40"
            >
              {turfs.map((t) => <option key={t.id} value={t.id} className="bg-[#1c1e2a]">{t.name}</option>)}
            </select>
          )}
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) { setForm(INITIAL_FORM); setErrors({}); } }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            {showForm ? "Cancel" : "Add Rule"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-rose-300 hover:text-white">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-fade-in p-6">
          <h3 className="mb-5 text-sm font-semibold text-white">Create New Pricing Rule</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InputField label="Rule Name" placeholder="e.g. Weekend Peak" value={form.name} onChange={(v) => handleChange("name", v)} error={errors.name} required />
            <SelectField label="Rule Type" value={form.ruleType} options={RULE_TYPES} onChange={(v) => handleChange("ruleType", v)} />
            <InputField label="Priority" placeholder="Lower = higher" type="number" value={form.priority} onChange={(v) => handleChange("priority", v)} error={errors.priority} required />
            <SelectField label="Adjustment Type" value={form.adjustmentType} options={ADJUSTMENT_TYPES} onChange={(v) => handleChange("adjustmentType", v)} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <InputField label="Value" placeholder="e.g. 30 or -15" type="number" value={form.adjustmentValue} onChange={(v) => handleChange("adjustmentValue", v)} error={errors.adjustmentValue} required />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Stackable</label>
              <button type="button" onClick={() => handleChange("stackable", !form.stackable)}
                className={`mt-1 flex h-[42px] items-center gap-2.5 rounded-lg border px-4 text-sm transition-all ${form.stackable ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-white/[0.06] bg-white/[0.03] text-slate-500"}`}>
                <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${form.stackable ? "justify-end bg-indigo-500" : "justify-start bg-slate-600"}`}>
                  <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
                {form.stackable ? "Yes" : "No"}
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${form.days.includes(d.value) ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-400" : "border-white/[0.06] bg-white/[0.03] text-slate-500 hover:text-slate-400"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Hour Range (24h)</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="23" placeholder="Start" value={form.hourStart} onChange={(e) => handleChange("hourStart", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40" />
                <span className="text-slate-500">-</span>
                <input type="number" min="0" max="24" placeholder="End" value={form.hourEnd} onChange={(e) => handleChange("hourEnd", e.target.value)}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40" />
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50">
              {submitting ? "Creating..." : "Create Rule"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(INITIAL_FORM); setErrors({}); }} className="rounded-lg bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.1]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card h-20 animate-pulse" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-sm font-semibold text-white">No pricing rules yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first rule to start dynamic pricing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`glass-card overflow-hidden transition-all hover:border-white/[0.12] ${!rule.is_active ? "opacity-50" : ""}`}>
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${rule.adjustment_value > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {rule.adjustment_value > 0 ? "+" : "-"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                      <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400">Priority: {rule.priority}</span>
                      {rule.stackable && <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">Stackable</span>}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{rule.rule_type.replace(/_/g, " ")}</div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${rule.adjustment_value > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {rule.adjustment_value > 0 ? "+" : ""}{rule.adjustment_value}{rule.adjustment_type === "percentage" ? "%" : "₹"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputField({ label, placeholder, type = "text", value, onChange, error, required }: {
  label: string; placeholder: string; type?: string; value?: string;
  onChange?: (v: string) => void; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-400">
        {label}{required && <span className="text-rose-400">*</span>}
      </label>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-all ${error ? "border-rose-500/40 bg-rose-500/[0.03]" : "border-white/[0.06] bg-white/[0.03] focus:border-indigo-500/40"}`} />
      {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
    </div>
  );
}

function SelectField({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/40">
        {options.map((opt) => <option key={opt.value} value={opt.value} className="bg-[#1c1e2a]">{opt.label}</option>)}
      </select>
    </div>
  );
}
