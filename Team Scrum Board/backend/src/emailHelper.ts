import { prisma } from "./prisma";
import { sendEmail } from "./email";

export async function sendOnce(
  type: string,
  recipientEmail: string,
  referenceId: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    // Check first so we don't send if already logged
    const existing = await prisma.emailLog.findFirst({ where: { type, recipientEmail, referenceId } });
    if (existing) return;

    const sent = await sendEmail(recipientEmail, subject, html);
    if (!sent) return;

    // Record after successful send so a failed send can be retried
    await prisma.emailLog.create({ data: { type, recipientEmail, referenceId } }).catch(() => {
      // Race condition — another request logged it concurrently, that's fine
    });
  } catch (err) {
    console.error("sendOnce error:", err);
  }
}
