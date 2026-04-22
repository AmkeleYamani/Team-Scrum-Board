import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: true,
    },
  });

  return res.json(projects);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, memberEmails = [] } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Project name is required." });
  }

  const collaborators = Array.isArray(memberEmails) ? memberEmails.filter(Boolean) : [];
  const users = await prisma.user.findMany({
    where: { email: { in: collaborators } },
  });

  const uniqueMemberIds = Array.from(new Set([...users.map((user) => user.id), userId]));
  const project = await prisma.project.create({
    data: {
      name,
      createdById: userId,
      members: {
        create: uniqueMemberIds.map((id: string) => ({ userId: id })),
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: true,
    },
  });

  return res.status(201).json(project);
});

router.get("/:projectId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: { some: { userId } },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ message: "Project not found or access denied." });
  }

  return res.json(project);
});

export default router;
