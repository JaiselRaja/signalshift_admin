// Ported from frontend/src/lib/slotSelection.ts so admin manual-booking form
// uses the same selection logic as the user-facing booking page.

import type { AvailableSlot } from "@/lib/api";

export const MAX_SLOTS_PER_BOOKING = 3;

export type ToggleResult = {
  slots: AvailableSlot[];
  reason?: "max_reached";
};

function sameSlot(a: AvailableSlot, b: AvailableSlot): boolean {
  return a.start_time === b.start_time && a.end_time === b.end_time;
}

/**
 * Pure function that computes the next selection when the user taps a slot.
 * Rules:
 *  - Empty selection + tap → [tap]
 *  - Tap a selected slot at an edge → remove it
 *  - Tap a selected slot in the middle → truncate (keep the front half)
 *  - Tap a slot adjacent to the selection's last (end==start) → append (if under cap)
 *  - Tap a slot adjacent to the selection's first (end==start) → prepend (if under cap)
 *  - Tap anything else → replace with [tap]
 *  - At cap and tap would extend → return current selection + reason "max_reached"
 */
export function toggleSlot(
  selection: AvailableSlot[],
  tapped: AvailableSlot,
): ToggleResult {
  if (selection.length === 0) {
    return { slots: [tapped] };
  }

  const idx = selection.findIndex((s) => sameSlot(s, tapped));
  if (idx !== -1) {
    if (idx === 0) return { slots: selection.slice(1) };
    if (idx === selection.length - 1) return { slots: selection.slice(0, -1) };
    return { slots: selection.slice(0, idx) };
  }

  const first = selection[0];
  const last = selection[selection.length - 1];

  const extendsForward = tapped.start_time === last.end_time;
  const extendsBackward = tapped.end_time === first.start_time;

  if ((extendsForward || extendsBackward) && selection.length >= MAX_SLOTS_PER_BOOKING) {
    return { slots: selection, reason: "max_reached" };
  }

  if (extendsForward) return { slots: [...selection, tapped] };
  if (extendsBackward) return { slots: [tapped, ...selection] };

  return { slots: [tapped] };
}

export type SelectionSummary = {
  date: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  total_price: number;
  count: number;
};

export function summarize(selection: AvailableSlot[]): SelectionSummary | null {
  if (selection.length === 0) return null;
  return {
    date: selection[0].date,
    start_time: selection[0].start_time,
    end_time: selection[selection.length - 1].end_time,
    duration_mins: selection.reduce((acc, s) => acc + s.duration_mins, 0),
    total_price: selection.reduce(
      (acc, s) => acc + Number(s.computed_price || s.base_price),
      0,
    ),
    count: selection.length,
  };
}

export function isSelected(selection: AvailableSlot[], slot: AvailableSlot): boolean {
  return selection.some((s) => s.start_time === slot.start_time && s.end_time === slot.end_time);
}

// ─── Small date/time helpers used by the picker ──────

export function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** "HH:MM:SS" or "HH:MM" → "6:00 PM" */
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Returns true if a slot's start time is in the past (for today's slots) */
export function isSlotPast(dateStr: string, startTimeStr: string): boolean {
  if (dateStr > toDateString(new Date())) return false;
  if (dateStr < toDateString(new Date())) return true;
  const now = new Date().toTimeString().slice(0, 5); // "HH:MM"
  return startTimeStr.slice(0, 5) <= now;
}

/** Format number as Indian Rupees: 1500 → "₹1,500" */
export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
