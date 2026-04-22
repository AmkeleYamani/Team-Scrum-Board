import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Returns true if the user is a direct project member OR a team member of the project's team
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      teamId: true,
      members: { where: { userId }, select: { id: true } },
    },
  });
  if (!project) return false;
  if (project.members.length > 0) return true;
  if (project.teamId) {
    const tm = await prisma.teamMembership.findFirst({ where: { userId, teamId: project.teamId } });
    return Boolean(tm);
  }
  return false;
}

// Returns true if the given user can be assigned to a task in this project
async function verifyAssigneeInProject(assigneeId: string, projectId: string): Promise<boolean> {
  return verifyProjectAccess(assigneeId, projectId);
}

// Create task
router.post("/projects/:projectId/tasks", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;
  const { title, description, status, priority, dueDate, assignedToId } = req.body;

  if (!title || !status || !priority) {
    return res.status(400).json({ message: "Title, status and priority are required." });
  }

  const hasAccess = await verifyProjectAccess(userId, projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  if (assignedToId) {
    const assigneeOk = await verifyAssigneeInProject(assignedToId, projectId);
    if (!assigneeOk) return res.status(400).json({ message: "Assigned user must belong to the project or team." });
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

// Update task
router.patch("/:taskId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assignedToId } = req.body;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ message: "Task not found." });

  const hasAccess = await verifyProjectAccess(userId, task.projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  if (assignedToId) {
    const assigneeOk = await verifyAssigneeInProject(assignedToId, task.projectId);
    if (!assigneeOk) return res.status(400).json({ message: "Assigned user must belong to the project or team." });
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

// Delete task
router.delete("/:taskId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ message: "Task not found." });

  const hasAccess = await verifyProjectAccess(userId, task.projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  await prisma.task.delete({ where: { id: taskId } });
  return res.status(204).send();
});

// Get comments for a task
router.get("/:taskId/comments", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ message: "Task not found." });

  const hasAccess = await verifyProjectAccess(userId, task.projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      attachments: true,
      mentions: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json(comments);
});

// Add comment to a task (with optional file attachments)
router.post("/:taskId/comments", upload.array("files", 10), async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;
  const { content, mentionedUserIds } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Comment content is required." });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ message: "Task not found." });

  const hasAccess = await verifyProjectAccess(userId, task.projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  const mentionIds: string[] = mentionedUserIds
    ? Array.isArray(mentionedUserIds)
      ? mentionedUserIds
      : [mentionedUserIds]
    : [];

  const files = (req.files as Express.Multer.File[]) || [];

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId,
      authorId: userId,
      attachments: {
        create: files.map((file) => ({
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
        })),
      },
      mentions: {
        create: mentionIds.map((uid) => ({ userId: uid })),
      },
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      attachments: true,
      mentions: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  return res.status(201).json(comment);
});

// Delete a comment (author only)
router.delete("/comments/:commentId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { commentId } = req.params;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return res.status(404).json({ message: "Comment not found." });
  if (comment.authorId !== userId) {
    return res.status(403).json({ message: "Only the comment author can delete it." });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return res.status(204).send();
});

export default router;
