import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { Project, Task } from "../types";

type TaskWithProject = Task & { projectName: string; projectId: string };

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PAUSE: "bg-orange-100 text-orange-700",
  TEST: "bg-purple-100 text-purple-700",
  DONE: "bg-green-100 text-green-700",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView() {
  const [allTasks, setAllTasks] = useState<TaskWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [projRes, teamsRes] = await Promise.all([
          api.get<Project[]>("/projects"),
          api.get<{ projects: Project[] }[]>("/teams"),
        ]);
        const personalProjects: Project[] = projRes.data;
        const teamProjects: Project[] = (teamsRes.data as any[]).flatMap((t: any) => t.projects ?? []);
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const filteredTasks = useMemo(
    () => (selectedProjectId === "all" ? allTasks : allTasks.filter((t) => t.projectId === selectedProjectId)),
    [allTasks, selectedProjectId]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithProject[]>();
    for (const task of filteredTasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [filteredTasks]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Calendar</h2>
          <p className="mt-1 text-sm text-slate-500">View tasks and deadlines across projects.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Today</button>
            <button onClick={nextMonth} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        {/* Month heading */}
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-lg font-semibold text-slate-900">{MONTH_NAMES[month]} {year}</p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <>
            {/* Day names */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-400">{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: rows * 7 }).map((_, i) => {
                const dayNum = i - startOffset + 1;
                const isValid = dayNum >= 1 && dayNum <= lastDay.getDate();
                const dateStr = isValid
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
                  : "";
                const isToday = dateStr === todayStr;
                const dayTasks = dateStr ? (tasksByDate.get(dateStr) ?? []) : [];

                return (
                  <div
                    key={i}
                    className={`min-h-[96px] border-b border-r border-slate-100 p-1.5 ${!isValid ? "bg-slate-50/50" : ""}`}
                  >
                    {isValid && (
                      <>
                        <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? "bg-slate-900 text-white" : "text-slate-600"}`}>
                          {dayNum}
                        </div>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 3).map((task) => (
                            <button
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition hover:opacity-80 ${STATUS_COLORS[task.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {task.title}
                            </button>
                          ))}
                          {dayTasks.length > 3 && (
                            <p className="px-1 text-xs text-slate-400">+{dayTasks.length - 3} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Task popover */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelectedTask(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
              </button>
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">Project:</span> {selectedTask.projectName}</p>
              <p><span className="font-medium text-slate-700">Status:</span> {selectedTask.status.replace("_", " ")}</p>
              <p><span className="font-medium text-slate-700">Priority:</span> {selectedTask.priority}</p>
              {selectedTask.dueDate && (
                <p><span className="font-medium text-slate-700">Due:</span> {new Date(selectedTask.dueDate).toLocaleDateString()}</p>
              )}
              {selectedTask.assignedTo && (
                <p><span className="font-medium text-slate-700">Assigned to:</span> {selectedTask.assignedTo.name || selectedTask.assignedTo.email}</p>
              )}
              {selectedTask.description && (
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{selectedTask.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks without due dates */}
      {!loading && filteredTasks.filter((t) => !t.dueDate).length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Tasks without due dates</h3>
          <div className="flex flex-wrap gap-2">
            {filteredTasks.filter((t) => !t.dueDate).map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[task.status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
