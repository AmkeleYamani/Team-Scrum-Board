import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { Project, Task, User } from "../types";
import TaskDetailModal from "../components/TaskDetailModal";

const statusColumns = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "PAUSE", label: "Paused" },
  { key: "TEST", label: "Testing" },
  { key: "DONE", label: "Done" },
] as const;

const priorityClasses = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

function Board() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");

  // New task form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const currentUser: User = JSON.parse(localStorage.getItem("user") || "{}");

  async function loadProject() {
    if (!projectId) return;
    try {
      const response = await api.get<Project>(`/projects/${projectId}`);
      setProject(response.data);
    } catch {
      setError("Unable to load project. Please check access rights.");
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const columns = useMemo(() => {
    if (!project) return { TODO: [], IN_PROGRESS: [], PAUSE: [], TEST: [], DONE: [] } as Record<string, Task[]>;
    return project.tasks.reduce<Record<string, Task[]>>(
      (acc, task) => {
        acc[task.status] ||= [];
        acc[task.status].push(task);
        return acc;
      },
      { TODO: [], IN_PROGRESS: [], PAUSE: [], TEST: [], DONE: [] }
    );
  }, [project]);

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!projectId) return;
    try {
      const response = await api.post<Task>(`/tasks/projects/${projectId}/tasks`, {
        title,
        description,
        status,
        priority,
        dueDate: dueDate || null,
        assignedToId: assignedToId || null,
      });
      setProject((current) =>
        current ? { ...current, tasks: [response.data, ...current.tasks] } : current
      );
      setTitle("");
      setDescription("");
      setStatus("TODO");
      setPriority("MEDIUM");
      setDueDate("");
      setAssignedToId("");
    } catch {
      setError("Unable to create task.");
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    try {
      const response = await api.patch<Task>(`/tasks/${taskId}`, { status: newStatus });
      setProject((current) => {
        if (!current) return current;
        return {
          ...current,
          tasks: current.tasks.map((t) => (t.id === response.data.id ? response.data : t)),
        };
      });
    } catch {
      setError("Unable to update task status.");
    }
  }

  function handleTaskUpdated(updated: Task) {
    setProject((current) => {
      if (!current) return current;
      return {
        ...current,
        tasks: current.tasks.map((t) => (t.id === updated.id ? updated : t)),
      };
    });
    setSelectedTask(updated);
  }

  function handleTaskDeleted(taskId: string) {
    setProject((current) => {
      if (!current) return current;
      return { ...current, tasks: current.tasks.filter((t) => t.id !== taskId) };
    });
    setSelectedTask(null);
  }

  function allowDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, taskId: string) {
    event.dataTransfer.setData("text/plain", taskId);
  }

  async function onDrop(event: DragEvent<HTMLDivElement>, columnKey: string) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    if (taskId) await updateTaskStatus(taskId, columnKey);
  }

  return (
    <div className="space-y-8">
      {/* Task detail modal */}
      {selectedTask && project ? (
        <TaskDetailModal
          task={selectedTask}
          members={project.members}
          projectId={project.id}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      ) : null}

      <button
        className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
        onClick={() => navigate(project?.teamId ? `/teams/${project.teamId}` : "/dashboard")}
      >
        Back to projects
      </button>

      {project ? (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{project.name}</h2>
                <p className="mt-2 text-slate-600">Team members and task board for this project.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.members.map((member) => (
                  <span
                    key={member.user.id}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {member.user.name || member.user.email}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
            {/* New task form */}
            <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900">New task</h3>
              {error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              ) : null}
              <form className="space-y-4" onSubmit={handleCreateTask}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                    rows={4}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="PAUSE">Paused</option>
                      <option value="TEST">Testing</option>
                      <option value="DONE">Done</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Priority</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Assign to</span>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {project.members.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name || member.user.email}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="w-full rounded bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700"
                  type="submit"
                >
                  Add task
                </button>
              </form>
            </div>

            {/* Kanban columns */}
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-4">
                {statusColumns.map((column) => (
                  <div key={column.key} className="w-[270px] shrink-0 rounded-3xl bg-slate-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-slate-900">{column.label}</h4>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {columns[column.key].length}
                      </span>
                    </div>
                    <div
                      className="min-h-[300px] space-y-3"
                      onDragOver={allowDrop}
                      onDrop={(e) => onDrop(e, column.key)}
                    >
                      {columns[column.key].length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                          No tasks
                        </div>
                      ) : (
                        columns[column.key].map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, task.id)}
                            onClick={() => setSelectedTask(task)}
                            className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-sm font-semibold text-slate-900">{task.title}</h5>
                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${priorityClasses[task.priority]}`}
                              >
                                {task.priority.toLowerCase()}
                              </span>
                            </div>
                            {task.description ? (
                              <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {task.dueDate ? (
                                <span className="text-xs text-slate-400">
                                  Due {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              ) : null}
                              {task.assignedTo ? (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                                  {task.assignedTo.name || task.assignedTo.email}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-3xl bg-white p-6 shadow-sm">Loading project…</div>
      )}
    </div>
  );
}

export default Board;
