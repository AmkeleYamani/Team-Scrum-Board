import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

const projectInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
  tasks: true,
} as const;

// GET /api/projects — personal projects only
router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const projects = await prisma.project.findMany({
    where: {
      teamId: null,
      members: { some: { userId } },
    },
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.json(projects);
});

// POST /api/projects — create personal project
router.post("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, description = "", memberEmails = [] } = req.body;

  if (!name) return res.status(400).json({ message: "Project name is required." });

  const collaborators = Array.isArray(memberEmails) ? memberEmails.filter(Boolean) : [];
  const users = await prisma.user.findMany({ where: { email: { in: collaborators } } });
  const uniqueMemberIds = Array.from(new Set([...users.map((u) => u.id), userId]));

  const project = await prisma.project.create({
    data: {
      name,
      description,
      createdById: userId,
      members: { create: uniqueMemberIds.map((id: string) => ({ userId: id })) },
    },
    include: projectInclude,
  });
  return res.status(201).json(project);
});

// GET /api/projects/:projectId — personal or team project
router.get("/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
      team: {
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      },
    },
  });

  if (!project) return res.status(404).json({ message: "Project not found." });

  const isProjectMember = project.members.some((m) => m.userId === userId);
  const isTeamMember = project.team?.members.some((m) => m.userId === userId) ?? false;

  if (!isProjectMember && !isTeamMember) {
    return res.status(403).json({ message: "Access denied." });
  }

  const { team, ...rest } = project;
  return res.json({
    ...rest,
    teamId: project.teamId ?? null,
    members: project.teamId && team ? team.members : project.members,
  });
});

// PATCH /api/projects/:projectId — update personal project (creator only)
router.patch("/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;
  const { name, description, memberEmails = [] } = req.body;

  if (!name) return res.status(400).json({ message: "Project name is required." });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ message: "Project not found." });
  if (project.createdById !== userId) return res.status(403).json({ message: "Only the project creator can edit it." });

  const collaborators = Array.isArray(memberEmails) ? memberEmails.filter(Boolean) : [];
  const users = await prisma.user.findMany({ where: { email: { in: collaborators } } });
  const uniqueMemberIds = Array.from(new Set([...users.map((u) => u.id), userId]));

  await prisma.projectMembership.deleteMany({ where: { projectId } });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      ...(description !== undefined && { description }),
      members: { create: uniqueMemberIds.map((id: string) => ({ userId: id })) },
    },
    include: projectInclude,
  });
  return res.json(updated);
});

// DELETE /api/projects/:projectId — delete personal project (creator only)
router.delete("/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ message: "Project not found." });
  if (project.createdById !== userId) return res.status(403).json({ message: "Only the project creator can delete it." });

  await prisma.project.delete({ where: { id: projectId } });
  return res.status(204).send();
});

export default router;
