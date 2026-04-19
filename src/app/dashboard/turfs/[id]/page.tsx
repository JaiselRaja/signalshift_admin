"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import {
  getTurf,
  updateTurf,
  listSlotRules,
  createSlotRule,
  updateSlotRule,
  deleteSlotRule,
  listOverrides,
  createOverride,
  deleteOverride,
  TurfRead,
  SlotRuleRead,
  SlotOverrideRead,
} from "@/lib/api";

type Tab = "info" | "rules" | "overrides" | "pricing";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TurfDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [turf, setTurf] = useState<TurfRead | null>(null);
  const [rules, setRules] = useState<SlotRuleRead[]>([]);
  const [overrides, setOverrides] = useState<SlotOverrideRead[]>([]);
  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, r, o] = await Promise.all([
        getTurf(id),
        listSlotRules(id),
        listOverrides(id),
      ]);
      setTurf(t);
      setRules(r);
      setOverrides(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load turf.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !turf) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
      </div>
    );
  }

  if (error || !turf) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-300">
        {error ?? "Turf not found."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/turfs" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            All turfs
          </Link>
          <h1 className="text-2xl font-bold text-white">{turf.name}</h1>
          <p className="text-sm text-slate-500">
            {turf.city ?? "—"} · <span className="font-mono text-slate-400">{turf.slug}</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${turf.is_active ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/30"}`}>
          {turf.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {[
          { key: "info", label: "Info" },
          { key: "rules", label: "Slot Rules" },
          { key: "overrides", label: "Overrides" },
          { key: "pricing", label: "Pricing" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-indigo-400 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "info" && <InfoTab turf={turf} onSaved={refresh} />}
      {tab === "rules" && <RulesTab turfId={id} rules={rules} onChanged={refresh} />}
      {tab === "overrides" && <OverridesTab turfId={id} overrides={overrides} onChanged={refresh} />}
      {tab === "pricing" && <PricingTab />}
    </div>
  );
}

/* ─── Info tab ─────────────────────────────────── */

function InfoTab({ turf, onSaved }: { turf: TurfRead; onSaved: () => void }) {
  const [name, setName] = useState(turf.name);
  const [slug, setSlug] = useState(turf.slug);
  const [city, setCity] = useState(turf.city ?? "");
  const [address, setAddress] = useState(turf.address ?? "");
  const [sportTypes, setSportTypes] = useState((turf.sport_types ?? []).join(", "));
  const [isActive, setIsActive] = useState(turf.is_active);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await updateTurf(turf.id, {
        name: name.trim(),
        slug: slug.trim(),
        city: city.trim() || null,
        address: address.trim() || null,
        sport_types: sportTypes.split(",").map((s) => s.trim()).filter(Boolean),
        is_active: isActive,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="grid max-w-3xl gap-5">
      <Row>
        <Field label="Name">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Slug">
          <input className={INPUT} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="City">
          <input className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Sport Types (comma-separated)">
          <input className={INPUT} value={sportTypes} onChange={(e) => setSportTypes(e.target.value)} />
        </Field>
      </Row>
      <Field label="Address">
        <textarea rows={2} className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-white/[0.1] bg-white/[0.04]" />
        Active (visible to users)
      </label>

      {err && <div className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{err}</div>}

      <div>
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/* ─── Rules tab ───────────────────────────────── */

type RuleGroup = {
  key: string;
  days: number[];
  ruleIds: string[];
  start_time: string;
  end_time: string;
  duration_mins: number;
  slot_type: string;
  base_price: number;
  max_capacity: number;
};

function groupRules(rules: SlotRuleRead[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();
  for (const r of rules) {
    const key = `${r.start_time}|${r.end_time}|${r.duration_mins}|${r.slot_type}|${r.base_price}|${r.max_capacity}`;
    const existing = map.get(key);
    if (existing) {
      existing.days.push(r.day_of_week);
      existing.ruleIds.push(r.id);
    } else {
      map.set(key, {
        key,
        days: [r.day_of_week],
        ruleIds: [r.id],
        start_time: r.start_time,
        end_time: r.end_time,
        duration_mins: r.duration_mins,
        slot_type: r.slot_type,
        base_price: Number(r.base_price),
        max_capacity: r.max_capacity,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function RulesTab({
  turfId,
  rules,
  onChanged,
}: {
  turfId: string;
  rules: SlotRuleRead[];
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<{ kind: "list" } | { kind: "create" } | { kind: "edit"; group: RuleGroup }>({ kind: "list" });
  const groups = groupRules(rules);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Operating Hours & Slots</h2>
          <p className="text-xs text-slate-500">Rules that define which time slots are bookable each day.</p>
        </div>
        {mode.kind === "list" && (
          <button onClick={() => setMode({ kind: "create" })} className={BTN_PRIMARY}>+ Add Rule</button>
        )}
      </div>

      {mode.kind === "create" && (
        <RuleForm
          turfId={turfId}
          onClose={() => setMode({ kind: "list" })}
          onSaved={() => { setMode({ kind: "list" }); onChanged(); }}
        />
      )}

      {mode.kind === "edit" && (
        <RuleForm
          turfId={turfId}
          editing={mode.group}
          onClose={() => setMode({ kind: "list" })}
          onSaved={() => { setMode({ kind: "list" }); onChanged(); }}
        />
      )}

      {groups.length === 0 && mode.kind === "list" ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
          No slot rules yet. Add one to make this turf bookable.
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <RuleGroupRow
              key={g.key}
              group={g}
              onEdit={() => setMode({ kind: "edit", group: g })}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RuleGroupRow({
  group,
  onEdit,
  onChanged,
}: {
  group: RuleGroup;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const dayLabel = group.days.length === 7 ? "all days" : group.days.map((d) => DAYS[d]).join(", ");
    if (!confirm(`Delete this rule for ${dayLabel}? (${group.ruleIds.length} rule${group.ruleIds.length > 1 ? "s" : ""})`)) return;
    setBusy(true);
    try {
      await Promise.all(group.ruleIds.map((id) => deleteSlotRule(id)));
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  const daysLabel = describeDays(group.days);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{daysLabel}</span>
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d, i) => (
            <span
              key={d}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                group.days.includes(i)
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "bg-white/[0.02] text-slate-600"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-base text-slate-100">
            {group.start_time.slice(0, 5)} – {group.end_time.slice(0, 5)}
          </span>
          <span className="text-slate-500">{group.duration_mins}m slots</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            group.slot_type === "peak" ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30"
            : group.slot_type === "offpeak" ? "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30"
            : "bg-slate-500/10 text-slate-300 ring-1 ring-slate-500/30"
          }`}>
            {group.slot_type}
          </span>
          <span className="text-slate-200">₹{group.base_price}</span>
          <span className="text-xs text-slate-500">
            {group.max_capacity === 1 ? "1 court" : `${group.max_capacity} courts`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
            title="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function describeDays(days: number[]): string {
  if (days.length === 7) return "Every day";
  const weekdays = [0, 1, 2, 3, 4];
  const weekend = [5, 6];
  if (days.length === 5 && weekdays.every((d) => days.includes(d))) return "Weekdays";
  if (days.length === 2 && weekend.every((d) => days.includes(d))) return "Weekends";
  return days.sort().map((d) => DAYS[d]).join(" · ");
}

function RuleForm({
  turfId,
  editing,
  onClose,
  onSaved,
}: {
  turfId: string;
  editing?: RuleGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<number[]>(editing?.days ?? []);
  const [startTime, setStartTime] = useState(editing ? editing.start_time.slice(0, 5) : "06:00");
  const [endTime, setEndTime] = useState(editing ? editing.end_time.slice(0, 5) : "23:00");
  const [duration, setDuration] = useState(editing?.duration_mins ?? 60);
  const [slotType, setSlotType] = useState(editing?.slot_type ?? "regular");
  const [basePrice, setBasePrice] = useState(String(editing?.base_price ?? 600));
  const [maxCap, setMaxCap] = useState(editing?.max_capacity ?? 1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = Boolean(editing);

  function toggleDay(i: number) {
    setDays((ds) => (ds.includes(i) ? ds.filter((d) => d !== i) : [...ds, i]));
  }

  function applyPreset(preset: "weekdays" | "weekends" | "all") {
    if (preset === "weekdays") setDays([0, 1, 2, 3, 4]);
    if (preset === "weekends") setDays([5, 6]);
    if (preset === "all") setDays([0, 1, 2, 3, 4, 5, 6]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (days.length === 0) return setErr("Pick at least one day.");
    setErr(null);
    setSaving(true);

    const common = {
      start_time: `${startTime}:00`,
      end_time: `${endTime}:00`,
      duration_mins: duration,
      slot_type: slotType,
      base_price: Number(basePrice),
      max_capacity: maxCap,
    };

    try {
      if (isEdit && editing) {
        // Simplest consistent approach: delete the existing group and recreate
        // with the new day selection. PATCH can't change day_of_week, and
        // day set may have changed.
        await Promise.all(editing.ruleIds.map((id) => deleteSlotRule(id)));
        await Promise.all(days.map((d) => createSlotRule(turfId, { ...common, day_of_week: d })));
      } else {
        await Promise.all(days.map((d) => createSlotRule(turfId, { ...common, day_of_week: d })));
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.04] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{isEdit ? "Edit slot rule" : "New slot rule"}</h3>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
      </div>

      <Field label="Days">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDay(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days.includes(i)
                  ? "bg-indigo-500 text-white"
                  : "bg-white/[0.03] text-slate-400 ring-1 ring-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              {d}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={() => applyPreset("weekdays")} className="text-[10px] text-indigo-400 hover:text-indigo-300">Weekdays</button>
            <span className="text-[10px] text-slate-600">·</span>
            <button type="button" onClick={() => applyPreset("weekends")} className="text-[10px] text-indigo-400 hover:text-indigo-300">Weekends</button>
            <span className="text-[10px] text-slate-600">·</span>
            <button type="button" onClick={() => applyPreset("all")} className="text-[10px] text-indigo-400 hover:text-indigo-300">All days</button>
          </div>
        </div>
      </Field>

      <Row>
        <Field label="Start time">
          <input type="time" className={INPUT} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </Field>
        <Field label="End time">
          <input type="time" className={INPUT} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label="Slot length (mins)">
          <input type="number" min={15} max={480} step={15} className={INPUT} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </Field>
        <Field label="Slot type">
          <select className={INPUT} value={slotType} onChange={(e) => setSlotType(e.target.value)}>
            <option value="regular">Regular</option>
            <option value="peak">Peak</option>
            <option value="offpeak">Off-peak</option>
          </select>
        </Field>
      </Row>
      <Row>
        <Field label="Base price (₹)">
          <input type="number" min={0} step={50} className={INPUT} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
        </Field>
        <Field
          label="Courts"
          hint="Number of simultaneous bookings possible (e.g. 2 if you have 2 courts that can be booked in parallel)."
        >
          <input type="number" min={1} className={INPUT} value={maxCap} onChange={(e) => setMaxCap(Number(e.target.value))} />
        </Field>
      </Row>

      {err && <div className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{err}</div>}

      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : isEdit ? "Save changes" : `Create${days.length > 1 ? ` (${days.length} days)` : ""}`}
        </button>
      </div>
    </form>
  );
}

/* ─── Overrides tab ──────────────────────────── */

function OverridesTab({
  turfId,
  overrides,
  onChanged,
}: {
  turfId: string;
  overrides: SlotOverrideRead[];
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Date Overrides</h2>
          <p className="text-xs text-slate-500">Close on holidays, change hours, or set surge pricing for specific dates.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>+ Add Override</button>
        )}
      </div>

      {showForm && (
        <AddOverrideForm
          turfId={turfId}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); onChanged(); }}
        />
      )}

      {overrides.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-slate-500">
          No overrides yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {overrides.map((o) => <OverrideRow key={o.id} override={o} onDeleted={onChanged} />)}
        </div>
      )}
    </div>
  );
}

function OverrideRow({ override, onDeleted }: { override: SlotOverrideRead; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function handleDelete() {
    if (!confirm("Delete this override?")) return;
    setBusy(true);
    try {
      await deleteOverride(override.id);
      onDeleted();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  const typeColor =
    override.override_type === "closed" ? "bg-rose-500/10 text-rose-300 ring-rose-500/30"
    : override.override_type === "custom_price" ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
    : "bg-sky-500/10 text-sky-300 ring-sky-500/30";

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3 ring-1 ring-white/[0.04]">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono text-slate-200">{override.override_date}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${typeColor}`}>{override.override_type}</span>
        {override.start_time && override.end_time && (
          <span className="font-mono text-slate-400">{override.start_time.slice(0, 5)}–{override.end_time.slice(0, 5)}</span>
        )}
        {override.override_price != null && <span className="text-slate-300">₹{override.override_price}</span>}
        {override.reason && <span className="text-xs italic text-slate-500">“{override.reason}”</span>}
      </div>
      <button onClick={handleDelete} disabled={busy} className="rounded p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300" title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
        </svg>
      </button>
    </div>
  );
}

function AddOverrideForm({
  turfId,
  onClose,
  onCreated,
}: {
  turfId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<"closed" | "custom_hours" | "custom_price">("closed");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setErr("Pick a date.");
    setErr(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        override_date: date,
        override_type: type,
        reason: reason.trim() || null,
      };
      if (type === "custom_hours") {
        if (!startTime || !endTime) throw new Error("Start and end times required for custom hours.");
        body.start_time = `${startTime}:00`;
        body.end_time = `${endTime}:00`;
      }
      if (type === "custom_price") {
        if (!price) throw new Error("Price required for custom price override.");
        body.override_price = Number(price);
      }
      await createOverride(turfId, body);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create override.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.04] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New override</h3>
        <button type="button" onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
      </div>
      <Row>
        <Field label="Date">
          <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Type">
          <select className={INPUT} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="closed">Closed</option>
            <option value="custom_hours">Custom hours</option>
            <option value="custom_price">Custom price</option>
          </select>
        </Field>
      </Row>
      {type === "custom_hours" && (
        <Row>
          <Field label="Start">
            <input type="time" className={INPUT} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="End">
            <input type="time" className={INPUT} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </Row>
      )}
      {type === "custom_price" && (
        <Field label="Override price (₹)">
          <input type="number" min={0} step={50} className={INPUT} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      )}
      <Field label="Reason (optional)">
        <input className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Diwali holiday, Tournament, Maintenance…" />
      </Field>

      {err && <div className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300">{err}</div>}

      <div className="mt-5">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : "Create override"}
        </button>
      </div>
    </form>
  );
}

/* ─── Pricing tab (placeholder) ─────────────── */

function PricingTab() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-sm text-slate-400">
      Dynamic pricing rules (peak-hour multipliers, day specials, etc.) live on the{" "}
      <Link href="/dashboard/pricing" className="text-indigo-400 hover:text-indigo-300">Pricing page</Link>.
      <p className="mt-2 text-xs text-slate-500">Base prices are set per slot rule in the <span className="text-slate-400">Slot Rules</span> tab.</p>
    </div>
  );
}

/* ─── UI helpers ────────────────────────────── */

const INPUT =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:opacity-50";

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
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
