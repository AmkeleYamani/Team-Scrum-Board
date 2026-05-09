import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Project, Team } from "../types";
import AnalyticsDashboard from "./AnalyticsDashboard";
import Notes from "../components/Notes";

function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "teams" ? "teams" : tabParam === "analytics" ? "analytics" : tabParam === "notes" ? "notes" : "projects";

  // Personal projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState("");

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamMemberEmails, setTeamMemberEmails] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState("");

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    loadProjects();
    loadTeams();
  }, []);

  async function loadProjects() {
    try {
      const res = await api.get<Project[]>("/projects");
      setProjects(res.data);
    } catch {
      setProjectError("Unable to load projects.");
    }
  }

  async function loadTeams() {
    try {
      const res = await api.get<Team[]>("/teams");
      setTeams(res.data);
    } catch {
      setTeamError("Unable to load teams.");
    }
  }

  // ── Personal project handlers ────────────────────────────────────────────

  async function handleProjectSubmit(event: FormEvent) {
    event.preventDefault();
    setProjectError("");
    const collaborators = memberEmails.split(",").map((e) => e.trim()).filter(Boolean);
    if (editingId) {
      try {
        const res = await api.patch<Project>(`/projects/${editingId}`, { name: name.trim(), description: description.trim(), memberEmails: collaborators });
        setProjects((cur) => cur.map((p) => (p.id === editingId ? res.data : p)));
        setEditingId(null);
        setName("");
        setDescription("");
        setMemberEmails("");
      } catch {
        setProjectError("Unable to update project.");
      }
    } else {
      try {
        const res = await api.post<Project>("/projects", { name, description: description.trim(), memberEmails: collaborators });
        setProjects((cur) => [res.data, ...cur]);
        setName("");
        setDescription("");
        setMemberEmails("");
      } catch {
        setProjectError("Unable to create project.");
      }
    }
  }

  function startEditProject(project: Project, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description || "");
    setMemberEmails(project.members.map((m) => m.user.email).join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditProject() {
    setEditingId(null);
    setName("");
    setDescription("");
    setMemberEmails("");
  }

  async function executeDeleteProject(projectId: string) {
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects((cur) => cur.filter((p) => p.id !== projectId));
      setDeletingId(null);
    } catch {
      setProjectError("Unable to delete project.");
      setDeletingId(null);
    }
  }

  // ── Team handlers ────────────────────────────────────────────────────────

  async function handleTeamSubmit(event: FormEvent) {
    event.preventDefault();
    setTeamError("");
    const collaborators = teamMemberEmails.split(",").map((e) => e.trim()).filter(Boolean);
    if (editingTeamId) {
      try {
        const res = await api.patch<Team>(`/teams/${editingTeamId}`, { name: teamName.trim(), memberEmails: collaborators });
        setTeams((cur) => cur.map((t) => (t.id === editingTeamId ? res.data : t)));
        setEditingTeamId(null);
        setTeamName("");
        setTeamMemberEmails("");
      } catch {
        setTeamError("Unable to update team.");
      }
    } else {
      try {
        const res = await api.post<Team>("/teams", { name: teamName, memberEmails: collaborators });
        setTeams((cur) => [res.data, ...cur]);
        setTeamName("");
        setTeamMemberEmails("");
      } catch {
        setTeamError("Unable to create team.");
      }
    }
  }

  function startEditTeam(team: Team, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamMemberEmails(team.members.map((m) => m.user.email).join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditTeam() {
    setEditingTeamId(null);
    setTeamName("");
    setTeamMemberEmails("");
  }

  async function executeDeleteTeam(teamId: string) {
    try {
      await api.delete(`/teams/${teamId}`);
      setTeams((cur) => cur.filter((t) => t.id !== teamId));
      setDeletingTeamId(null);
    } catch {
      setTeamError("Unable to delete team.");
      setDeletingTeamId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Delete project modal */}
      {deletingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete project?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete the project and all its tasks. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => executeDeleteProject(deletingId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete team modal */}
      {deletingTeamId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete team?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will permanently delete the team and all its projects and tasks. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeletingTeamId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => executeDeleteTeam(deletingTeamId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setSearchParams({})}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${activeTab === "projects" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          My Projects
        </button>
        <button
          onClick={() => setSearchParams({ tab: "teams" })}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${activeTab === "teams" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          My Team Projects
        </button>
        <button
          onClick={() => setSearchParams({ tab: "analytics" })}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${activeTab === "analytics" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Analytics
        </button>
        <button
          onClick={() => setSearchParams({ tab: "notes" })}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${activeTab === "notes" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          Notes
        </button>
      </div>

      {/* ── MY PROJECTS TAB ─────────────────────────────────────────────── */}
      {activeTab === "projects" ? (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Your Projects</h2>
              <p className="mt-1 text-sm text-slate-500">Create a project and collaborate with your team.</p>
            </div>
            {projectError ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{projectError}</div> : null}
            <form className="mt-6 space-y-3" onSubmit={handleProjectSubmit}>
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
                />
                <textarea
                  value={memberEmails}
                  onChange={(e) => setMemberEmails(e.target.value)}
                  placeholder="Collaborators (comma-separated emails)"
                  className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none min-h-[48px] resize"
                />
                <div className="flex gap-2">
                  {editingId ? (
                    <button type="button" onClick={cancelEditProject} className="flex-1 rounded border border-slate-300 px-4 py-3 text-slate-700 transition hover:bg-slate-50">
                      Cancel
                    </button>
                  ) : null}
                  <button className="flex-1 rounded bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700" type="submit">
                    {editingId ? "Save changes" : "Create project"}
                  </button>
                </div>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description (optional)"
                className="w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none min-h-[48px] resize"
              />
            </form>
          </section>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => editingId !== project.id && navigate(`/project/${project.id}`)}
                className="group relative cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {currentUser.id === project.createdBy?.id && editingId !== project.id ? (
                  <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={(e) => startEditProject(project, e)} title="Edit project" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(project.id); }} title="Delete project" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : null}
                <div className={editingId === project.id ? "ring-2 ring-slate-900 rounded-xl p-1 -m-1" : ""}>
                  <h3 className="pr-16 text-lg font-semibold text-slate-900">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}</p>
                  {project.description ? <p className="mt-2 text-sm text-slate-400 line-clamp-2">{project.description}</p> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.members.map((member) => (
                    <span key={member.user.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {member.user.name || member.user.email}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
      {activeTab === "analytics" ? <AnalyticsDashboard /> : null}

      {/* ── NOTES TAB ───────────────────────────────────────────────────── */}
      {activeTab === "notes" ? <Notes /> : null}

      {/* ── MY TEAMS TAB ────────────────────────────────────────────────── */}
      {activeTab === "teams" ? (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Your Teams</h2>
              <p className="mt-1 text-sm text-slate-500">Create a team and invite members to collaborate on shared projects.</p>
            </div>
            {teamError ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{teamError}</div> : null}
            <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={handleTeamSubmit}>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none"
              />
              <textarea
                value={teamMemberEmails}
                onChange={(e) => setTeamMemberEmails(e.target.value)}
                placeholder="Members (comma-separated emails)"
                className="rounded border border-slate-300 bg-slate-50 px-4 py-3 focus:border-slate-900 focus:outline-none min-h-[48px] resize"
              />
              <div className="flex gap-2">
                {editingTeamId ? (
                  <button type="button" onClick={cancelEditTeam} className="flex-1 rounded border border-slate-300 px-4 py-3 text-slate-700 transition hover:bg-slate-50">
                    Cancel
                  </button>
                ) : null}
                <button className="flex-1 rounded bg-slate-900 px-4 py-3 text-white transition hover:bg-slate-700" type="submit">
                  {editingTeamId ? "Save changes" : "Create team"}
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team.id}
                onClick={() => editingTeamId !== team.id && navigate(`/teams/${team.id}`)}
                className="group relative cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                {currentUser.id === team.createdBy?.id && editingTeamId !== team.id ? (
                  <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={(e) => startEditTeam(team, e)} title="Edit team" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingTeamId(team.id); }} title="Delete team" className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : null}
                <div className={editingTeamId === team.id ? "ring-2 ring-slate-900 rounded-xl p-1 -m-1" : ""}>
                  <h3 className="pr-16 text-lg font-semibold text-slate-900">{team.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{team.projects.length} project{team.projects.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {team.members.map((member) => (
                    <span key={member.user.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {member.user.name || member.user.email}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default Dashboard;
