import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";
import { sendOnce } from "../emailHelper";

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

async function verifyAssigneeInProject(assigneeId: string, projectId: string): Promise<boolean> {
  return verifyProjectAccess(assigneeId, projectId);
}

router.post("/projects/:projectId/tasks", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { projectId } = req.params;
  const { title, description, status, priority, dueDate, startDate, assignedToId } = req.body;

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
      startDate: startDate ? new Date(startDate) : null,
      projectId,
      assignedToId: assignedToId || null,
    },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });

  if (task.assignedToId) {
    const assignedUser = await prisma.user.findUnique({ where: { id: task.assignedToId }, select: { email: true } });
    if (assignedUser?.email) {
      const proj = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
      sendOnce(
        "task_assigned",
        assignedUser.email,
        task.id,
        `You've been assigned a task: ${task.title}`,
        `<p>You have been assigned the task <strong>${task.title}</strong> in project <strong>${proj?.name}</strong>. Priority: ${task.priority}. Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}.</p>`
      );
    }
  }

  return res.status(201).json(task);
});

router.patch("/:taskId", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, startDate, assignedToId } = req.body;

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
      startDate: startDate === null ? null : startDate ? new Date(startDate) : undefined,
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
  if (!task) return res.status(404).json({ message: "Task not found." });

  const hasAccess = await verifyProjectAccess(userId, task.projectId);
  if (!hasAccess) return res.status(403).json({ message: "Access denied." });

  await prisma.task.delete({ where: { id: taskId } });
  return res.status(204).send();
});

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

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const baseUrl = railwayDomain ? `https://${railwayDomain}` : "";

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      taskId,
      authorId: userId,
      attachments: {
        create: files.map((file) => ({
          filename: file.originalname,
          url: `${baseUrl}/uploads/${file.filename}`,
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

  for (const uid of mentionIds) {
    const mentionedUser = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
    if (mentionedUser?.email) {
      sendOnce(
        "mention",
        mentionedUser.email,
        comment.id,
        `You were mentioned in a comment`,
        `<p>${comment.author?.name || "Someone"} mentioned you in a comment on task <strong>${task.title}</strong>.</p><p>"${content.trim()}"</p>`
      );
    }
  }

  return res.status(201).json(comment);
});

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
