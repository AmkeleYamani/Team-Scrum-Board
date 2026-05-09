import { prisma } from "./prisma";
import { sendEmail } from "./email";

export async function sendOnce(type: string, recipientEmail: string, referenceId: string, subject: string, html: string) {
  try {
    await prisma.emailLog.create({ data: { type, recipientEmail, referenceId } });
    await sendEmail(recipientEmail, subject, html);
  } catch {
    // duplicate log entry means already sent — skip
  }
}
