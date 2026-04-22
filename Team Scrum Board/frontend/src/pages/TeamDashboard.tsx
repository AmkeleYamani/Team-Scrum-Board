import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { Project, Team } from "../types";

function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");

  // Team editing
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamMemberEmails, setTeamMemberEmails] = useState("");
  const [deletingTeam, setDeletingTeam] = useState(false);

  // Project creation / editing
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadTeam();
  }, [teamId]);

  async function loadTeam() {
    if (!teamId) return;
    try {
      const res = await api.get<Team>(`/teams/${teamId}`);
      setTeam(res.data);
    } catch {
      setError("Unable to load team.");
    }
  }

  // ── Team edit ────────────────────────────────────────────────────────────

  function startEditTeam() {
    if (!team) return;
    setTeamName(team.name);
    setTeamMemberEmails(team.members.map((m) => m.user.email).join(", "));
    setEditingTeam(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleTeamSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    const collaborators = teamMemberEmails.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await api.patch<Team>(`/teams/${teamId}`, { name: teamName.trim(), memberEmails: collaborators });
      setTeam(res.data);
      setEditingTeam(false);
    } catch {
      setError("Unable to update team.");
    }
  }

  async function handleDeleteTeam() {
    try {
      await api.delete(`/teams/${teamId}`);
      navigate("/dashboard?tab=teams");
    } catch {
      setError("Unable to delete team.");
      setDeletingTeam(false);
    }
  }

  // ── Project handlers ─────────────────────────────────────────────────────

  async function handleProjectSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (editingProjectId) {
      try {
        const res = await api.patch<Project>(`/teams/${teamId}/projects/${editingProjectId}`, { name: projectName.trim(), description: projectDescription.trim() });
        setTeam((cur) => cur ? { ...cur, projects: cur.projects.map((p) => p.id === editingProjectId ? res.data : p) } : cur);
        setEditingProjectId(null);
        setProjectName("");
        setProjectDescription("");
      } catch {
        setError("Unable to update project.");
      }
    } else {
      try {
        const res = await api.post<Project>(`/teams/${teamId}/projects`, { name: projectName, description: projectDescription.trim() });
        setTeam((cur) => cur ? { ...cur, projects: [res.data, ...cur.projects] } : cur);
        setProjectName("");
        setProjectDescription("");
      } catch {
        setError("Unable to create project.");
      }
    }
  }

  function startEditProject(project: Project, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingProjectId(project.id);
    setProjectName(project.name);
    setProjectDescription(project.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditProject() {
    setEditingProjectId(null);
    setProjectName("");
    setProjectDescription("");
  }

  async function executeDeleteProject(projectId: string) {
    try {
      await api.delete(`/teams/${teamId}/projects/${projectId}`);
      setTeam((cur) => cur ? { ...cur, projects: cur.projects.filter((p) => p.id !== projectId) } : cur);
      setDeletingProjectId(null);
    } catch {
      setError("Unable to delete project.");
      setDeletingProjectId(null);
    }
  }

  if (!team) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">{error || "Loading team…"}</div>;
  }

  const isTeamCreator = currentUser.id === team.createdBy?.id;

  return (
    <div className="space-y-8">
      {/* Delete team modal */}
      {deletingTeam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete team?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete the team and all its projects and tasks. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeletingTeam(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteTeam} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete project modal */}
      {deletingProjectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete project?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete the project and all its tasks. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeletingProjectId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => executeDeleteProject(deletingProjectId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => navigate("/dashboard?tab=teams")}
        className="rounded bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300"
      >
        ← Back to teams
      </button>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {/* Team info / edit section */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        {editingTeam ? (
          <>
            <h2 className="text-2xl font-semibold text-slate-900">Edit Team</h2>
            <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={handleTeamSave}>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
              />
              <input
                value={teamMemberEmails}
                onChange={(e) => setTeamMemberEmails(e.target.value)}
                placeholder="Members (comma-separated emails)"
                className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingTeam(false)} className="flex-1 rounded border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 rounded bg-slate-900 px-4 py-3 text-white hover:bg-slate-700">
                  Save changes
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{team.name}</h2>
              <p className="mt-1 text-sm text-slate-500">All team members can view and manage projects in this team.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {team.members.map((m) => (
                  <span key={m.user.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {m.user.name || m.user.email}
                  </span>
                ))}
              </div>
            </div>
            {isTeamCreator ? (
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={startEditTeam}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit team
                </button>
                <button
                  onClick={() => setDeletingTeam(true)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete team
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Project creation section */}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Team Projects</h2>
          <p className="mt-1 text-sm text-slate-500">Projects are visible to all team members.</p>
        </div>
        <form className="mt-6 space-y-3" onSubmit={handleProjectSubmit}>
          <div className="flex gap-4">
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name"
              className="flex-1 rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
            />
            <div className="flex gap-2">
              {editingProjectId ? (
                <button type="button" onClick={cancelEditProject} className="rounded border border-slate-300 px-4 py-3 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
              ) : null}
              <button type="submit" className="rounded bg-slate-900 px-6 py-3 text-white hover:bg-slate-700">
                {editingProjectId ? "Save changes" : "Create project"}
              </button>
            </div>
          </div>
          <input
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Project description (optional)"
            className="w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
          />
        </form>
      </section>

      {/* Projects grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {team.projects.map((project) => (
          <div
            key={project.id}
            onClick={() => editingProjectId !== project.id && navigate(`/project/${project.id}`)}
            className="group relative cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            {currentUser.id === project.createdBy?.id && editingProjectId !== project.id ? (
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={(e) => startEditProject(project, e)} title="Edit project" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingProjectId(project.id); }} title="Delete project" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ) : null}
            <div className={editingProjectId === project.id ? "ring-2 ring-slate-900 rounded-xl p-1 -m-1" : ""}>
              <h3 className="pr-16 text-lg font-semibold text-slate-900">{project.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}</p>
              {project.description ? <p className="mt-2 text-sm text-slate-400 line-clamp-2">{project.description}</p> : null}
            </div>
            {project.createdBy ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {project.createdBy.name || project.createdBy.email}
                </span>
              </div>
            ) : null}
          </div>
        ))}
        {team.projects.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500">No projects yet. Create one above.</p>
        ) : null}
      </section>
    </div>
  );
}

export default TeamDashboard;
