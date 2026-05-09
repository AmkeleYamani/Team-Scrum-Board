import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Project, Task } from "../types";

type TaskWithProject = Task & { projectName: string; projectId: string };

const STATUS_BG: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  PAUSE: "bg-orange-400",
  TEST: "bg-purple-500",
  DONE: "bg-green-500",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  PAUSE: "Paused",
  TEST: "Testing",
  DONE: "Done",
};

export default function TimelineView() {
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedMember, setSelectedMember] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [projRes, teamsRes] = await Promise.all([
          api.get<Project[]>("/projects"),
          api.get<any[]>("/teams"),
        ]);
        const personalProjects: Project[] = projRes.data;
        const teamProjects: Project[] = teamsRes.data.flatMap((t: any) => t.projects ?? []);
        const allProjects = [...personalProjects];
        for (const tp of teamProjects) {
          if (!allProjects.find((p) => p.id === tp.id)) allProjects.push(tp);
        }
        setProjects(allProjects);
        const tasks: TaskWithProject[] = allProjects.flatMap((p) =>
          (p.tasks ?? []).map((t) => ({ ...t, projectName: p.name, projectId: p.id }))
        );
        setAllTasks(tasks);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const uniqueMembers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const t of allTasks) {
      if (t.assignedTo) seen.set(t.assignedTo.id, { id: t.assignedTo.id, name: t.assignedTo.name || t.assignedTo.email });
    }
    return Array.from(seen.values());
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks
      .filter((t) => t.dueDate)
      .filter((t) => selectedProjectId === "all" || t.projectId === selectedProjectId)
      .filter((t) => selectedMember === "all" || t.assignedTo?.id === selectedMember);
  }, [allTasks, selectedProjectId, selectedMember]);

  const { minDate, maxDate } = useMemo(() => {
    if (filteredTasks.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: new Date(now.getFullYear(), now.getMonth() + 2, 0) };
    }
    const dates: Date[] = [];
    for (const t of filteredTasks) {
      if (t.startDate) dates.push(new Date(t.startDate));
      if (t.dueDate) dates.push(new Date(t.dueDate));
    }
    const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
    const min = new Date(sorted[0]);
    const max = new Date(sorted[sorted.length - 1]);
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 3);
    return { minDate: min, maxDate: max };
  }, [filteredTasks]);

  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));

  function pct(date: Date | null, fallback: Date) {
    const d = date ?? fallback;
    return Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100));
  }

  const weekMarkers = useMemo(() => {
    const markers: { label: string; pct: number }[] = [];
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    while (d.getTime() <= maxDate.getTime()) {
      const p = ((d.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100;
      markers.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, pct: p });
      d.setDate(d.getDate() + 7);
    }
    return markers;
  }, [minDate, maxDate]);

  const noDateTasks = allTasks.filter(
    (t) => !t.dueDate && (selectedProjectId === "all" || t.projectId === selectedProjectId)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Timeline</h2>
          <p className="mt-1 text-sm text-slate-500">Visualize task scheduling and project progress.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="all">All Members</option>
            {uniqueMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_BG[key]}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading timeline…</p>
        ) : filteredTasks.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400 italic">No tasks with due dates to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: "700px" }}>
              {/* Week markers */}
              <div className="relative h-8 border-b border-slate-100 bg-slate-50">
                <div className="absolute inset-0 flex">
                  {weekMarkers.map((m, i) => (
                    <div key={i} className="absolute top-0 h-full" style={{ left: `${m.pct}%` }}>
                      <div className="h-full border-l border-slate-200" />
                      <span className="absolute left-1 top-1.5 text-xs text-slate-400 whitespace-nowrap">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task rows */}
              <div>
                {filteredTasks.map((task) => {
                  const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
                  const taskEnd = new Date(task.dueDate!);
                  const left = pct(taskStart, taskStart);
                  const right = pct(taskEnd, taskEnd);
                  const width = Math.max(right - left, 1);
                  const isDone = task.status === "DONE";

                  return (
                    <div key={task.id} className="group relative border-b border-slate-50 px-4 py-3 hover:bg-slate-50/50">
                      {/* Week grid lines */}
                      {weekMarkers.map((m, i) => (
                        <div key={i} className="pointer-events-none absolute inset-y-0 border-l border-slate-100" style={{ left: `${m.pct}%` }} />
                      ))}

                      {/* Row label */}
                      <div className="relative z-10 mb-1.5 flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_BG[task.status]}`} />
                        <span className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{task.title}</span>
                        <span className="text-xs text-slate-400 truncate">{task.projectName}</span>
                        {task.assignedTo && (
                          <span className="ml-auto text-xs text-slate-400 hidden sm:inline">
                            {task.assignedTo.name || task.assignedTo.email}
                          </span>
                        )}
                      </div>

                      {/* Bar */}
                      <div className="relative h-5 w-full">
                        <div
                          className={`absolute top-0 h-full rounded-full ${STATUS_BG[task.status]} ${isDone ? "opacity-70" : ""} transition-all`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${task.title}: ${task.startDate ? new Date(task.startDate).toLocaleDateString() : "?"} → ${new Date(task.dueDate!).toLocaleDateString()}`}
                        >
                          {isDone && (
                            <div
                              className="h-full rounded-full bg-white/30"
                              style={{ width: "100%" }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks without due dates */}
      {!loading && noDateTasks.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Tasks without due dates ({noDateTasks.length})</h3>
          <div className="flex flex-wrap gap-2">
            {noDateTasks.map((t) => (
              <span key={t.id} className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BG[t.status]} text-white`}>
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
