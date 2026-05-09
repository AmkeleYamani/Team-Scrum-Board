import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";
import teamRoutes from "./routes/teams";
import dashboardRoutes from "./routes/dashboard";
import noteRoutes from "./routes/notes";
import { authenticateToken } from "./middleware/auth";
import { startCronJobs } from "./cron";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/projects", authenticateToken, projectRoutes);
app.use("/api/tasks", authenticateToken, taskRoutes);
app.use("/api/teams", authenticateToken, teamRoutes);
app.use("/api/dashboard", authenticateToken, dashboardRoutes);
app.use("/api/notes", authenticateToken, noteRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  startCronJobs();
});
