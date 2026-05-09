import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/stats", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const personalProjects = await prisma.project.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, tasks: { select: { id: true, status: true, dueDate: true, updatedAt: true, assignedToId: true } } },
  });

  const userTeams = await prisma.teamMembership.findMany({
    where: { userId },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          projects: {
            select: {
              id: true,
              name: true,
              tasks: { select: { id: true, status: true, dueDate: true, updatedAt: true, assignedToId: true } },
            },
          },
        },
      },
    },
  });

  const teamProjectIds = new Set<string>();
  userTeams.forEach((tm) => tm.team.projects.forEach((p) => teamProjectIds.add(p.id)));
  const personalProjectIds = new Set(personalProjects.map((p) => p.id));

  const allProjectsMap = new Map<string, { id: string; name: string; tasks: { id: string; status: string; dueDate: Date | null; updatedAt: Date; assignedToId: string | null }[] }>();
  for (const p of personalProjects) allProjectsMap.set(p.id, p as any);
  for (const tm of userTeams) {
    for (const p of tm.team.projects) {
      if (!allProjectsMap.has(p.id)) allProjectsMap.set(p.id, p as any);
    }
  }

  const allProjects = Array.from(allProjectsMap.values());
  const allTasks = allProjects.flatMap((p) => p.tasks);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayStart.getDate() + 1);

  const completedTasks = allTasks.filter((t) => t.status === "DONE").length;
  const overdueTasks = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < todayStart && t.status !== "DONE").length;
  const tasksDueToday = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) < todayEnd).length;

  const tasksByStatus: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const tasksByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };

  const allTasksFull = await prisma.task.findMany({
    where: { projectId: { in: allProjects.map((p) => p.id) } },
    select: { status: true, priority: true },
  });

  for (const t of allTasksFull) {
    if (t.status in tasksByStatus) tasksByStatus[t.status]++;
    if (t.priority in tasksByPriority) tasksByPriority[t.priority]++;
  }

  const uniqueMembersSet = new Set<string>();
  for (const tm of userTeams) {
    for (const m of tm.team.members) uniqueMembersSet.add(m.user.id);
  }
  const totalTeamMembers = uniqueMembersSet.size;
  const activeTeams = userTeams.length;

  const memberProductivityMap = new Map<string, { name: string; email: string; completedTasks: number; totalTasks: number }>();
  for (const tm of userTeams) {
    for (const m of tm.team.members) {
      if (!memberProductivityMap.has(m.user.id)) {
        memberProductivityMap.set(m.user.id, { name: m.user.name || m.user.email, email: m.user.email, completedTasks: 0, totalTasks: 0 });
      }
    }
  }

  for (const task of allTasks) {
    if (!task.assignedToId) continue;
    const entry = memberProductivityMap.get(task.assignedToId);
    if (entry) {
      entry.totalTasks++;
      if (task.status === "DONE") entry.completedTasks++;
    }
  }

  const memberProductivity = Array.from(memberProductivityMap.values());

  const projectProgress = allProjects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    return { name: p.name, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const weeklyCompletions: { week: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = allTasks.filter((t) => t.status === "DONE" && t.updatedAt >= weekStart && t.updatedAt < weekEnd).length;
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    weeklyCompletions.push({ week: label, count });
  }

  return res.json({
    totalProjects: allProjects.length,
    completedTasks,
    overdueTasks,
    tasksDueToday,
    totalTeamMembers,
    activeTeams,
    tasksByStatus,
    tasksByPriority,
    memberProductivity,
    projectProgress,
    weeklyCompletions,
  });
});

export default router;
