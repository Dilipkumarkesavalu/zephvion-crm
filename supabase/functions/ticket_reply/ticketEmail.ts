/** The email a client gets when the team replies on a ticket. */

export interface TicketEmailInput {
  ticketNumber: string;
  subject: string;
  body: string;
  contactFirstName?: string | null;
  agentName: string;
  sellerName: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildTicketReplyEmail = (input: TicketEmailInput) => {
  // One line, so text from the ticket can never add mail headers
  const subject = `Re: [${input.ticketNumber}] ${input.subject}`
    .replace(/\s+/g, " ")
    .slice(0, 180);
  const greeting = input.contactFirstName?.trim()
    ? `Hi ${input.contactFirstName.trim()},`
    : "Hello,";
  const footer = `Please keep ${input.ticketNumber} in the subject when you reply.`;

  const text = [
    greeting,
    "",
    input.body.trim(),
    "",
    `${input.agentName}`,
    input.sellerName,
    "",
    footer,
  ].join("\n");

  const paragraphs = input.body
    .trim()
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.5">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;border-top:6px solid #0d82e4;padding:32px"><p style="margin:0 0 4px;font-size:12px;color:#52606d">${escapeHtml(input.ticketNumber)} · ${escapeHtml(input.subject)}</p><p style="margin:16px 0 12px;font-size:14px">${escapeHtml(greeting)}</p>${paragraphs}<p style="margin:16px 0 0;font-size:14px">${escapeHtml(input.agentName)}<br><span style="color:#52606d">${escapeHtml(input.sellerName)}</span></p><p style="margin:24px 0 0;font-size:12px;color:#7b8794">${escapeHtml(footer)}</p></div></div>`;

  return { subject, text, html };
};
