"use client";

const MOCK_TEAMS = [
  { id: "1", name: "Thunder Strikers", slug: "thunder-strikers", sport: "Football", captain: "Rahul Sharma", members: 11, tournaments: 3, isActive: true },
  { id: "2", name: "Solar Warriors", slug: "solar-warriors", sport: "Football", captain: "Arjun Mehta", members: 14, tournaments: 2, isActive: true },
  { id: "3", name: "Neptune FC", slug: "neptune-fc", sport: "Football", captain: "Priya Patel", members: 9, tournaments: 1, isActive: true },
  { id: "4", name: "Orbit Aces", slug: "orbit-aces", sport: "Cricket", captain: "Karan Joshi", members: 15, tournaments: 0, isActive: false },
];

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Teams</h2>
          <p className="text-sm text-slate-500">View and manage team rosters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MOCK_TEAMS.map((team) => (
          <div key={team.id} className="glass-card group overflow-hidden transition-all hover:border-white/[0.12]">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                  {team.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{team.name}</h3>
                  <p className="text-xs text-slate-500">Captain: {team.captain}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">{team.sport}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${team.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.04] pt-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{team.members}</div>
                  <div className="text-[10px] text-slate-500">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">{team.tournaments}</div>
                  <div className="text-[10px] text-slate-500">Tournaments</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
