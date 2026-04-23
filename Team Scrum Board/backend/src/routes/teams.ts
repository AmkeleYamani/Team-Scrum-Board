import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

const projectInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
  tasks: true,
} as const;

const teamInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  members: { include: { user: { select: { id: true, name: true, email: true } } } },
  projects: { include: projectInclude, orderBy: { createdAt: "desc" as const } },
} as const;

// GET /api/teams
router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const teams = await prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: teamInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.json(teams);
});

// POST /api/teams
router.post("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, memberEmails = [] } = req.body;

  if (!name) return res.status(400).json({ message: "Team name is required." });

  const collaborators = Array.isArray(memberEmails) ? memberEmails.filter(Boolean) : [];
  const users = await prisma.user.findMany({ where: { email: { in: collaborators } } });
  const uniqueMemberIds = Array.from(new Set([...users.map((u) => u.id), userId]));

  const team = await prisma.team.create({
    data: {
      name,
      createdById: userId,
      members: { create: uniqueMemberIds.map((id) => ({ userId: id })) },
    },
    include: teamInclude,
  });
  return res.status(201).json(team);
});

// GET /api/teams/:teamId
router.get("/:teamId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId } = req.params;

  const team = await prisma.team.findFirst({
    where: { id: teamId, members: { some: { userId } } },
    include: teamInclude,
  });

  if (!team) return res.status(404).json({ message: "Team not found or access denied." });
  return res.json(team);
});

// PATCH /api/teams/:teamId
router.patch("/:teamId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId } = req.params;
  const { name, memberEmails = [] } = req.body;

  if (!name) return res.status(400).json({ message: "Team name is required." });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ message: "Team not found." });
  if (team.createdById !== userId) return res.status(403).json({ message: "Only the team creator can edit it." });

  const collaborators = Array.isArray(memberEmails) ? memberEmails.filter(Boolean) : [];
  const users = await prisma.user.findMany({ where: { email: { in: collaborators } } });
  const uniqueMemberIds = [...new Set([...users.map((u) => u.id), userId])];

  const updated = await prisma.$transaction(async (tx) => {
    await tx.teamMembership.deleteMany({ where: { teamId } });
    await tx.teamMembership.createMany({
      data: uniqueMemberIds.map((uid) => ({ teamId, userId: uid })),
    });
    return tx.team.update({ where: { id: teamId }, data: { name }, include: teamInclude });
  });

  return res.json(updated);
});

// POST /api/teams/:teamId/members — add a single member by email (creator only)
router.post("/:teamId/members", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId } = req.params;
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ message: "Team not found." });
  if (team.createdById !== userId) return res.status(403).json({ message: "Only the team creator can add members." });

  const userToAdd = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!userToAdd) return res.status(404).json({ message: "No registered user found with that email." });

  const existing = await prisma.teamMembership.findFirst({ where: { teamId, userId: userToAdd.id } });
  if (existing) return res.status(409).json({ message: "User is already a team member." });

  await prisma.teamMembership.create({ data: { teamId, userId: userToAdd.id } });

  const updated = await prisma.team.findUnique({ where: { id: teamId }, include: teamInclude });
  return res.json(updated);
});

// DELETE /api/teams/:teamId
router.delete("/:teamId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId } = req.params;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return res.status(404).json({ message: "Team not found." });
  if (team.createdById !== userId) return res.status(403).json({ message: "Only the team creator can delete it." });

  await prisma.team.delete({ where: { id: teamId } });
  return res.status(204).send();
});

// POST /api/teams/:teamId/projects
router.post("/:teamId/projects", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId } = req.params;
  const { name, description = "" } = req.body;

  if (!name) return res.status(400).json({ message: "Project name is required." });

  const teamMember = await prisma.teamMembership.findFirst({ where: { teamId, userId } });
  if (!teamMember) return res.status(403).json({ message: "Access denied." });

  const project = await prisma.project.create({
    data: { name, description, createdById: userId, teamId },
    include: projectInclude,
  });
  return res.status(201).json(project);
});

// PATCH /api/teams/:teamId/projects/:projectId
router.patch("/:teamId/projects/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId, projectId } = req.params;
  const { name, description } = req.body;

  if (!name) return res.status(400).json({ message: "Project name is required." });

  const project = await prisma.project.findFirst({ where: { id: projectId, teamId } });
  if (!project) return res.status(404).json({ message: "Project not found." });
  if (project.createdById !== userId) return res.status(403).json({ message: "Only the project creator can edit it." });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name, ...(description !== undefined && { description }) },
    include: projectInclude,
  });
  return res.json(updated);
});

// DELETE /api/teams/:teamId/projects/:projectId
router.delete("/:teamId/projects/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { teamId, projectId } = req.params;

  const project = await prisma.project.findFirst({ where: { id: projectId, teamId } });
  if (!project) return res.status(404).json({ message: "Project not found." });
  if (project.createdById !== userId) return res.status(403).json({ message: "Only the project creator can delete it." });

  await prisma.project.delete({ where: { id: projectId } });
  return res.status(204).send();
});

export default router;
