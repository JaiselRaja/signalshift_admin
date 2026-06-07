"use client";

import type { AvailableSlot } from "@/lib/api";
import { formatTime, formatCurrency, isSlotPast, isSelected } from "@/lib/slotSelection";

type Props = {
  slots: AvailableSlot[];
  selectedSlots: AvailableSlot[];
  onToggleSlot: (slot: AvailableSlot) => void;
};

const SLOT_TYPE_STYLES: Record<string, string> = {
  peak: "text-amber-400 bg-amber-500/10",
  offpeak: "text-emerald-400 bg-emerald-500/10",
  regular: "text-slate-400 bg-slate-500/10",
};

function SlotSkeleton() {
  return <div className="skeleton h-[96px] rounded-xl" />;
}

export function SlotGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => <SlotSkeleton key={i} />)}
    </div>
  );
}

function groupByPeriod(slots: AvailableSlot[]) {
  const morning: AvailableSlot[] = [];
  const afternoon: AvailableSlot[] = [];
  const evening: AvailableSlot[] = [];
  for (const s of slots) {
    const hour = parseInt(s.start_time.slice(0, 2), 10);
    if (hour < 12) morning.push(s);
    else if (hour < 17) afternoon.push(s);
    else evening.push(s);
  }
  return { morning, afternoon, evening };
}

export default function SlotGrid({ slots, selectedSlots, onToggleSlot }: Props) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-slate-500">No slots configured for this day.</p>
      </div>
    );
  }

  const { morning, afternoon, evening } = groupByPeriod(slots);

  return (
    <div className="flex flex-col gap-6">
      {morning.length > 0 && <PeriodSection label="Morning" slots={morning} selectedSlots={selectedSlots} onToggleSlot={onToggleSlot} />}
      {afternoon.length > 0 && <PeriodSection label="Afternoon" slots={afternoon} selectedSlots={selectedSlots} onToggleSlot={onToggleSlot} />}
      {evening.length > 0 && <PeriodSection label="Evening" slots={evening} selectedSlots={selectedSlots} onToggleSlot={onToggleSlot} />}
    </div>
  );
}

function PeriodSection({
  label,
  slots,
  selectedSlots,
  onToggleSlot,
}: {
  label: string;
  slots: AvailableSlot[];
  selectedSlots: AvailableSlot[];
  onToggleSlot: (s: AvailableSlot) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot, i) => (
          <SlotPill
            key={`${slot.start_time}-${slot.end_time}-${i}`}
            slot={slot}
            selected={isSelected(selectedSlots, slot)}
            onToggle={() => onToggleSlot(slot)}
          />
        ))}
      </div>
    </div>
  );
}

function SlotPill({
  slot,
  selected,
  onToggle,
}: {
  slot: AvailableSlot;
  selected: boolean;
  onToggle: () => void;
}) {
  const past = isSlotPast(slot.date, slot.start_time);
  const unavailable = !slot.is_available;
  const disabled = past || unavailable;

  const baseLabel = past ? "Closed" : unavailable ? "Booked" : null;
  const price = slot.computed_price || slot.base_price;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onToggle()}
      className={[
        "flex flex-col gap-1 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
        disabled
          ? "cursor-not-allowed border-white/[0.04] bg-white/[0.02] opacity-50"
          : selected
            ? "border-2 border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-[1.02]"
            : "border-white/10 bg-white/[0.03] hover:border-indigo-400/40 hover:bg-white/[0.05]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-col">
          <span className={`font-mono text-sm font-semibold leading-tight ${disabled ? "text-slate-500 line-through" : selected ? "text-white" : "text-slate-200"}`}>
            {formatTime(slot.start_time)}
          </span>
          <span className={`font-mono text-[10px] ${disabled ? "text-slate-600" : selected ? "text-white/80" : "text-slate-500"}`}>
            → {formatTime(slot.end_time)}
          </span>
        </div>
        {selected && !disabled && (
          <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span className={`text-[10px] ${disabled ? "text-slate-600" : selected ? "text-white/70" : "text-slate-500"}`}>
          {slot.duration_mins}m
        </span>
        {slot.slot_type !== "regular" && (
          <span className={`rounded px-1 py-0.5 text-[9px] font-medium capitalize ${SLOT_TYPE_STYLES[slot.slot_type] ?? "text-slate-400 bg-slate-500/10"}`}>
            {slot.slot_type}
          </span>
        )}
      </div>

      <span className={`mt-0.5 text-sm font-bold ${disabled ? "text-slate-500" : selected ? "text-white" : "text-indigo-400"}`}>
        {baseLabel ?? formatCurrency(price)}
      </span>
    </button>
  );
}
