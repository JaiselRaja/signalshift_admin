"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listTurfs,
  lookupUserByPhone,
  createManualBooking,
  getTurfAvailabilityRange,
  ApiError,
  type AvailableSlot,
  type TurfRead,
  type UserLookupResponse,
} from "@/lib/api";
import {
  addDays,
  formatCurrency,
  MAX_SLOTS_PER_BOOKING,
  summarize,
  toDateString,
  toggleSlot,
} from "@/lib/slotSelection";
import SlotCalendar from "@/components/bookings/SlotCalendar";
import SlotGrid, { SlotGridSkeleton } from "@/components/bookings/SlotGrid";

const INPUT =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:opacity-50";
const LABEL =
  "text-[10px] font-medium uppercase tracking-wider text-slate-500";
const CARD =
  "rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5";

type BookingType = "regular" | "practice" | "tournament" | "event";
type PaymentMethod = "cash" | "upi" | "playspots" | "other";

const BOOKING_TYPES: { value: BookingType; label: string }[] = [
  { value: "regular", label: "Regular" },
  { value: "practice", label: "Practice" },
  { value: "tournament", label: "Tournament" },
  { value: "event", label: "Event" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI (direct)" },
  { value: "playspots", label: "Playspots.in" },
  { value: "other", label: "Other" },
];

export default function NewManualBookingPage() {
  const router = useRouter();

  // Customer
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lookupHit, setLookupHit] = useState<UserLookupResponse | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Slot
  const [turfs, setTurfs] = useState<TurfRead[]>([]);
  const [turfId, setTurfId] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>("regular");

  // Slot picker (visual) state
  const [availabilityRange, setAvailabilityRange] = useState<Record<string, AvailableSlot[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>(toDateString(new Date()));
  const [selectedSlots, setSelectedSlots] = useState<AvailableSlot[]>([]);
  const [maxWarning, setMaxWarning] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [pickerFallback, setPickerFallback] = useState(false); // turf has no slot rules

  // Manual fallback inputs (used only when pickerFallback is true)
  const [fallbackDate, setFallbackDate] = useState("");
  const [fallbackStart, setFallbackStart] = useState("");
  const [fallbackEnd, setFallbackEnd] = useState("");

  // Pricing
  const [couponCode, setCouponCode] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [priceOverrideReason, setPriceOverrideReason] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load turfs once
  useEffect(() => {
    listTurfs()
      .then((all) => {
        setTurfs(all);
        const active = all.find((t) => t.is_active) ?? all[0];
        if (active) setTurfId(active.id);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load turfs"));
  }, []);

  // Load 14-day availability whenever the turf changes
  useEffect(() => {
    if (!turfId) return;
    setLoadingAvailability(true);
    setSelectedSlots([]);
    setMaxWarning(false);
    setSelectedDate(toDateString(new Date()));

    const start = toDateString(new Date());
    const end = toDateString(addDays(new Date(), 13));
    getTurfAvailabilityRange(turfId, start, end)
      .then((range) => {
        setAvailabilityRange(range);
        const totalSlots = Object.values(range).reduce((acc, day) => acc + day.length, 0);
        // If the turf has no slot rules at all, fall back to manual time inputs.
        setPickerFallback(totalSlots === 0);
      })
      .catch(() => {
        // If availability fetch fails, default to manual mode so the form still works.
        setAvailabilityRange({});
        setPickerFallback(true);
      })
      .finally(() => setLoadingAvailability(false));
  }, [turfId]);

  // Slots for the date currently selected on the strip
  const daySlots = useMemo(
    () => availabilityRange[selectedDate] ?? [],
    [availabilityRange, selectedDate],
  );

  const selectionSummary = summarize(selectedSlots);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlots([]);
    setMaxWarning(false);
  }

  function handleToggleSlot(slot: AvailableSlot) {
    const result = toggleSlot(selectedSlots, slot);
    setSelectedSlots(result.slots);
    setMaxWarning(result.reason === "max_reached");
  }

  // Debounced phone lookup
  useEffect(() => {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setLookupHit(null);
      return;
    }
    setLookupLoading(true);
    lookupTimer.current = setTimeout(async () => {
      try {
        const hit = await lookupUserByPhone(digits);
        setLookupHit(hit);
        if (hit) {
          if (hit.full_name) setName(hit.full_name);
          if (hit.email) setEmail(hit.email);
        }
      } catch {
        // ignore lookup errors — they shouldn't block manual creation
      } finally {
        setLookupLoading(false);
      }
    }, 400);
    return () => {
      if (lookupTimer.current) clearTimeout(lookupTimer.current);
    };
  }, [phone]);

  const overrideActive = priceOverride.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || !name.trim() || !email.trim()) {
      setError("Phone, name, and email are required.");
      return;
    }
    if (!turfId) {
      setError("Pick a turf first.");
      return;
    }

    // Resolve booking_date / start_time / end_time from picker OR fallback
    let bookingDate: string;
    let startTime: string;
    let endTime: string;
    if (pickerFallback) {
      if (!fallbackDate || !fallbackStart || !fallbackEnd) {
        setError("Date, start time, and end time are required.");
        return;
      }
      bookingDate = fallbackDate;
      startTime = fallbackStart.length === 5 ? `${fallbackStart}:00` : fallbackStart;
      endTime = fallbackEnd.length === 5 ? `${fallbackEnd}:00` : fallbackEnd;
    } else {
      if (!selectionSummary) {
        setError("Pick one or more time slots.");
        return;
      }
      bookingDate = selectionSummary.date;
      startTime = selectionSummary.start_time;
      endTime = selectionSummary.end_time;
    }

    if (overrideActive && !priceOverrideReason.trim()) {
      setError("Price override requires a reason.");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customer_phone: phone.replace(/\D/g, ""),
        customer_name: name.trim(),
        customer_email: email.trim().toLowerCase(),
        turf_id: turfId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        booking_type: bookingType,
        coupon_code: couponCode.trim() || null,
        price_override: overrideActive ? Number(priceOverride) : null,
        price_override_reason: overrideActive ? priceOverrideReason.trim() : null,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || null,
        admin_notes: adminNotes.trim() || null,
        customer_notes: customerNotes.trim() || null,
      };
      const booking = await createManualBooking(body);
      router.push(`/dashboard/bookings?created=${booking.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/bookings"
            className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to Bookings
          </Link>
          <h1 className="text-2xl font-bold text-white">New Manual Booking</h1>
          <p className="text-sm text-slate-500">
            For phone bookings, walk-ins, or third-party channels (Playspots.in, etc).
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Customer card */}
      <div className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-white">Customer</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className={INPUT}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className={INPUT}
              required
            />
          </div>
        </div>
        <div className="mt-3 min-h-[24px] text-xs">
          {lookupLoading && <span className="text-slate-500">Looking up…</span>}
          {!lookupLoading && lookupHit && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1 text-amber-300 ring-1 ring-amber-400/30">
              Existing user · {lookupHit.full_name ?? "—"} · {lookupHit.prior_bookings} prior bookings
            </span>
          )}
          {!lookupLoading && phone.replace(/\D/g, "").length >= 8 && !lookupHit && (
            <span className="text-slate-500">New customer — a user record will be auto-created.</span>
          )}
        </div>
      </div>

      {/* Slot card */}
      <div className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-white">Slot</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className={LABEL}>Turf</label>
            <select
              value={turfId}
              onChange={(e) => setTurfId(e.target.value)}
              className={INPUT}
              required
            >
              {turfs.length === 0 && <option value="">Loading…</option>}
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{!t.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Booking type</label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value as BookingType)}
              className={INPUT}
            >
              {BOOKING_TYPES.map((bt) => (
                <option key={bt.value} value={bt.value}>{bt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual slot picker OR manual fallback */}
        {!pickerFallback ? (
          <div className="mt-5">
            {loadingAvailability ? (
              <div>
                <div className="mb-3 h-[78px] rounded-xl bg-white/[0.03]" />
                <SlotGridSkeleton />
              </div>
            ) : (
              <>
                <SlotCalendar
                  availabilityRange={availabilityRange}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
                <div className="my-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">
                    {daySlots.filter((s) => s.is_available).length} slot
                    {daySlots.filter((s) => s.is_available).length !== 1 ? "s" : ""} available
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tap up to <span className="font-semibold text-indigo-400">{MAX_SLOTS_PER_BOOKING}</span> consecutive slots
                  </p>
                </div>
                <SlotGrid
                  slots={daySlots}
                  selectedSlots={selectedSlots}
                  onToggleSlot={handleToggleSlot}
                />
                {maxWarning && (
                  <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300">
                    Maximum {MAX_SLOTS_PER_BOOKING} slots per booking.
                  </div>
                )}
                {selectionSummary && (
                  <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] px-4 py-3 text-sm text-slate-200">
                    <span className="font-semibold">Selected:</span>{" "}
                    {selectionSummary.date} · {selectionSummary.start_time.slice(0, 5)}–{selectionSummary.end_time.slice(0, 5)}
                    {" · "}
                    {selectionSummary.duration_mins}m
                    {" · "}
                    <span className="font-bold text-indigo-300">{formatCurrency(selectionSummary.total_price)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
              This turf has no slot rules configured. Falling back to manual time entry.
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Date</label>
                <input
                  type="date"
                  value={fallbackDate}
                  onChange={(e) => setFallbackDate(e.target.value)}
                  className={INPUT}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Start time</label>
                <input
                  type="time"
                  value={fallbackStart}
                  onChange={(e) => setFallbackStart(e.target.value)}
                  className={INPUT}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>End time</label>
                <input
                  type="time"
                  value={fallbackEnd}
                  onChange={(e) => setFallbackEnd(e.target.value)}
                  className={INPUT}
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pricing card */}
      <div className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-white">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Coupon code (optional)</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className={`${INPUT} font-mono`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Override total (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              className={INPUT}
              placeholder="Leave blank to auto-calculate"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>
              Override reason {overrideActive && <span className="text-rose-400">*</span>}
            </label>
            <input
              type="text"
              value={priceOverrideReason}
              onChange={(e) => setPriceOverrideReason(e.target.value)}
              className={INPUT}
              disabled={!overrideActive}
              placeholder={overrideActive ? "Required when override is set" : "—"}
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          When override is blank, the booking uses the auto-calculated price from base rate + active pricing rules + GST.
        </p>
      </div>

      {/* Payment card */}
      <div className={CARD}>
        <h2 className="mb-4 text-sm font-semibold text-white">Payment received</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={INPUT}
              required
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Reference number (optional)</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className={INPUT}
              placeholder="UTR, Playspots ID, etc."
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <label className={LABEL}>Admin notes (private)</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            className={INPUT}
            placeholder="Anything you want to remember about this booking, not shown to the customer."
          />
        </div>
      </div>

      {/* Customer-facing notes */}
      <div className={CARD}>
        <h2 className="mb-3 text-sm font-semibold text-white">Notes shown to customer (optional)</h2>
        <textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={2}
          className={INPUT}
          placeholder="e.g. 'Bring extra balls'."
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/bookings"
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
          {submitting ? "Creating…" : "Create booking"}
        </button>
      </div>
    </form>
  );
}
