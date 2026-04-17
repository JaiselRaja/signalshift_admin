"use client";

import { useEffect, useState, useCallback } from "react";
import { listUsers, updateUserRole, ApiError, type UserRead } from "@/lib/api";

const ROLES = ["super_admin", "turf_admin", "team_manager", "player"] as const;

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  turf_admin: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  team_manager: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  player: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load users: ${err.message} (${err.status})`);
      } else {
        setError("Failed to load users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingId(userId);
    setError(null);
    try {
      const updated = await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to update role: ${err.message} (${err.status})`);
      } else {
        setError("Failed to update role. Please try again.");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered =
    roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Users</h2>
          <p className="text-sm text-slate-500">Manage users and their roles</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-400">
            {filtered.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-xs font-medium text-rose-400 hover:text-rose-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role filter */}
      <div className="flex gap-2">
        {["all", ...ROLES].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              roleFilter === role
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "bg-white/[0.04] text-slate-400 border border-transparent hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {role === "all" ? "All" : role.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-sm text-slate-500">Loading users...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-500">
              {users.length === 0 ? "No users found." : "No users match the selected filter."}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                        {initials(user.full_name)}
                      </div>
                      <span className="font-medium text-white">
                        {user.full_name || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-400">{user.email}</td>
                  <td className="font-mono text-xs">{user.phone || "—"}</td>
                  <td>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.player}`}
                    >
                      {user.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${user.is_active ? "text-emerald-400" : "text-slate-500"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${user.is_active ? "bg-emerald-400" : "bg-slate-600"}`}
                      />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td>
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-slate-400 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus:border-indigo-500/40 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-slate-300">
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    {updatingId === user.id && (
                      <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-indigo-500 border-t-transparent" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
