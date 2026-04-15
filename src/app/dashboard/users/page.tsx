"use client";

const MOCK_USERS = [
  { id: "1", name: "Rahul Sharma", email: "rahul@email.com", role: "player", phone: "+91 9876543210", bookings: 12, isActive: true, lastLogin: "2 hours ago" },
  { id: "2", name: "Priya Patel", email: "priya@email.com", role: "team_manager", phone: "+91 9876543211", bookings: 8, isActive: true, lastLogin: "5 hours ago" },
  { id: "3", name: "Admin User", email: "admin@signalshift.in", role: "turf_admin", phone: "+91 9876543212", bookings: 0, isActive: true, lastLogin: "1 hour ago" },
  { id: "4", name: "Sneha Gupta", email: "sneha@email.com", role: "player", phone: "+91 9876543213", bookings: 5, isActive: true, lastLogin: "1 day ago" },
  { id: "5", name: "Vikram Singh", email: "vikram@email.com", role: "player", phone: "+91 9876543214", bookings: 3, isActive: false, lastLogin: "1 week ago" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  turf_admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  team_manager: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  player: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <p className="text-sm text-slate-500">Manage users and their roles</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-400">
            {MOCK_USERS.length} total users
          </span>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Bookings</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-medium text-white">{user.name}</div>
                      <div className="text-[11px] text-slate-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ROLE_COLORS[user.role]}`}>
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td className="font-mono text-xs">{user.phone}</td>
                <td>{user.bookings}</td>
                <td>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${user.isActive ? "text-emerald-400" : "text-slate-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-slate-600"}`} />
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-xs text-slate-500">{user.lastLogin}</td>
                <td>
                  <button className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white">
                    Change Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
