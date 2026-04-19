/**
 * Signal Shift Admin — API client
 * Centralized fetch wrapper with JWT auth and all admin endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "default";

// ─── Token management ────────────────────────────────

let accessToken: string | null = null;

export function setToken(token: string) {
  accessToken = token;
  if (typeof window !== "undefined") {
    localStorage.setItem("ss_access_token", token);
  }
}

export function getToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem("ss_access_token");
  }
  return accessToken;
}

export function clearToken() {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("ss_access_token");
    localStorage.removeItem("ss_refresh_token");
  }
}

// ─── Generic fetch ───────────────────────────────────

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  noAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// ─── Silent refresh ──────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

async function doRefresh(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("ss_refresh_token") : null;

  if (!refreshToken) throw new ApiError(401, "No refresh token");

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) throw new ApiError(401, "Refresh failed");

  const data = await res.json();
  setToken(data.access_token);
  if (typeof window !== "undefined") {
    localStorage.setItem("ss_refresh_token", data.refresh_token);
  }
  return data.access_token;
}

async function request<T>(
  endpoint: string,
  opts: FetchOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = opts;

  const token = getToken();
  if (token && !noAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (res.status === 401 && !noAuth && !isRetry) {
    // Silent-refresh path
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        pendingQueue.push({
          resolve: (newToken) => {
            headers["Authorization"] = `Bearer ${newToken}`;
            resolve(request<T>(endpoint, { ...opts, headers }, true));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      pendingQueue.forEach(({ resolve }) => resolve(newToken));
      pendingQueue = [];
      headers["Authorization"] = `Bearer ${newToken}`;
      return request<T>(endpoint, { ...opts, headers }, true);
    } catch (err) {
      pendingQueue.forEach(({ reject }) => reject(err));
      pendingQueue = [];
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw err instanceof ApiError ? err : new ApiError(401, "Session expired");
    } finally {
      isRefreshing = false;
    }
  }

  if (res.status === 401 && !noAuth) {
    // Retry already happened and still 401 → bail
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    let errorData: { message?: string; detail?: unknown } = {};
    try { errorData = await res.json(); } catch { /* no json */ }
    throw new ApiError(
      res.status,
      errorData.message || `Request failed: ${res.status}`,
      errorData.detail
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── HTTP method shortcuts ───────────────────────────

export const api = {
  get: <T>(url: string, opts?: FetchOptions) => request<T>(url, { ...opts, method: "GET" }),
  post: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: "POST", body }),
  patch: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: "PATCH", body }),
  put: <T>(url: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: "PUT", body }),
  delete: <T>(url: string, opts?: FetchOptions) =>
    request<T>(url, { ...opts, method: "DELETE" }),
};

// ─── Auth ────────────────────────────────────────────

export async function sendOtp(email: string) {
  return api.post("/auth/otp/send", { email, tenant_slug: TENANT_SLUG }, { noAuth: true });
}

export async function verifyOtp(email: string, otp: string) {
  const data = await api.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>("/auth/otp/verify", { email, otp, tenant_slug: TENANT_SLUG }, { noAuth: true });
  setToken(data.access_token);
  if (typeof window !== "undefined") {
    localStorage.setItem("ss_refresh_token", data.refresh_token);
  }
  return data;
}

export async function devLogin(email: string, password: string) {
  const data = await api.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>("/auth/dev-login", { email, password, tenant_slug: TENANT_SLUG }, { noAuth: true });
  setToken(data.access_token);
  if (typeof window !== "undefined") {
    localStorage.setItem("ss_refresh_token", data.refresh_token);
  }
  return data;
}

export async function checkHealth() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const origin = new URL(base).origin;
    const res = await fetch(`${origin}/health`);
    return res.ok;
  } catch { return false; }
}

// ─── Users ───────────────────────────────────────────

