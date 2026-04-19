"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendOtp, verifyOtp, getMe, getToken, clearToken } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!getToken()) return;
    // If a token already exists, verify it belongs to a super_admin before redirecting.
    getMe()
      .then((me) => {
        if (me.role === "super_admin") router.replace(redirect);
        else {
          clearToken();
          setError("This account isn't authorised for the admin dashboard.");
        }
      })
      .catch(() => clearToken());
  }, [redirect, router]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email address.");
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStep("otp");
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError("Failed to send OTP. Please check the email and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return setError("Please enter the full 6-digit code.");
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email.trim(), code);
      const me = await getMe();
      if (me.role !== "super_admin") {
        clearToken();
        setError("This account isn't authorised for the admin dashboard.");
        setOtp(Array(6).fill(""));
        return;
      }
      router.replace(redirect);
    } catch {
      setError("Invalid or expired OTP. Please try again.");
      setOtp(Array(6).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(i: number, val: string) {
    const digits = val.replace(/\D/g, "");
    setError(null);
    if (digits.length > 1) {
      // Multi-digit input (paste or fast typing) — distribute across cells.
      const next = [...otp];
      for (let k = 0; k < digits.length && i + k < 6; k++) {
        next[i + k] = digits[k];
      }
      setOtp(next);
      const lastFilled = Math.min(i + digits.length, 6) - 1;
      if (lastFilled < 5) otpRefs.current[lastFilled + 1]?.focus();
      else otpRefs.current[5]?.blur();
      return;
    }
    const digit = digits.slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function handleOtpPaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text") ?? "";
    const digits = text.replace(/\D/g, "");
    if (digits.length <= 1) return;
    e.preventDefault();
    setError(null);
    const next = [...otp];
    for (let k = 0; k < digits.length && i + k < 6; k++) {
      next[i + k] = digits[k];
    }
    setOtp(next);
    const lastFilled = Math.min(i + digits.length, 6) - 1;
    if (lastFilled < 5) otpRefs.current[lastFilled + 1]?.focus();
    else otpRefs.current[5]?.blur();
  }

  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setOtp(Array(6).fill(""));
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError("Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0b0f] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[140px]" />
      </div>

      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30">
          <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Signal Shift Admin</h1>
        <p className="text-xs text-slate-500">Restricted to authorised administrators.</p>
      </div>

      <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-xl">
        {step === "email" ? (
          <>
            <h2 className="mb-1 text-lg font-semibold text-white">Sign in</h2>
            <p className="mb-6 text-xs text-slate-500">We&apos;ll email you a one-time code.</p>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending…
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep("email"); setError(null); }}
              className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </button>

            <h2 className="mb-1 text-lg font-semibold text-white">Enter OTP</h2>
            <p className="mb-6 text-xs text-slate-500">
              Sent to <span className="font-medium text-indigo-300">{email}</span>
            </p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onPaste={(e) => handleOtpPaste(i, e)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-10 rounded-lg border border-white/[0.06] bg-white/[0.03] text-center font-mono text-lg font-bold text-slate-100 outline-none transition-colors focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                  />
                ))}
              </div>

              {error && (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying…
                  </span>
                ) : (
                  "Verify & Sign In"
                )}
              </button>

              <div className="text-center text-xs text-slate-500">
                Didn&apos;t receive it?{" "}
                {resendTimer > 0 ? (
                  <span className="text-slate-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
