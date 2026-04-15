"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <p className="text-sm text-slate-500">Tenant configuration and system preferences</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenant Info */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Tenant Information</h3>
          <div className="space-y-4">
            <SettingField label="Business Name" value="Signal Shift Arena" />
            <SettingField label="Slug" value="signal-shift" disabled />
            <SettingField label="Contact Email" value="admin@signalshift.in" />
            <SettingField label="Phone" value="+91 98765 43210" />
            <SettingField label="Timezone" value="Asia/Kolkata" />
          </div>
          <button className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600">
            Save Changes
          </button>
        </div>

        {/* Booking Defaults */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Booking Defaults</h3>
          <div className="space-y-4">
            <SettingField label="Default Slot Duration (mins)" value="60" type="number" />
            <SettingField label="Advance Booking Days" value="14" type="number" />
            <SettingField label="Min Cancellation Hours" value="4" type="number" />
            <SettingField label="GST Rate (%)" value="18" type="number" />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Auto-Confirm Bookings</label>
              <div className="flex items-center gap-3">
                <button className="relative h-6 w-11 rounded-full bg-indigo-500 transition-colors">
                  <span className="absolute left-[22px] top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
                </button>
                <span className="text-xs text-slate-400">Enabled</span>
              </div>
            </div>
          </div>
          <button className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600">
            Save Changes
          </button>
        </div>

        {/* Payment Gateway */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Payment Gateway</h3>
          <div className="space-y-4">
            <SettingField label="Gateway" value="Razorpay" disabled />
            <SettingField label="Key ID" value="rzp_live_••••••••" type="password" />
            <SettingField label="Key Secret" value="••••••••••••••••" type="password" />
            <SettingField label="Webhook Secret" value="••••••••••••••••" type="password" />
          </div>
          <button className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600">
            Update Keys
          </button>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-white">Notifications</h3>
          <div className="space-y-3">
            {[
              { label: "Booking confirmation email", enabled: true },
              { label: "Cancellation notification", enabled: true },
              { label: "Payment receipt", enabled: true },
              { label: "Tournament updates", enabled: false },
              { label: "Promotional emails", enabled: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2.5">
                <span className="text-sm text-slate-300">{item.label}</span>
                <button className={`relative h-5 w-9 rounded-full transition-colors ${item.enabled ? "bg-indigo-500" : "bg-slate-700"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${item.enabled ? "left-[18px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingField({ label, value, type = "text", disabled = false }: { label: string; value: string; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <input
        type={type}
        defaultValue={value}
        disabled={disabled}
        className={`w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      />
    </div>
  );
}
