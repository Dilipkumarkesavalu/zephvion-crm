/**
 * What a client sees through their portal link, and what they may send.
 * Pure, so it is tested in Node. Same shape as PortalData in
 * src/components/zephvion-crm/portal/portalTypes.ts.
 */

export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export const isValidToken = (value: unknown): value is string =>
  typeof value === "string" && TOKEN_PATTERN.test(value);

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

type Row = Record<string, unknown>;

const VISIBLE_INVOICE_STATUSES = ["sent", "paid"];
const VISIBLE_QUOTE_STATUSES = ["sent", "accepted"];

const money = (value: unknown) => Math.round(Number(value || 0) * 100) / 100;

export const shapeInvoices = (invoices: Row[]) =>
  invoices
    .filter((invoice) =>
      invoice.type === "quote"
        ? VISIBLE_QUOTE_STATUSES.includes(String(invoice.status))
        : VISIBLE_INVOICE_STATUSES.includes(String(invoice.status)),
    )
    .map((invoice) => {
      const total = money(invoice.total);
      const paid =
        invoice.status === "paid" ? total : money(invoice.amount_paid);
      return {
        id: Number(invoice.id),
        number: String(invoice.number),
        type: String(invoice.type),
        status: String(invoice.status),
        issue_date: (invoice.issue_date as string) ?? null,
        due_date: (invoice.due_date as string) ?? null,
        total,
        balance:
          invoice.type === "invoice" ? Math.max(0, money(total - paid)) : 0,
        payment_link_url:
          invoice.status === "sent"
            ? ((invoice.payment_link_url as string) ?? null)
            : null,
      };
    });

export const shapeProjects = (projects: Row[], milestones: Row[]) =>
  projects
    .filter((project) => project.status !== "cancelled")
    .map((project) => {
      const own = milestones
        .filter((milestone) => milestone.project_id === project.id)
        .sort((a, b) => Number(a.position) - Number(b.position));
      const done = own.filter(
        (milestone) => milestone.status === "done",
      ).length;
      return {
        id: Number(project.id),
        name: String(project.name),
        status: String(project.status),
        start_date: (project.start_date as string) ?? null,
        due_date: (project.due_date as string) ?? null,
        progress: own.length ? done / own.length : 0,
        milestones: own.map((milestone) => ({
          name: String(milestone.name),
          status: String(milestone.status),
          due_date: (milestone.due_date as string) ?? null,
        })),
      };
    });

/** Tickets with the conversation; internal notes never leave the CRM. */
export const shapeTickets = (
  tickets: Row[],
  comments: Row[],
  staffNames: Map<number, string>,
) =>
  tickets.map((ticket) => ({
    id: Number(ticket.id),
    number: String(ticket.number),
    subject: String(ticket.subject),
    status: String(ticket.status),
    priority: String(ticket.priority),
    created_at: String(ticket.created_at),
    description: (ticket.description as string) ?? "",
    comments: comments
      .filter(
        (comment) => comment.ticket_id === ticket.id && !comment.is_internal,
      )
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((comment) => ({
        id: Number(comment.id),
        body: String(comment.body),
        created_at: String(comment.created_at),
        from_client: Boolean(comment.is_from_client),
        author: comment.is_from_client
          ? null
          : (staffNames.get(Number(comment.sales_id)) ?? null),
      })),
  }));

const clean = (value: unknown, max: number) =>
  typeof value === "string"
    ? value
        // Strip invisible control characters, keeping tabs and line breaks
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
        .trim()
        .slice(0, max)
    : "";

export type PortalRequest =
  | { action: "get" }
  | {
      action: "create_ticket";
      subject: string;
      description: string;
      name: string;
    }
  | { action: "reply"; ticketId: number; body: string };

/** Reads the request body, or says what is wrong with it. */
export const parsePortalRequest = (
  body: Record<string, unknown>,
): PortalRequest | { error: string } => {
  switch (body.action ?? "get") {
    case "get":
      return { action: "get" };
    case "create_ticket": {
      const subject = clean(body.subject, 200);
      const description = clean(body.description, 5000);
      if (!subject) return { error: "Please add a short subject." };
      if (!description) return { error: "Please describe what you need." };
      return {
        action: "create_ticket",
        subject,
        description,
        name: clean(body.name, 120),
      };
    }
    case "reply": {
      const ticketId = Number(body.ticket_id);
      const text = clean(body.body, 5000);
      if (!Number.isInteger(ticketId) || ticketId <= 0)
        return { error: "Unknown request." };
      if (!text) return { error: "Please write a message." };
      return { action: "reply", ticketId, body: text };
    }
    default:
      return { error: "Unknown request." };
  }
};
