export type TaskEmailInput = {
  assigneeFirstName: string;
  assignerName: string;
  taskText: string;
  taskType?: string | null;
  dueDate: string;
  contactName?: string | null;
  link: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Due date in Indian time, e.g. "28 Oct 2026, 5:30 pm". */
export const formatDueDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

const describeTask = ({ taskText, taskType }: TaskEmailInput) =>
  taskType && taskType !== "none" ? `${taskType}: ${taskText}` : taskText;

export const buildTaskEmail = (input: TaskEmailInput) => {
  const task = describeTask(input);
  const due = formatDueDate(input.dueDate);
  const regarding = input.contactName ? ` (re: ${input.contactName})` : "";

  // One line, so task text can never add mail headers
  const subject = `New task from ${input.assignerName}: ${input.taskText}`
    .replace(/\s+/g, " ")
    .slice(0, 150);

  const text = [
    `Hi ${input.assigneeFirstName},`,
    "",
    `${input.assignerName} assigned you a task in Zephvion CRM${regarding}:`,
    "",
    task,
    `Due: ${due}`,
    "",
    `Open it: ${input.link}`,
  ].join("\n");

  const html = `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:10px;border-top:6px solid #0d82e4;padding:32px"><h1 style="margin:0 0 4px;font-size:22px;color:#0d82e4;letter-spacing:1px">ZEPHVION CRM</h1><p style="margin:0 0 24px;font-size:14px;color:#52606d">New task assigned to you</p><p style="margin:0 0 16px;font-size:14px">Hi ${escapeHtml(input.assigneeFirstName)}, <strong>${escapeHtml(input.assignerName)}</strong> assigned you a task${escapeHtml(regarding)}:</p><p style="margin:0 0 8px;font-size:16px;font-weight:bold;background:#eef6fd;border-radius:8px;padding:16px">${escapeHtml(task)}</p><p style="margin:0 0 24px;font-size:14px;color:#52606d">Due ${escapeHtml(due)}</p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#0d82e4;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:8px">Open in Zephvion CRM</a></div></div>`;

  return { subject, text, html };
};
