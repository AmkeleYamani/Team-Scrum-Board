import express from "express";
import { prisma } from "../prisma";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return res.json(notes);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { title = "", content = "" } = req.body;
  const note = await prisma.note.create({
    data: { title, content, userId },
  });
  return res.status(201).json(note);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;
  const { title, content } = req.body;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ message: "Note not found." });
  if (note.userId !== userId) return res.status(403).json({ message: "Access denied." });

  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
  });
  return res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return res.status(404).json({ message: "Note not found." });
  if (note.userId !== userId) return res.status(403).json({ message: "Access denied." });

  await prisma.note.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
