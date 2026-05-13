function wrap(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
  <tr><td style="background:#0f172a;padding:24px 32px;">
    <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Team Scrum Board</p>
  </td></tr>
  <tr><td style="padding:32px 32px 24px;">
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:20px;font-weight:600;line-height:1.3;">${title}</h2>
    ${body}
  </td></tr>
  <tr><td style="border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">This notification was sent by Team Scrum Board. Do not reply to this email.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function field(label: string, value: string): string {
  return `<p style="margin:6px 0;color:#475569;font-size:14px;line-height:1.5;"><span style="font-weight:600;color:#1e293b;">${label}:</span> ${value}</p>`;
}

function divider(): string {
  return `<div style="border-top:1px solid #f1f5f9;margin:16px 0;"></div>`;
}

export function taskAssignedEmail(taskTitle: string, projectName: string, priority: string, dueDate: string | null): { subject: string; html: string } {
  const subject = `Task assigned to you: ${taskTitle}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">You have been assigned a task. Here are the details:</p>
    ${divider()}
    ${field("Task", `<strong>${taskTitle}</strong>`)}
    ${field("Project", projectName)}
    ${field("Priority", priority)}
    ${field("Due Date", dueDate ? new Date(dueDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "No due date set")}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to your Team Scrum Board to view the full task details and get started.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function taskReassignedEmail(taskTitle: string, projectName: string, priority: string, dueDate: string | null): { subject: string; html: string } {
  const subject = `Task reassigned to you: ${taskTitle}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">A task has been reassigned to you:</p>
    ${divider()}
    ${field("Task", `<strong>${taskTitle}</strong>`)}
    ${field("Project", projectName)}
    ${field("Priority", priority)}
    ${field("Due Date", dueDate ? new Date(dueDate).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "No due date set")}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to your Team Scrum Board to view the full task details.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function taskDueTodayEmail(taskTitle: string, projectName: string, dueDate: Date, assigneeName: string): { subject: string; html: string } {
  const subject = `Due today: ${taskTitle}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">A task assigned to you is due <strong style="color:#dc2626;">today</strong>. Please make sure it is completed on time.</p>
    ${divider()}
    ${field("Task", `<strong>${taskTitle}</strong>`)}
    ${field("Project", projectName)}
    ${field("Assigned To", assigneeName)}
    ${field("Due Date", dueDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to mark the task as complete or update its status.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function taskDueTomorrowEmail(taskTitle: string, projectName: string, dueDate: Date, assigneeName: string): { subject: string; html: string } {
  const subject = `Due tomorrow: ${taskTitle}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">A reminder that the following task is due <strong style="color:#d97706;">tomorrow</strong>.</p>
    ${divider()}
    ${field("Task", `<strong>${taskTitle}</strong>`)}
    ${field("Project", projectName)}
    ${field("Assigned To", assigneeName)}
    ${field("Due Date", dueDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }))}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to update the task status or reach out to your team if you need assistance.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function mentionEmail(taskTitle: string, authorName: string, commentContent: string): { subject: string; html: string } {
  const subject = `${authorName} mentioned you in a comment`;
  const trimmed = commentContent.length > 300 ? commentContent.slice(0, 300) + "…" : commentContent;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;"><strong>${authorName}</strong> mentioned you in a comment on the task <strong>${taskTitle}</strong>.</p>
    ${divider()}
    <div style="background:#f8fafc;border-left:3px solid #3b82f6;border-radius:4px;padding:12px 16px;margin:0 0 16px;">
      <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;font-style:italic;">"${trimmed}"</p>
    </div>
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to view the full comment thread and reply.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function teamAddedEmail(teamName: string, addedByName: string): { subject: string; html: string } {
  const subject = `You've been added to the team: ${teamName}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;"><strong>${addedByName}</strong> has added you to a team on Team Scrum Board.</p>
    ${divider()}
    ${field("Team", `<strong>${teamName}</strong>`)}
    ${field("Added By", addedByName)}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to view your team's projects and tasks.</p>`;
  return { subject, html: wrap(subject, body) };
}

export function projectAddedEmail(projectName: string, addedByName: string): { subject: string; html: string } {
  const subject = `You've been added to the project: ${projectName}`;
  const body = `
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;"><strong>${addedByName}</strong> has added you as a collaborator on a project.</p>
    ${divider()}
    ${field("Project", `<strong>${projectName}</strong>`)}
    ${field("Added By", addedByName)}
    ${divider()}
    <p style="margin:0;color:#64748b;font-size:13px;">Log in to view the project, its tasks, and start collaborating.</p>`;
  return { subject, html: wrap(subject, body) };
}
