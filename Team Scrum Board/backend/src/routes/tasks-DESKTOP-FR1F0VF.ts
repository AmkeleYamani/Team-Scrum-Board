import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

async function verifyMembership(userId: string, projectId: string) {
  const membership = await prisma.projectMembership.findFirst({
    where: { userId, projectId },
  });
  return Boolean(membership);
}

router.post("/projects/:projectId/tasks", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;
  const { title, description, status, priority, dueDate, assignedToId } = req.body;

  if (!title || !status || !priority) {
    return res.status(400).json({ message: "Title, status and priority are required." });
  }

  const member = await verifyMembership(userId, projectId);
  if (!member) {
    return res.status(403).json({ message: "Access denied." });
  }

  if (assignedToId) {
    const assignedMember = await prisma.projectMembership.findFirst({
      where: { projectId, userId: assignedToId },
    });
    if (!assignedMember) {
      return res.status(400).json({ message: "Assigned user must belong to the project." });
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || "",
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      assignedToId: assignedToId || null,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  return res.status(201).json(task);
});

router.patch("/:taskId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assignedToId } = req.body;

  const task = await prisma.task.findUnique({ include: { project: true }, where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const member = await verifyMembership(userId, task.projectId);
  if (!member) {
    return res.status(403).json({ message: "Access denied." });
  }

  if (assignedToId) {
    const assignedMember = await prisma.projectMembership.findFirst({
      where: { projectId: task.projectId, userId: assignedToId },
    });
    if (!assignedMember) {
      return res.status(400).json({ message: "Assigned user must belong to the project." });
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      status,
      priority,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,
      assignedToId: assignedToId === undefined ? undefined : assignedToId || null,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  return res.json(updated);
});

router.delete("/:taskId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return res.status(404).json({ message: "Task not found." });
  }

  const member = await verifyMembership(userId, task.projectId);
  if (!member) {
    return res.status(403).json({ message: "Access denied." });
  }

  await prisma.task.delete({ where: { id: taskId } });
  return res.status(204).send();
});

export default router;
