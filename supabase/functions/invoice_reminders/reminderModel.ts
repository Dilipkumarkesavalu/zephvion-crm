/** When to remind, and what the reminder email says. Pure, so it is tested in Node. */

export type ReminderKind =
  | "before_due"
  | "due"
  | "overdue_7"
  | "overdue_14"
  | "overdue_30";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in India, as YYYY-MM-DD. */
export const indianToday = (now: Date = new Date()) =>
  new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);

/**
 * The reminder an unpaid invoice should get today, if any. Each stage is
 * sent once; a missed day still catches up within the stage's window.
 */
export const pickReminder = (
  dueDate: string,
  today: string,
  alreadySent: string[],
): ReminderKind | null => {
  const daysLate = daysBetween(dueDate, today);
  const stage: ReminderKind | null =
    daysLate >= 30
      ? "overdue_30"
      : daysLate >= 14
        ? "overdue_14"
        : daysLate >= 7
          ? "overdue_7"
          : daysLate >= 0
            ? "due"
            : daysLate >= -3
              ? "before_due"
              : null;
  return stage && !alreadySent.includes(stage) ? stage : null;
};

export interface ReminderEmailInput {
  kind: ReminderKind | "manual";
  clientName: string;
  contactFirstName?: string | null;
  invoiceNumber: string;
  dueDate: string;
  balance: number;
  sellerName: string;
  paymentLink?: string | null;
  bank?: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
  } | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const formatRupees = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

export const formatIndianDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const OPENING: Record<ReminderEmailInput["kind"], string> = {
  before_due: "This is a friendly reminder that the invoice below is due soon.",
  due: "The invoice below is due today.",
  overdue_7: "The invoice below is now a week past its due date.",
  overdue_14: "The invoice below is two weeks past its due date.",
  overdue_30:
    "The invoice below is now over 30 days overdue. Please arrange payment or let us know if anything is holding it up.",
  manual: "Here is a reminder about the invoice below.",
};

export const buildReminderEmail = (input: ReminderEmailInput) => {
  const amount = formatRupees(input.balance);
  const due = formatIndianDate(input.dueDate);
  const isLate = input.kind.startsWith("overdue");
  const greeting = `Dear ${input.contactFirstName?.trim() || input.clientName},`;
  const bank =
    input.bank?.accountNumber && input.bank?.ifsc
      ? [
          [input.bank.accountName, input.bank.bankName]
            .filter(Boolean)
            .join(", "),
          `A/c ${input.bank.accountNumber} · IFSC ${input.bank.ifsc}`,
        ].filter(Boolean)
      : [];

  // One line, so names can never add mail headers
  const subject =
    `${isLate ? "Overdue: " : "Payment reminder: "}invoice ${input.invoiceNumber} · ${amount}`
      .replace(/\s+/g, " ")
      .slice(0, 150);

  const text = [
    greeting,
    "",
    OPENING[input.kind],
    "",
    `Invoice: ${input.invoiceNumber}`,
    `Amount due: ${amount}`,
    `Due date: ${due}`,
    ...(input.paymentLink ? ["", `Pay online: ${input.paymentLink}`] : []),
    ...(bank.length ? ["", "Bank transfer:", ...bank] : []),
    "",
    "If you have already paid, please ignore this email or reply with the payment details.",
    "",
    `Thank you,`,
    input.sellerName,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#52606d">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(value)}</td></tr>`;
  const payButton = input.paymentLink
    ? `<a href="${escapeHtml(input.paymentLink)}" style="display:inline-block;margin:8px 0 16px;background:#0d82e4;color:#fff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:8px">Pay ${escapeHtml(amount)} online</a>`
    : "";
  const bankBlock = bank.length
    ? `<p style="margin:0 0 16px;font-size:13px;color:#52606d"><strong>Bank transfer</strong><br>${bank.map(escapeHtml).join("<br>")}</p>`
    : "";

  const html = `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;border-top:6px solid ${isLate ? "#e8590c" : "#0d82e4"};padding:32px"><p style="margin:0 0 16px;font-size:14px">${escapeHtml(greeting)}</p><p style="margin:0 0 16px;font-size:14px">${escapeHtml(OPENING[input.kind])}</p><table style="margin:0 0 16px;font-size:14px;border-collapse:collapse">${row("Invoice", input.invoiceNumber)}${row("Amount due", amount)}${row("Due date", due)}</table>${payButton}${bankBlock}<p style="margin:0 0 16px;font-size:13px;color:#52606d">If you have already paid, please ignore this email or reply with the payment details.</p><p style="margin:0;font-size:14px">Thank you,<br>${escapeHtml(input.sellerName)}</p></div></div>`;

  return { subject, text, html };
};