export interface UserRead {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export async function getMe() { return api.get<UserRead>("/users/me"); }
export async function listUsers() { return api.get<UserRead[]>("/users/"); }
export async function updateUserRole(userId: string, role: string) {
  return api.patch<UserRead>(`/users/${userId}/role`, { role });
}

// ─── Turfs ───────────────────────────────────────────

export interface TurfRead {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  sport_types: string[];
  address: string | null;
  city: string | null;
  amenities: Record<string, unknown>[];
  operating_hours: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export async function listTurfs() { return api.get<TurfRead[]>("/turfs/"); }
export async function getTurf(id: string) { return api.get<TurfRead>(`/turfs/${id}`); }
export async function createTurf(body: Record<string, unknown>) { return api.post<TurfRead>("/turfs/", body); }
export async function updateTurf(id: string, body: Record<string, unknown>) { return api.patch<TurfRead>(`/turfs/${id}`, body); }

// ─── Slot Rules ──────────────────────────────────────

export interface SlotRuleRead {
  id: string;
  turf_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_mins: number;
  slot_type: string;
  base_price: number;
  currency: string;
  max_capacity: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export async function listSlotRules(turfId: string) {
  return api.get<SlotRuleRead[]>(`/turfs/${turfId}/slot-rules`);
}
export async function createSlotRule(turfId: string, body: Record<string, unknown>) {
  return api.post<SlotRuleRead>(`/turfs/${turfId}/slot-rules`, body);
}
export async function updateSlotRule(ruleId: string, body: Record<string, unknown>) {
  return api.patch<SlotRuleRead>(`/turfs/slot-rules/${ruleId}`, body);
}
export async function deleteSlotRule(ruleId: string) {
  return api.delete<void>(`/turfs/slot-rules/${ruleId}`);
}

// ─── Overrides ───────────────────────────────────────

export interface SlotOverrideRead {
  id: string;
  turf_id: string;
  override_date: string;
  start_time: string | null;
  end_time: string | null;
  override_type: string;
  override_price: number | null;
  reason: string | null;
}

export async function listOverrides(turfId: string) {
  return api.get<SlotOverrideRead[]>(`/turfs/${turfId}/overrides`);
}
export async function createOverride(turfId: string, body: Record<string, unknown>) {
  return api.post<SlotOverrideRead>(`/turfs/${turfId}/overrides`, body);
}
export async function deleteOverride(overrideId: string) {
  return api.delete<void>(`/turfs/overrides/${overrideId}`);
}

// ─── Bookings ────────────────────────────────────────

export interface BookingRead {
  id: string;
  tenant_id: string;
  turf_id: string;
  user_id: string;
  team_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_mins: number;
  status: string;
  booking_type: string;
  base_price: number;
  discount_amount: number;
  tax_amount: number;
  final_price: number;
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_amount: number | null;
  notes: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  created_at: string;
}

export async function listTurfBookings(turfId: string, date?: string) {
  const q = date ? `?target_date=${date}` : "";
  return api.get<BookingRead[]>(`/bookings/turf/${turfId}${q}`);
}
export async function confirmBooking(id: string) { return api.patch<BookingRead>(`/bookings/${id}/confirm`); }
export async function completeBooking(id: string) { return api.patch<BookingRead>(`/bookings/${id}/complete`); }
export async function markNoShow(id: string) { return api.patch<BookingRead>(`/bookings/${id}/no-show`); }
export async function cancelBookingAdmin(id: string, reason: string) {
  return api.post<BookingRead>(`/bookings/${id}/cancel`, { reason });
}

// ─── Payments ────────────────────────────────────────

export interface PaymentRead {
  id: string;
  booking_id: string;
  user_id: string;
  gateway: string;
  gateway_txn_id: string | null;
  gateway_order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  utr: string | null;
  verified_by: string | null;
  verified_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

export async function listPayments() { return api.get<PaymentRead[]>("/payments/"); }
export async function refundPayment(bookingId: string) { return api.post<PaymentRead>(`/payments/refund/${bookingId}`); }
export async function verifyPayment(paymentId: string) {
  return api.post<PaymentRead>(`/payments/${paymentId}/verify`);
}
export async function rejectPayment(paymentId: string, reason: string) {
  return api.post<PaymentRead>(`/payments/${paymentId}/reject`, { reason });
}

// ─── Teams ───────────────────────────────────────────

export interface TeamRead {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  sport_type: string;
  logo_url: string | null;
  captain_id: string | null;
  is_active: boolean;
  created_at: string;
}

export async function listTeams() { return api.get<TeamRead[]>("/teams/"); }

// ─── Tournaments ─────────────────────────────────────

export interface TournamentRead {
  id: string;
  tenant_id: string;
  turf_id: string | null;
  name: string;
  slug: string;
  sport_type: string;
  format: string;
  status: string;
  tournament_starts: string;
  tournament_ends: string | null;
  max_teams: number | null;
  min_teams: number;
  entry_fee: number | null;
  created_at: string;
}

export async function listTournaments() { return api.get<TournamentRead[]>("/tournaments/"); }
export async function updateTournament(id: string, body: Record<string, unknown>) {
  return api.patch<TournamentRead>(`/tournaments/${id}`, body);
}

// ─── Coupons ─────────────────────────────────────────

export interface CouponRead {
  id: string;
  tenant_id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_booking_amount: number;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  valid_from: string;
  valid_until: string;
  applicable_sports: string[];
  applicable_booking_types: string[];
  is_active: boolean;
  created_at: string;
}

export async function listCoupons() { return api.get<CouponRead[]>("/coupons/"); }
export async function createCoupon(body: Record<string, unknown>) { return api.post<CouponRead>("/coupons/", body); }
export async function updateCoupon(id: string, body: Record<string, unknown>) { return api.patch<CouponRead>(`/coupons/${id}`, body); }
export async function deleteCoupon(id: string) { return api.delete<void>(`/coupons/${id}`); }

// ─── Pricing Rules ───────────────────────────────────

export interface PricingRuleRead {
  id: string;
  turf_id: string;
  name: string;
  rule_type: string;
  priority: number;
  conditions: Record<string, unknown>;
  adjustment_type: string;
  adjustment_value: number;
  stackable: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
}

export async function createPricingRule(turfId: string, body: Record<string, unknown>) {
  return api.post<PricingRuleRead>(`/bookings/pricing-rules/${turfId}`, body);
}
