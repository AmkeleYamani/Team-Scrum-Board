import cron from "node-cron";
import { prisma } from "./prisma";
import { sendOnce } from "./emailHelper";

export function startCronJobs() {
  cron.schedule("0 8 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);

    const dueTodayTasks = await prisma.task.findMany({
      where: { dueDate: { gte: today, lt: tomorrow }, status: { not: "DONE" } },
      include: { assignedTo: true, project: true },
    });

    const dueTomorrowTasks = await prisma.task.findMany({
      where: { dueDate: { gte: tomorrow, lt: dayAfter }, status: { not: "DONE" } },
      include: { assignedTo: true, project: true },
    });

    for (const task of dueTodayTasks) {
      if (!task.assignedTo?.email) continue;
      await sendOnce(
        "due_today",
        task.assignedTo.email,
        task.id,
        `Task due today: ${task.title}`,
        `<p>Your task <strong>${task.title}</strong> in project <strong>${task.project.name}</strong> is due today.</p>`
      );
    }

    for (const task of dueTomorrowTasks) {
      if (!task.assignedTo?.email) continue;
      await sendOnce(
        "due_tomorrow",
        task.assignedTo.email,
        task.id,
        `Task due tomorrow: ${task.title}`,
        `<p>Your task <strong>${task.title}</strong> in project <strong>${task.project.name}</strong> is due tomorrow.</p>`
      );
    }
  });
}
