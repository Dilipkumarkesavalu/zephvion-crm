/**
 * Shapes portal data from records, for the in-browser demo. The live
 * portal is shaped by the client_portal function (supabase/functions/
 * client_portal/portalModel.ts), which this mirrors.
 */

export type Row = Record<string, unknown>;

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
