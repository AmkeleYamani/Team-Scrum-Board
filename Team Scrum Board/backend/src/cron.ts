import cron from "node-cron";
import { prisma } from "./prisma";
import { sendOnce } from "./emailHelper";
import { taskDueTodayEmail, taskDueTomorrowEmail } from "./emailTemplates";

export function startCronJobs() {
  // Runs daily at 08:00 server time
  cron.schedule("0 8 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);

    const [dueTodayTasks, dueTomorrowTasks] = await Promise.all([
      prisma.task.findMany({
        where: { dueDate: { gte: today, lt: tomorrow }, status: { not: "DONE" } },
        include: { assignedTo: true, project: true },
      }),
      prisma.task.findMany({
        where: { dueDate: { gte: tomorrow, lt: dayAfter }, status: { not: "DONE" } },
        include: { assignedTo: true, project: true },
      }),
    ]);

    for (const task of dueTodayTasks) {
      if (!task.assignedTo?.email || !task.dueDate) continue;
      const assigneeName = task.assignedTo.name || task.assignedTo.email;
      const { subject, html } = taskDueTodayEmail(task.title, task.project.name, task.dueDate, assigneeName);
      await sendOnce("due_today", task.assignedTo.email, task.id, subject, html);
    }

    for (const task of dueTomorrowTasks) {
      if (!task.assignedTo?.email || !task.dueDate) continue;
      const assigneeName = task.assignedTo.name || task.assignedTo.email;
      const { subject, html } = taskDueTomorrowEmail(task.title, task.project.name, task.dueDate, assigneeName);
      await sendOnce("due_tomorrow", task.assignedTo.email, task.id, subject, html);
    }
  });
}
