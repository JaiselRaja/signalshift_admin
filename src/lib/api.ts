/**
 * Signal Shift API client — centralized fetch wrapper
 * with JWT auth, token refresh, and error handling.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

async function request<T>(endpoint: string, opts: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, noAuth = false } = opts;

  const token = getToken();
  if (token && !noAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (!res.ok) {
    let errorData: { message?: string; detail?: unknown } = {};
    try {
      errorData = await res.json();
    } catch {
      // no json body
    }
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

// ─── Auth helpers ────────────────────────────────────

export async function sendOtp(email: string, tenantSlug = "default") {
  return api.post("/auth/otp/send", { email, tenant_slug: tenantSlug }, { noAuth: true });
}

export async function verifyOtp(email: string, otp: string, tenantSlug = "default") {
  const data = await api.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>("/auth/otp/verify", { email, otp, tenant_slug: tenantSlug }, { noAuth: true });
  setToken(data.access_token);
  if (typeof window !== "undefined") {
    localStorage.setItem("ss_refresh_token", data.refresh_token);
  }
  return data;
}

// ─── Health check ────────────────────────────────────

export async function checkHealth() {
  try {
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/health"
    );
    return res.ok;
  } catch {
    return false;
  }
}
