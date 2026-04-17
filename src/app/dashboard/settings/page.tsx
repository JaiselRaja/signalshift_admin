"use client";

import { useCallback, useEffect, useState } from "react";
import { getMe, api, ApiError } from "@/lib/api";

interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  config: Record<string, unknown>;
  is_active: boolean;
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    try {
      // Get the current user to find tenant_id, then fetch tenant
      const me = await getMe();
      const tenants = await api.get<TenantConfig[]>("/tenants/");
      const myTenant = tenants.find((t) => t.id === me.tenant_id);
      if (myTenant) {
        setTenant(myTenant);
        setBusinessName(myTenant.name);
        const cfg = myTenant.config || {};
        setContactEmail((cfg.contact_email as string) || "");
        setPhone((cfg.phone as string) || "");
        setTimezone((cfg.timezone as string) || "Asia/Kolkata");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch(`/tenants/${tenant.id}`, {
        name: businessName,
        config: {
          ...(tenant.config || {}),
          contact_email: contactEmail,
          phone,
          timezone,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h2 className="text-lg font-semibold text-white">Settings</h2></div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <p className="text-sm text-slate-500">Tenant configuration and system preferences</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">Settings saved successfully.</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenant Info */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Tenant Information</h3>
          <div className="space-y-4">
            <SettingField label="Business Name" value={businessName} onChange={setBusinessName} />
            <SettingField label="Slug" value={tenant?.slug || ""} disabled />
            <SettingField label="Contact Email" value={contactEmail} onChange={setContactEmail} />
            <SettingField label="Phone" value={phone} onChange={setPhone} />
            <SettingField label="Timezone" value={timezone} onChange={setTimezone} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Booking Defaults */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Booking Defaults</h3>
          <div className="space-y-4">
            <SettingField label="Default Slot Duration (mins)" value="60" disabled />
            <SettingField label="Advance Booking Days" value="14" disabled />
            <SettingField label="GST Rate (%)" value="18" disabled />
          </div>
          <p className="mt-4 text-xs text-slate-500">These values are configured via environment variables on the backend.</p>
        </div>

        {/* Payment Gateway */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Payment Gateway</h3>
          <div className="space-y-4">
            <SettingField label="Gateway" value="Razorpay" disabled />
            <SettingField label="Status" value="Configured via environment" disabled />
          </div>
          <p className="mt-4 text-xs text-slate-500">Payment gateway credentials are managed via backend environment variables for security.</p>
        </div>

        {/* System Info */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">System Info</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tenant ID</span>
              <span className="font-mono text-xs text-slate-300">{tenant?.id.slice(0, 8) || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Active</span>
              <span className={tenant?.is_active ? "text-emerald-400" : "text-rose-400"}>{tenant?.is_active ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, value, disabled = false, onChange }: {
  label: string; value: string; disabled?: boolean; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        disabled={disabled}
        className={`w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-all focus:border-indigo-500/40 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      />
    </div>
  );
}
