import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import api from "../services/api";

type Stats = {
  totalProjects: number;
  completedTasks: number;
  overdueTasks: number;
  tasksDueToday: number;
  totalTeamMembers: number;
  activeTeams: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  memberProductivity: { name: string; email: string; completedTasks: number; totalTasks: number }[];
  projectProgress: { name: string; total: number; done: number; pct: number }[];
  weeklyCompletions: { week: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  DONE: "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#ef4444",
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Stats>("/dashboard/stats")
      .then((r) => setStats(r.data))
      .catch(() => setError("Unable to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Loading analytics…</p>;
  if (error) return <p className="text-sm text-red-500 py-8 text-center">{error}</p>;
  if (!stats) return null;

  const statusData = Object.entries(stats.tasksByStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.tasksByPriority).map(([name, value]) => ({ name, value }));
  const topMembers = stats.memberProductivity.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Total Projects" value={stats.totalProjects} color="text-slate-900" />
        <SummaryCard label="Completed Tasks" value={stats.completedTasks} color="text-green-600" />
        <SummaryCard label="Overdue Tasks" value={stats.overdueTasks} color="text-red-500" />
        <SummaryCard label="Due Today" value={stats.tasksDueToday} color="text-yellow-500" />
        <SummaryCard label="Team Members" value={stats.totalTeamMembers} color="text-blue-600" />
        <SummaryCard label="Active Teams" value={stats.activeTeams} color="text-slate-700" />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks by status — pie */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks by priority — pie */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Tasks by Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                {priorityData.map((entry) => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly completions — bar */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Tasks Completed per Week (last 8 weeks)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.weeklyCompletions} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1e293b" radius={[4, 4, 0, 0]} name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Member productivity — bar */}
      {topMembers.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Team Member Productivity</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, topMembers.length * 36)}>
            <BarChart data={topMembers} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => [v, name === "completedTasks" ? "Completed" : "Total"]} />
              <Bar dataKey="totalTasks" fill="#e2e8f0" radius={[0, 4, 4, 0]} name="Total" />
              <Bar dataKey="completedTasks" fill="#22c55e" radius={[0, 4, 4, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project progress */}
      {stats.projectProgress.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Project Progress</h3>
          <div className="space-y-4">
            {stats.projectProgress.map((proj) => (
              <div key={proj.name}>
                <div className="mb-1 flex justify-between text-xs text-slate-600">
                  <span className="font-medium">{proj.name}</span>
                  <span>{proj.done}/{proj.total} tasks · {proj.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900 transition-all"
                    style={{ width: `${proj.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
