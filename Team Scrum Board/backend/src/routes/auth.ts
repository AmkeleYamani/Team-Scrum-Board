import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const trimmedEmail = email.trim();
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE LOWER(email) = LOWER(${trimmedEmail}) LIMIT 1
  `;
  if (existing.length > 0) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name || trimmedEmail,
      email: trimmedEmail,
      password: hashedPassword,
    },
  });

  const secret = process.env.JWT_SECRET || "secret";
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "8h" });

  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const result = await prisma.$queryRaw<{ id: string; name: string; email: string; password: string }[]>`
    SELECT id, name, email, password FROM "User" WHERE LOWER(email) = LOWER(${email.trim()}) LIMIT 1
  `;
  const user = result[0] ?? null;
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const secret = process.env.JWT_SECRET || "secret";
  const token = jwt.sign({ userId: user.id }, secret, { expiresIn: "8h" });

  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// PATCH /api/auth/profile — update name and/or email
router.patch("/profile", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { name, email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  const trimmedEmail = email.trim();
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "User" WHERE LOWER(email) = LOWER(${trimmedEmail}) LIMIT 1
  `;
  if (existing.length > 0 && existing[0].id !== userId) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: trimmedEmail, ...(name !== undefined && { name }) },
    select: { id: true, name: true, email: true },
  });

  return res.json({ user: updated });
});

// PATCH /api/auth/password — change password
router.patch("/password", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new password are required." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found." });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ message: "Current password is incorrect." });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return res.json({ message: "Password updated successfully." });
});

// DELETE /api/auth/account — permanently delete the current user's account
router.delete("/account", authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    await prisma.$transaction(async (tx) => {
      const ownedProjects = await tx.project.findMany({ where: { createdById: userId }, select: { id: true } });
      const ownedProjectIds = ownedProjects.map((p) => p.id);

      const ownedTeams = await tx.team.findMany({ where: { createdById: userId }, select: { id: true } });
      const ownedTeamIds = ownedTeams.map((t) => t.id);

      const teamProjects = ownedTeamIds.length
        ? await tx.project.findMany({ where: { teamId: { in: ownedTeamIds } }, select: { id: true } })
        : [];
      const allOwnedProjectIds = [...new Set([...ownedProjectIds, ...teamProjects.map((p) => p.id)])];

      await tx.task.updateMany({ where: { assignedToId: userId }, data: { assignedToId: null } });
      await tx.commentMention.deleteMany({ where: { userId } });

      const userComments = await tx.comment.findMany({ where: { authorId: userId }, select: { id: true } });
      if (userComments.length) {
        const ids = userComments.map((c) => c.id);
        await tx.attachment.deleteMany({ where: { commentId: { in: ids } } });
        await tx.commentMention.deleteMany({ where: { commentId: { in: ids } } });
        await tx.comment.deleteMany({ where: { id: { in: ids } } });
      }

      if (allOwnedProjectIds.length) {
        const tasks = await tx.task.findMany({ where: { projectId: { in: allOwnedProjectIds } }, select: { id: true } });
        const taskIds = tasks.map((t) => t.id);

        if (taskIds.length) {
          const comments = await tx.comment.findMany({ where: { taskId: { in: taskIds } }, select: { id: true } });
          const commentIds = comments.map((c) => c.id);
          if (commentIds.length) {
            await tx.attachment.deleteMany({ where: { commentId: { in: commentIds } } });
            await tx.commentMention.deleteMany({ where: { commentId: { in: commentIds } } });
            await tx.comment.deleteMany({ where: { id: { in: commentIds } } });
          }
          await tx.task.deleteMany({ where: { id: { in: taskIds } } });
        }

        await tx.projectMembership.deleteMany({ where: { projectId: { in: allOwnedProjectIds } } });
        await tx.project.deleteMany({ where: { id: { in: allOwnedProjectIds } } });
      }

      if (ownedTeamIds.length) {
        await tx.teamMembership.deleteMany({ where: { teamId: { in: ownedTeamIds } } });
        await tx.team.deleteMany({ where: { id: { in: ownedTeamIds } } });
      }

      await tx.teamMembership.deleteMany({ where: { userId } });
      await tx.projectMembership.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Account deletion error:", error);
    return res.status(500).json({ message: "Unable to delete account." });
  }
});

export default router;
